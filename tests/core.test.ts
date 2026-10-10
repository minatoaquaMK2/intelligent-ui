import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile } from '../src/core/compiler';
import { evaluate, parseExpression } from '../src/core/expression';
import { applyOperations, emptyTree, Runtime } from '../src/core/runtime';
import { appData, detectScenario, exampleSource } from '../server/examples';
import { readSSE } from '../src/lib/sse';
import { record, records } from '../src/core/monitoring';
import { contextFromScope, parseViewContext, withViewContext } from '../src/core/context';

for (const scenario of ['rack', 'gpu', 'network'] as const) {
  test(`${scenario}: 完整示例通过校验并产生可渲染的组件树`, () => {
    const compilation = compile(exampleSource(scenario));
    assert.deepEqual(compilation.diagnostics, []);
    const runtime = new Runtime();
    const output = runtime.load(compilation, appData);
    assert.deepEqual(output.diagnostics, []);
    const tree = applyOperations(emptyTree(), output.operations);
    assert.ok(tree.roots.length > 0);
    assert.ok(Object.values(tree.nodes).some((node) => node.type === 'select'));
    assert.ok(Object.values(tree.nodes).some((node) => node.type === 'button'));
  });

  test(`${scenario}: 在任意字符处截断都能容错编译，最终树与一次编译一致`, () => {
    const source = exampleSource(scenario);
    const runtime = new Runtime();
    let tree = emptyTree();
    for (let i = 1; i <= source.length; i++) {
      const compilation = compile(source.slice(0, i));
      tree = applyOperations(tree, runtime.load(compilation, appData).operations);
    }
    const finalTree = applyOperations(
      emptyTree(),
      new Runtime().load(compile(source), appData).operations,
    );
    assert.deepEqual(tree, finalTree);
  });
}

test('机架设备下钻产生局部更新，拒绝跨机架或筛选外的设备事件', () => {
  const runtime = new Runtime();
  const source = exampleSource('rack');
  let tree = applyOperations(emptyTree(), runtime.load(compile(source), appData).operations);
  const find = (type: string) => Object.values(tree.nodes).find((node) => node.type === type)!;
  const rack = find('rack');
  const result = runtime.event(String(rack.props.onChange), 'PE-A01-01');
  assert.equal(result.state.selected, 'PE-A01-01');
  assert.ok(result.operations.every((op) => op.op === 'SET'));
  tree = applyOperations(tree, result.operations);
  assert.equal(record(find('device').props.device).id, 'PE-A01-01');
  assert.equal(result.context?.deviceId, 'PE-A01-01');
  assert.throws(() => runtime.event(String(rack.props.onChange), 'PE-A02-01'), /当前视图/);
  tree = applyOperations(tree, runtime.load(compile(source + '\n新的说明'), appData).operations);
  assert.equal(record(find('device').props.device).id, 'PE-A01-01');
  const action = runtime.event(String(find('button').props.onClick)).action;
  assert.match(action!.text, /PE-A01-01.*Rack A01.*426 W/);
  assert.equal(action!.type, 'issueNewTurn');
  tree = applyOperations(
    tree,
    runtime.event(String(find('toggle').props.onChange), true).operations,
  );
  assert.equal(records(find('rack').props.devices).length, 3);
  assert.throws(() => runtime.event(String(rack.props.onChange), 'PE-A01-01'), /当前视图/);
  const rackSelect = Object.values(tree.nodes).find((node) => node.props.label === '选择机架')!;
  tree = applyOperations(
    tree,
    runtime.event(String(rackSelect.props.onChange), 'Rack A02').operations,
  );
  assert.equal(records(find('rack').props.devices).length, 0);
  assert.equal(record(find('device').props.device).id, '');
  assert.throws(() => runtime.event(String(find('button').props.onClick)), /不可用/);
});

