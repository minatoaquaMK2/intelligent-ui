import assert from 'node:assert/strict';
import { test } from 'node:test';
import { staticDemoResponse } from '../src/showcase/static-demo';
import { readSSE } from '../src/lib/sse';
import { compile } from '../src/core/compiler';
import { applyOperations, emptyTree, Runtime } from '../src/core/runtime';
import type { Compilation, Data, StreamEvent } from '../src/core/types';
import { fixtureA, fixtureB, labSource, streamSources } from '../src/showcase/lessons';

const request = (route: string, body?: unknown, signal?: AbortSignal) =>
  new Request(`https://example.github.io${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    signal,
  });

test('Pages transport: full rack/GPU/network streams compile to interactive trees without a server', async () => {
  for (const prompt of ['机架总览', 'GPU 温度监控', '交换机端口']) {
    const response = await staticDemoResponse(request('/api/chat', { prompt, mode: 'demo' }), 0);
    assert.equal(response.status, 200);
    let compilation = {} as Compilation;
    let appData: Data = {};
    let source = '';
    let done = false;
    for await (const text of readSSE(response.body!)) {
      const event = JSON.parse(text) as StreamEvent;
      if (event.type === 'meta') assert.equal(event.modelCalls, 0);
      if (event.type === 'data') appData = event.appData;
      if (event.type === 'patch') {
        source += event.append;
        compilation = { ...compilation, ...event.delta };
      }
      if (event.type === 'done') done = true;
      assert.notEqual(event.type, 'error');
    }
    assert.equal(done, true);
    // SSE serializes null-prototype compiler maps as ordinary JSON objects.
    assert.deepEqual(compilation, JSON.parse(JSON.stringify(compile(source))));
    const output = new Runtime().load(compilation, appData);
    assert.deepEqual(output.diagnostics, []);
    const tree = applyOperations(emptyTree(), output.operations);
    assert.ok(Object.values(tree.nodes).some((node) => typeof node.props.onChange === 'string'));
  }
});

test('Pages transport: config disables real models, compilation works, and live mode is rejected', async () => {
  const config = await (await staticDemoResponse(request('/api/config'))).json();
  assert.equal(config.liveAvailable, false);
  const compiled = await staticDemoResponse(request('/api/compile', { source: labSource }));
  assert.equal(compiled.status, 200);
  assert.deepEqual((await compiled.json()).compilation.diagnostics, []);
  assert.equal(
    (await staticDemoResponse(request('/api/chat', { mode: 'live', prompt: 'test' }))).status,
    400,
  );
  assert.equal(
    (await staticDemoResponse(request('/api/chat', { mode: 'demo', prompt: '' }))).status,
    400,
  );
});

test('Pages transport: stopping an in-flight stream cancels pending output', async () => {
  const controller = new AbortController();
  const response = await staticDemoResponse(
    request('/api/chat', { prompt: '机架总览', mode: 'demo' }, controller.signal),
    10,
  );
  const reader = response.body!.getReader();
  assert.equal((await reader.read()).done, false);
  controller.abort();
  await assert.rejects(reader.read(), { name: 'AbortError' });
});

test('Pages transport: follow-ups retain the selected rack, GPU and threshold through validated context', async () => {
  const response = await staticDemoResponse(
    request('/api/chat', {
      prompt: '继续分析',
      mode: 'demo',
      scenario: 'gpu',
      context: { rack: 'Rack A02', gpuId: 'GPU-A02-01:1', threshold: 88 },
    }),
    0,
  );
  let source = '';
  for await (const text of readSSE(response.body!)) {
    const event = JSON.parse(text) as StreamEvent;
    if (event.type === 'patch') source += event.append;
  }
  const states = compile(source).program.states;
  assert.equal(states.rack, 'Rack A02');
  assert.equal(states.selected, 'GPU-A02-01:1');
  assert.equal(states.threshold, 88);
  const invalid = await staticDemoResponse(
    request('/api/chat', {
      prompt: '继续分析',
      mode: 'demo',
      context: { threshold: 1000 },
    }),
  );
  assert.equal(invalid.status, 400);
});

test('Teaching lab: real state persists across compilation and data updates; action captures explicit state', () => {
  const runtime = new Runtime();
  let tree = applyOperations(emptyTree(), runtime.load(compile(labSource), fixtureA).operations);
  const slider = Object.values(tree.nodes).find((node) => node.type === 'slider')!;
  let result = runtime.event(String(slider.props.onChange), 85);
  assert.equal(result.state.threshold, 85);
  assert.ok(result.operations.every((operation) => operation.op === 'SET'));
  tree = applyOperations(tree, result.operations);
  result = runtime.load(compile(labSource + '\n<caption>recompiled</caption>'), fixtureB);
  assert.equal(result.state.threshold, 85);
  tree = applyOperations(tree, result.operations);
  assert.equal(Object.values(tree.nodes).find((node) => node.type === 'stat')!.props.value, 2);
  const button = Object.values(tree.nodes).find((node) => node.type === 'button')!;
  result = runtime.event(String(button.props.onClick));
  assert.deepEqual(result.action, { type: 'issueNewTurn', text: '分析 2 台温度 ≥ 85°C 的设备' });
});

test('Teaching lab: an incomplete tag keeps earlier content and exposes recovery diagnostics', () => {
  const partial = compile(streamSources[1]);
  assert.ok(partial.diagnostics.some((diagnostic) => diagnostic.recovery));
  const tree = applyOperations(emptyTree(), new Runtime().load(partial, fixtureA).operations);
  assert.ok(Object.values(tree.nodes).some((node) => node.type === 'stat'));
  assert.ok(!Object.values(tree.nodes).some((node) => node.type === 'slider'));
  assert.deepEqual(compile(streamSources[2]).diagnostics, []);
});
