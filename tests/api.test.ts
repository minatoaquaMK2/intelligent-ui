import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app';
import { modelStream } from '../server/provider';
import { readSSE } from '../src/lib/sse';
import type { Compilation, StreamEvent } from '../src/core/types';
import { Runtime } from '../src/core/runtime';

let server: Server;
let url: string;
before(async () => {
  server = createServer(createApp({}, { demoDelayMs: 0 }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
const post = (path: string, body: unknown) =>
  fetch(url + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('默认配置不暴露凭据，真实模型不可用时明确报错', async () => {
  const config = await (await fetch(url + '/api/config')).json();
  assert.equal(config.liveAvailable, false);
  assert.equal(config.apiKey, undefined);
  const response = await post('/api/chat', { prompt: '你好', mode: 'live' });
  assert.equal(response.status, 503);
});

test('无效请求、无效历史与跨站请求被拒绝', async () => {
  for (const body of [
    {},
    { prompt: ' ', mode: 'demo' },
    { prompt: 'hi', mode: 'other' },
    { prompt: 'hi', mode: 'demo', history: [{ role: 'system', content: 'bad' }] },
    { prompt: 'hi', mode: 'demo', context: { systemPrompt: 'bad' } },
    { prompt: 'hi', mode: 'demo', context: { threshold: 'NaN' } },
  ]) {
    assert.equal((await post('/api/chat', body)).status, 400);
  }
  const response = await fetch(url + '/api/config', {
    headers: { Origin: 'https://other.example' },
  });
  assert.equal(response.status, 403);
});

test('SSE 编译链路：部分更新能合并成完整可执行程序', async () => {
  const response = await post('/api/chat', {
    mode: 'demo',
    prompt: '监控 Rack A02 的 GPU，温度阈值 85°C',
  });
  assert.match(response.headers.get('content-type')!, /text\/event-stream/);
  let compilation: Partial<Compilation> = {},
    data = {},
    source = '',
    done = false;
  const updateTypes = new Set<string>();
  for await (const payload of readSSE(response.body!)) {
    const event = JSON.parse(payload) as StreamEvent;
    assert.notEqual(event.type, 'error');
    if (event.type === 'meta') assert.equal(event.modelCalls, 0);
    if (event.type === 'patch') {
      compilation = { ...compilation, ...event.delta };
      source += event.append;
      updateTypes.add(event.update);
    }
    if (event.type === 'data') data = event.appData;
    if (event.type === 'done') done = true;
  }
  assert.equal(done, true);
  assert.ok(source.includes('{@state threshold = 85}'));
  assert.deepEqual(compilation.diagnostics, []);
  assert.ok(updateTypes.has('program'));
  assert.ok(updateTypes.has('source'));
  const output = new Runtime().load(compilation as Compilation, data);
  assert.equal(output.state.threshold, 85);
  assert.equal(output.state.rack, 'Rack A02');
  assert.deepEqual(output.diagnostics, []);
});

test('编辑端点返回诊断及 appData，超长源码被拒绝', async () => {
  const response = await post('/api/compile', { source: '<text invalid="x">你好</text>' });
  const data = await response.json();
  assert.ok(data.compilation.diagnostics.some((d: { code: string }) => d.code === 'unknown_prop'));
  assert.ok(data.appData.devices);
  assert.equal((await post('/api/compile', { source: 'x'.repeat(64001) })).status, 400);
});

test('手动继续对话也保留结构化监控上下文', async () => {
  const response = await post('/api/chat', {
    mode: 'demo',
    prompt: '继续分析',
    scenario: 'network',
    context: {
      rack: 'Rack A02',
      deviceId: 'TOR-A02-A',
      portId: 'TOR-A02-A/eth1/47',
      range: '最近 6 小时',
    },
  });
  assert.equal(response.status, 200);
  let compilation: Partial<Compilation> = {};
  for await (const payload of readSSE(response.body!)) {
    const event = JSON.parse(payload) as StreamEvent;
    assert.notEqual(event.type, 'error');
    if (event.type === 'patch') compilation = { ...compilation, ...event.delta };
  }
  assert.equal(compilation.program!.states.switchId, 'TOR-A02-A');
  assert.equal(compilation.program!.states.portId, 'TOR-A02-A/eth1/47');
  assert.equal(compilation.program!.states.range, '最近 6 小时');
});

const providerConfig = {
  baseUrl: 'https://provider.example/v1',
  apiKey: 'test-secret',
  model: 'configured-model',
};
test('真实模型适配器发送正确请求并解析增量内容（模拟上游）', async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, 'https://provider.example/v1/chat/completions');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-secret');
    const body = JSON.parse(init!.body as string);
    assert.equal(body.model, 'configured-model');
    assert.equal(body.stream, true);
    assert.equal(body.messages[0].role, 'system');
    return new Response(
      'data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: {"choices":[{"delta":{"content":"界面"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    );
  };
  let source = '';
  for await (const chunk of modelStream(
    providerConfig,
    [{ role: 'user', content: 'hi' }],
    new AbortController().signal,
    fetcher,
  ))
    source += chunk;
  assert.equal(source, '你好界面');
});

test('上游错误不泄露正文或密钥；截断流不能被当作成功', async () => {
  const drain = async (response: Response) => {
    for await (const _ of modelStream(
      providerConfig,
      [],
      new AbortController().signal,
      async () => response,
    )) {
      /* consume */
    }
  };
  await assert.rejects(
    () => drain(new Response('test-secret', { status: 401 })),
    (error) =>
      error instanceof Error &&
      !error.message.includes('test-secret') &&
      error.message.includes('401'),
  );
  await assert.rejects(
    () => drain(new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')),
    /中断/,
  );
  await assert.rejects(
    () => drain(new Response('data: {"choices":[{"finish_reason":"length"}]}\n\ndata: [DONE]\n\n')),
    /未完整/,
  );
});