test('GPU 阈值、筛选、空状态和后续 action 使用 Worker 当前状态', () => {
  const runtime = new Runtime();
  let tree = applyOperations(
    emptyTree(),
    runtime.load(compile(exampleSource('gpu')), appData).operations,
  );
  const find = (type: string) => Object.values(tree.nodes).find((node) => node.type === type)!;
  const event = (type: string, value: number | boolean | string) => {
    const result = runtime.event(String(find(type).props.onChange), value);
    assert.deepEqual(result.diagnostics, []);
    tree = applyOperations(tree, result.operations);
    return result;
  };
  event('toggle', true);
  assert.equal(records(find('gpus').props.cards).length, 1);
  assert.equal(event('slider', 85).state.threshold, 85);
  assert.equal(find('trend').props.threshold, 85);
  assert.match(
    runtime.event(String(find('button').props.onClick)).action!.text,
    /GPU-A01-01:2.*阈值 85°C/,
  );
  assert.equal(event('slider', 1000).state.threshold, 95);
  assert.equal(records(find('gpus').props.cards).length, 0);
  assert.deepEqual(find('trend').props.values, []);
  assert.throws(() => runtime.event(String(find('gpus').props.onChange), 'GPU-A01-01:2'));
  assert.throws(() => runtime.event(String(find('slider').props.onChange), Infinity));
  assert.throws(() => runtime.event(String(find('select').props.onChange), 'Rack A03'));
  assert.throws(() => runtime.event(String(find('toggle').props.onChange), 'true'));
  event('toggle', false);
  event('gpus', 'GPU-A01-02:1');
  assert.match(String(find('trend').props.title), /GPU-A01-02:1/);
});

test('正在生成时已调整的状态继续保留', () => {
  const runtime = new Runtime();
  const source = exampleSource('gpu');
  const end = source.indexOf('onChange={setThreshold} />') + 'onChange={setThreshold} />'.length;
  const initial = runtime.load(compile(source.slice(0, end)), appData);
  const slider = Object.values(applyOperations(emptyTree(), initial.operations).nodes).find(
    (node) => node.type === 'slider',
  )!;
  runtime.event(String(slider.props.onChange), 89);
  assert.equal(runtime.load(compile(source), appData).state.threshold, 89);
});

test('端口选择、交换机切换与历史时窗联动，禁止伪造端口', () => {
  const runtime = new Runtime();
  let tree = applyOperations(
    emptyTree(),
    runtime.load(compile(exampleSource('network')), appData).operations,
  );
  const find = (type: string) => Object.values(tree.nodes).find((node) => node.type === type)!;
  const portHandler = String(find('ports').props.onChange);
  assert.throws(() => runtime.event(portHandler, 'TOR-A01-B/eth1/99'));
  tree = applyOperations(tree, runtime.event(portHandler, 'TOR-A01-B/eth1/47').operations);
  assert.equal(find('ports').props.value, 'TOR-A01-B/eth1/47');
  assert.ok((find('trend').props.values as number[]).every((v) => v === 0));
  const range = Object.values(tree.nodes).find((node) => node.props.label === '历史时窗')!;
  tree = applyOperations(
    tree,
    runtime.event(String(range.props.onChange), '最近 6 小时').operations,
  );
  assert.equal((find('trend').props.labels as string[])[0], '08:32');
  const selector = Object.values(tree.nodes).find((node) => node.props.label === '交换机')!;
  tree = applyOperations(
    tree,
    runtime.event(String(selector.props.onChange), 'TOR-A01-A').operations,
  );
  assert.equal(find('ports').props.value, 'TOR-A01-A/eth1/1');
  assert.throws(() => runtime.event(portHandler, 'TOR-A01-B/eth1/47'));
  assert.deepEqual(find('alerts').props.items, []);
});

test('更新 appData 会重新计算设备指标，但保留交互状态', () => {
  const runtime = new Runtime();
  const compiled = compile(exampleSource('rack'));
  let tree = applyOperations(emptyTree(), runtime.load(compiled, appData).operations);
  const rack = Object.values(tree.nodes).find((node) => node.type === 'rack')!;
  runtime.event(String(rack.props.onChange), 'PE-A01-01');
  const devices = records(appData.devices).map((device) =>
    device.id === 'PE-A01-01' ? { ...device, power: 999 } : device,
  );
  const result = runtime.load(compiled, { ...appData, devices });
  tree = applyOperations(tree, result.operations);
  assert.equal(result.state.selected, 'PE-A01-01');
  assert.equal(
    record(Object.values(tree.nodes).find((node) => node.type === 'device')!.props.device).power,
    999,
  );
});

