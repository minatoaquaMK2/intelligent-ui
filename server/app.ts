import express, { type ErrorRequestHandler } from 'express';
import { compile } from '../src/core/compiler';
import { parseViewContext, withViewContext } from '../src/core/context';
import type { Compilation, StreamEvent } from '../src/core/types';
import { appData, detectScenario, type Scenario } from './examples';
import {
  demoStream,
  isConfigured,
  modelStream,
  type HistoryMessage,
  type ProviderConfig,
} from './provider';

export function createApp(config: ProviderConfig = {}, options: { demoDelayMs?: number } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    if (!localHosts.has(req.hostname)) {
      res.status(403).json({ error: '此 POC API 仅支持本机访问' });
      return;
    }
    if (
      req.get('origin') &&
      req.get('origin') !== `http://${req.get('host')}` &&
      req.get('origin') !== `https://${req.get('host')}`
    ) {
      res.status(403).json({ error: '不允许跨站 API 请求' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '256kb' }));
  app.get('/api/config', (_req, res) =>
    res.json({
      liveAvailable: isConfigured(config),
      model: isConfigured(config) ? config.model : null,
      catalogVersion: 'dil-poc/1',
    }),
  );

  app.post('/api/compile', (req, res) => {
    if (typeof req.body?.source !== 'string' || req.body.source.length > 64000) {
      res.status(400).json({ error: '请输入不超过 64,000 字符的 DSL' });
      return;
    }
    try {
      res.json({ compilation: compile(req.body.source), appData });
    } catch (error) {
      res.status(422).json({ error: (error as Error).message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const body = req.body;
    if (
      !body ||
      typeof body.prompt !== 'string' ||
      !body.prompt.trim() ||
      body.prompt.length > 4000 ||
      !['demo', 'live'].includes(body.mode)
    ) {
      res.status(400).json({ error: '请输入 1–4,000 字符的描述，并选择有效模式' });
      return;
    }
    const history = body.history ?? [];
    let context;
    try {
      context = parseViewContext(body.context);
    } catch {
      res.status(400).json({ error: '无效的界面上下文' });
      return;
    }
    if (
      !Array.isArray(history) ||
      history.length > 12 ||
      history.some(
        (item) =>
          !item ||
          !['user', 'assistant'].includes(item.role) ||
          typeof item.content !== 'string' ||
          item.content.length > 64000,
      )
    ) {
      res.status(400).json({ error: '无效的对话历史' });
      return;
    }
    if (body.mode === 'live' && !isConfigured(config)) {
      res.status(503).json({ error: '真实模型尚未配置。请填写 .env 并重启服务，或使用演示模式。' });
      return;
    }
    const previous = ['rack', 'gpu', 'network'].includes(body.scenario)
      ? (body.scenario as Scenario)
      : undefined;
    const scenario = detectScenario(body.prompt, previous);
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)]);
    res.on('close', () => controller.abort());
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const send = (event: StreamEvent) => {
      if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const started = performance.now();
    send({
      type: 'meta',
      mode: body.mode,
      scenario,
      model: body.mode === 'live' ? config.model! : 'Deterministic demo',
      modelCalls: body.mode === 'live' ? 1 : 0,
    });
    // Reference data travel independently of the model-authored source.
    send({ type: 'data', appData });
    let source = '',
      sequence = 0;
    let previousCompilation: Compilation | undefined;
    try {
      const stream =
        body.mode === 'live'
          ? modelStream(
              config,
              [
                ...(history as HistoryMessage[]),
                { role: 'user', content: withViewContext(body.prompt.trim(), context) },
              ],
              signal,
            )
          : demoStream(scenario, body.prompt, signal, options.demoDelayMs, context);
      for await (const chunk of stream) {
        signal.throwIfAborted();
        source += chunk;
        if (source.length > 64000) throw new Error('生成的 DSL 超过长度限制，已停止');
        const normalized = source.replace(/^```(?:dil|jsx|xml)?\s*\n/, '').replace(/\n```\s*$/, '');
        const compilation = compile(normalized);
        const programChanged =
          JSON.stringify(compilation.program) !== JSON.stringify(previousCompilation?.program);
        const constantsChanged =
          JSON.stringify(compilation.constants) !== JSON.stringify(previousCompilation?.constants);
        send({
          type: 'patch',
          append: chunk,
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
      }
      if (!source.trim() || !previousCompilation?.program.roots.length)
        throw new Error('模型未生成可展示内容，请换个描述重试');
      send({ type: 'done', duration: performance.now() - started });
    } catch (error) {
      if (!res.destroyed)
        send({
          type: 'error',
          message: signal.aborted ? '生成已超时或取消，请重试' : (error as Error).message,
        });
    } finally {
      res.end();
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API 不存在' }));
  const handleError: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(400).json({ error: '请求体无效或超过大小限制' });
  };
  app.use(handleError);
  return app;
}
