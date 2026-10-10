import { compile } from '../core/compiler';
import { parseViewContext } from '../core/context';
import type { Compilation, StreamEvent } from '../core/types';
import { appData, detectScenario, exampleSource, type Scenario } from '../../server/examples';

const json = (data: unknown, status = 200) => Response.json(data, { status });

/** Browser-only, deterministic demo API. No model credentials or server modules. */
export async function staticDemoResponse(request: Request, interval = 28): Promise<Response> {
  request.signal.throwIfAborted();
  const path = new URL(request.url).pathname;
  if (path === '/api/config' && request.method === 'GET')
    return json({ liveAvailable: false, model: null, catalogVersion: 'dil-poc/1' });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return json({ error: '请求体无效' }, 400);
  }
  if (path === '/api/compile' && request.method === 'POST') {
    if (typeof body.source !== 'string' || body.source.length > 64000)
      return json({ error: '请输入不超过 64,000 字符的 DSL' }, 400);
    try {
      return json({ compilation: compile(body.source), appData });
    } catch (error) {
      return json({ error: (error as Error).message }, 422);
    }
  }
  if (path !== '/api/chat' || request.method !== 'POST') return json({ error: 'API 不存在' }, 404);
  if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000)
    return json({ error: '请输入 1–4,000 字符的描述' }, 400);
  if (body.mode !== 'demo')
    return json({ error: '在线试用仅提供模板演示；真实模型请在本地配置。' }, 400);

  let context;
  try {
    context = parseViewContext(body.context);
  } catch {
    return json({ error: '无效的界面上下文' }, 400);
  }

  const previous = ['rack', 'gpu', 'network'].includes(String(body.scenario))
    ? (body.scenario as Scenario)
    : undefined;
  const scenario = detectScenario(body.prompt, previous);
  const characters = Array.from(exampleSource(scenario, body.prompt, context));
  const encoder = new TextEncoder();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let source = '';
      let sequence = 0;
      let cursor = 0;
      let previousCompilation: Compilation | undefined;
      const started = performance.now();
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const abort = () => {
        if (stopped) return;
        stopped = true;
        cleanup();
        controller.error(new DOMException('已停止演示', 'AbortError'));
      };
      cleanup = () => {
        clearTimeout(timeout);
        request.signal.removeEventListener('abort', abort);
      };
      request.signal.addEventListener('abort', abort, { once: true });
      if (request.signal.aborted) {
        abort();
        return;
      }
      send({
        type: 'meta',
        mode: 'demo',
        scenario,
        model: 'Browser demo · 模拟遥测',
        modelCalls: 0,
      });
      send({ type: 'data', appData });
      const tick = () => {
        if (stopped) return;
        try {
          const append = characters.slice(cursor, cursor + 64).join('');
          cursor += 64;
          source += append;
          const compilation = compile(source);
          const programChanged =
            JSON.stringify(compilation.program) !== JSON.stringify(previousCompilation?.program);
          const constantsChanged =
            JSON.stringify(compilation.constants) !==
            JSON.stringify(previousCompilation?.constants);
          send({
            type: 'patch',
            append,
            sequence: ++sequence,
            update: programChanged ? 'program' : constantsChanged ? 'constants' : 'source',
            delta: {
              ...(programChanged ? { program: compilation.program } : {}),
              ...(constantsChanged ? { constants: compilation.constants } : {}),
              diagnostics: compilation.diagnostics,
              fallbackMarkdown: compilation.fallbackMarkdown,
            },
          });
          previousCompilation = compilation;
          if (cursor < characters.length) timeout = setTimeout(tick, interval);
          else {
            send({ type: 'done', duration: performance.now() - started });
            stopped = true;
            cleanup();
            controller.close();
          }
        } catch (error) {
          send({ type: 'error', message: (error as Error).message });
          stopped = true;
          cleanup();
          controller.close();
        }
      };
      timeout = setTimeout(tick, interval);
    },
    cancel() {
      stopped = true;
      cleanup();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}

export function installStaticDemo() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(new URL(String(input), window.location.href), init);
    const url = new URL(request.url);
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/'))
      return staticDemoResponse(request);
    return originalFetch(input, init);
  };
}