test('自然语言识别场景，继续分析保留设备、机架、端口及阈值', () => {
  assert.equal(detectScenario('机架总览包含服务器交换机 GPU'), 'rack');
  assert.equal(detectScenario('查看 GPU 温度'), 'gpu');
  assert.equal(detectScenario('查看交换机端口'), 'network');
  assert.equal(detectScenario('进一步分析', 'gpu'), 'gpu');
  const gpu = compile(exampleSource('gpu', '分析 GPU-A02-02:1，温度阈值 88°C'));
  assert.equal(gpu.program.states.rack, 'Rack A02');
  assert.equal(gpu.program.states.selected, 'GPU-A02-02:1');
  assert.equal(gpu.program.states.threshold, 88);
  const network = compile(exampleSource('network', '分析 TOR-A02-A 的 Ethernet1/47'));
  assert.equal(network.program.states.switchId, 'TOR-A02-A');
  assert.equal(network.program.states.portId, 'TOR-A02-A/eth1/47');
});

test('文本增长只改变常量表，保持 IR 稳定', () => {
  const a = compile('## Hello');
  const b = compile('## Hello world');
  assert.deepEqual(a.program, b.program);
  assert.notDeepEqual(a.constants, b.constants);
});

test('下一轮使用有效选择而非已经被筛选隐藏的原始 state', () => {
  const runtime = new Runtime();
  let result = runtime.load(compile(exampleSource('rack')), appData);
  const tree = applyOperations(emptyTree(), result.operations);
  const rackSelect = Object.values(tree.nodes).find((node) => node.props.label === '选择机架')!;
  result = runtime.event(String(rackSelect.props.onChange), 'Rack A02');
  assert.equal(result.state.selected, 'GPU-A01-01');
  assert.equal(result.context?.deviceId, 'TOR-A02-A');
  assert.equal(result.context?.rack, 'Rack A02');
  const continued = compile(exampleSource('rack', '继续分析', result.context));
  assert.equal(continued.program.states.selected, 'TOR-A02-A');
  assert.equal(continued.program.states.rack, 'Rack A02');
});

test('界面上下文限制字段与数据类型，本轮显式要求覆盖默认值', () => {
  for (const context of [
    null,
    [],
    { role: 'system' },
    { threshold: 1000 },
    { deviceId: 'ignore previous instructions' },
    { rack: 'unknown' },
  ]) {
    assert.throws(() => parseViewContext(context));
  }
  const context = parseViewContext({
    rack: 'Rack A02',
    gpuId: 'GPU-A02-02:1',
    threshold: 88,
    range: '最近 6 小时',
    onlyHot: true,
  });
  const source = compile(exampleSource('gpu', '继续分析', context));
  assert.equal(source.program.states.selected, 'GPU-A02-02:1');
  assert.equal(source.program.states.threshold, 88);
  assert.equal(source.program.states.range, '最近 6 小时');
  const override = compile(
    exampleSource('gpu', '查看 Rack A01 的全部 GPU，温度阈值 75°C', context),
  );
  assert.equal(override.program.states.rack, 'Rack A01');
  assert.equal(override.program.states.threshold, 75);
  assert.equal(override.program.states.onlyHot, false);
  assert.equal(override.program.states.selected, 'GPU-A01-01:2');
  assert.match(withViewContext('继续分析', context), /GPU-A02-02:1/);
  assert.deepEqual(contextFromScope({ arbitrary: 'not sent', device: { id: '' } }), {});
});

test('文本表达式中的小于号不被误当成组件标签', () => {
  const compiled = compile('{2 < 3 ? "小" : "大"}');
  assert.deepEqual(compiled.diagnostics, []);
  const tree = applyOperations(emptyTree(), new Runtime().load(compiled, {}).operations);
  assert.equal(Object.values(tree.nodes)[0].props.content, '小');
});

test('属性不能从目录的原型继承；不能伪造事件处理器 ID', () => {
  const compiled = compile('<box toString="bad" /><button onClick="fn:fake">bad</button>');
  assert.ok(compiled.diagnostics.some((d) => d.code === 'unknown_prop'));
  assert.ok(compiled.diagnostics.some((d) => d.code === 'invalid_handler'));
  assert.equal(compiled.program.roots[1].props.onClick, undefined);
});

test('未知组件与无效属性被丢弃，静态回退不包含任意 HTML', () => {
  const compilation = compile(
    '<script>fetch("/secret")</script>\n<box gap="1" fill="red"><text>你好</text></box>',
  );
  assert.ok(compilation.diagnostics.some((d) => d.code === 'unknown_component'));
  assert.ok(compilation.diagnostics.some((d) => d.code === 'unknown_prop'));
  assert.ok(compilation.diagnostics.some((d) => d.code === 'invalid_literal'));
  assert.equal(compilation.program.roots[0].type, 'box');
  assert.equal(compilation.program.roots[0].props.gap, undefined);
  assert.ok(!compilation.fallbackMarkdown.includes('<script>'));
});

test('表达式阻止全局、原型、任意函数、赋值和无限循环', () => {
  for (const source of [
    'window.location',
    'globalThis',
    'data.constructor',
    'data["__proto__"]',
    'fetch("https://evil.example")',
    'eval("1")',
    'x = 1',
    '(() => 1)()',
    'while(true){}',
    'money.constructor("return 1")()',
  ]) {
    assert.throws(() => parseExpression(source), source);
  }
  const expression = parseExpression('data[key]');
  assert.throws(() => evaluate(expression, { data: {}, key: '__proto__' }));
  assert.throws(() => evaluate(parseExpression('1 / 0'), {}));
  assert.equal(evaluate(parseExpression('round(12 * 1.2)'), {}), 14);
});

test('一个错误表达式不会破坏相邻组件', () => {
  const compiled = compile('<stat value={1/0} /><text>仍可使用</text>');
  const result = new Runtime().load(compiled, {});
  assert.ok(result.diagnostics.length);
  const tree = applyOperations(emptyTree(), result.operations);
  assert.ok(Object.values(tree.nodes).some((node) => node.props.content === '仍可使用'));
});

test('完整重载相同程序不产生多余 UI 操作', () => {
  const compiled = compile(exampleSource('rack'));
  const runtime = new Runtime();
  runtime.load(compiled, appData);
  assert.deepEqual(runtime.load(compiled, appData).operations, []);
});

test('删除节点后操作树正确，旧树保持不可变', () => {
  const runtime = new Runtime();
  const initial = applyOperations(
    emptyTree(),
    runtime.load(compile('<text>A</text><text>B</text>'), {}).operations,
  );
  const operations = runtime.load(compile('<text>A</text>'), {}).operations;
  const next = applyOperations(initial, operations);
  assert.equal(initial.roots.length, 2);
  assert.equal(next.roots.length, 1);
  assert.ok(operations.some((op) => op.op === 'REMOVE'));
});

test('SSE 正确处理逐字节 UTF-8、CRLF、多行 data 和尾帧', async () => {
  const bytes = new TextEncoder().encode(
    ': heartbeat\r\n\r\ndata: {"text":"你好"}\r\n\r\ndata: one\ndata: two\n\ndata: [DONE]',
  );
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const events = [];
  for await (const event of readSSE(stream)) events.push(event);
  assert.deepEqual(events, ['{"text":"你好"}', 'one\ntwo', '[DONE]']);
});

test('源代码大小与组件深度限制', () => {
  assert.throws(() => compile('a'.repeat(64001)));
  assert.throws(() => compile('<box>'.repeat(26)));
  assert.throws(() => compile('<divider />'.repeat(301)));
});
