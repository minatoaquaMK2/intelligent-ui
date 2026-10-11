import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile } from '../src/core/compiler';
import { Runtime, applyOperations, emptyTree } from '../src/core/runtime';
import type { RenderTree, RuntimeResult } from '../src/core/types';
import { classifyCompilation, getBoundarySource, getExperiment } from '../src/showcase/experiments';
import { getLessons } from '../src/showcase/lessons';

const find = (tree: RenderTree, type: string, label?: string) => {
  const node = Object.values(tree.nodes).find(
    (node) => node.type === type && (!label || node.props.label === label),
  );
  assert.ok(node, `Expected ${type} ${label ?? ''}`);
  return node;
};
const setup = (
  lesson: Parameters<typeof getExperiment>[1],
  scenario?: Parameters<typeof getExperiment>[2],
) => {
  const experiment = getExperiment('en', lesson, scenario);
  const compilation = compile(experiment.source);
  const runtime = new Runtime();
  const result = runtime.load(compilation, experiment.snapshots[0]);
  return {
    experiment,
    compilation,
    runtime,
    result,
    tree: applyOperations(emptyTree(), result.operations),
  };
};

test('Teaching experiments: seven distinct programs compile and render business controls in both languages', () => {
  for (const lang of ['zh', 'en'] as const) {
    const sources = new Set<string>();
    for (const lesson of getLessons(lang)) {
      const recipe = getExperiment(lang, lesson.id);
      sources.add(recipe.source);
      const compilation = compile(recipe.source);
      assert.deepEqual(compilation.diagnostics, [], `${lang}/${lesson.id}`);
      const result = new Runtime().load(compilation, recipe.snapshots[0]);
      assert.deepEqual(result.diagnostics, [], `${lang}/${lesson.id}`);
      const tree = applyOperations(emptyTree(), result.operations);
      assert.ok(
        Object.values(tree.nodes).some((node) => ['rack', 'gpus', 'ports'].includes(node.type)),
        lesson.id,
      );
    }
    assert.equal(sources.size, 7);
  }
});

test('Rack pipeline: the registered rack event selects a device and updates its bound power', () => {
  const { runtime, tree } = setup('pipeline');
  const result = runtime.event(String(find(tree, 'rack').props.onChange), 'PE-A01-01');
  assert.equal(result.state.selected, 'PE-A01-01');
  assert.equal(result.context?.deviceId, 'PE-A01-01');
  const updated = applyOperations(tree, result.operations);
  assert.equal(find(updated, 'stat', 'Device power').props.value, 420);
  assert.ok(result.operations.every((op) => op.op === 'SET'));
});

test('GPU local state: selecting and filtering cards needs only SET ops and survives recompilation', () => {
  const { experiment, runtime, tree } = setup('state');
  let result = runtime.event(String(find(tree, 'gpus').props.onChange), 'GPU-A01-01:3');
  let updated = applyOperations(tree, result.operations);
  result = runtime.event(String(find(updated, 'toggle').props.onChange), true);
  updated = applyOperations(updated, result.operations);
  assert.equal(result.state.onlyHot, true);
  assert.equal(result.state.selected, 'GPU-A01-01:3');
  assert.equal((find(updated, 'gpus').props.cards as unknown[]).length, 2);
  assert.ok(result.operations.every((op) => op.op === 'SET'));
  result = runtime.load(
    compile(`${experiment.source}\n<caption>recompiled</caption>`),
    experiment.snapshots[0],
  );
  assert.equal(result.state.onlyHot, true);
  assert.equal(result.context?.gpuId, 'GPU-A01-01:3');
});

test('Streaming network layout: constants, recoverable tag, structural patch and retained rack state', () => {
  const recipe = getExperiment('en', 'streaming');
  const phases = recipe.stream!.phases.map(compile);
  assert.equal(classifyCompilation(phases[0], phases[1]), 'constants');
  assert.equal(classifyCompilation(phases[1], phases[2]), 'source');
  assert.ok(phases[2].diagnostics.some((item) => item.recovery));
  assert.equal(classifyCompilation(phases[2], phases[3]), 'program');
  assert.deepEqual(phases[3].diagnostics, []);
  const runtime = new Runtime();
  let result = runtime.load(phases[0], recipe.snapshots[0]);
  let tree = applyOperations(emptyTree(), result.operations);
  result = runtime.event(String(find(tree, 'select').props.onChange), 'Rack A02');
  tree = applyOperations(tree, result.operations);
  for (const phase of phases.slice(1)) {
    result = runtime.load(phase, recipe.snapshots[0]);
    assert.equal(result.state.rack, 'Rack A02');
    assert.deepEqual(result.diagnostics, []);
    tree = applyOperations(tree, result.operations);
  }
  assert.equal(find(tree, 'ports').props.value, 'TOR-A02-A/eth1/1');
  assert.ok(phases[2].fallbackMarkdown.includes('Checking rack uplinks'));
});

test('Network data: identical compilation uses new telemetry without losing the selected port', () => {
  const { experiment, compilation, runtime, tree } = setup('data');
  const result = runtime.event(String(find(tree, 'ports').props.onChange), 'TOR-A01-A/eth1/8');
  const updated = applyOperations(tree, result.operations);
  const next = runtime.load(compilation, experiment.snapshots[1]);
  assert.equal(next.state.portId, 'TOR-A01-A/eth1/8');
  assert.deepEqual(next.diagnostics, []);
  const newTree = applyOperations(updated, next.operations);
  assert.equal(find(newTree, 'stat', 'CRC errors').props.value, 128);
  assert.equal(find(newTree, 'stat', 'Links down').props.value, 1);
  assert.ok(next.operations.every((op) => op.op === 'SET'));
});

test('Business boundary: prohibited device command and global access are diagnosed while the rack remains usable', () => {
  const recipe = getExperiment('en', 'boundary');
  for (const variant of [1, 2]) {
    const compilation = compile(getBoundarySource(recipe.source, variant));
    assert.ok(compilation.diagnostics.length > 0);
    const output = new Runtime().load(compilation, recipe.snapshots[0]);
    assert.deepEqual(output.diagnostics, []);
    const tree = applyOperations(emptyTree(), output.operations);
    assert.ok(find(tree, 'rack').props.onChange);
    assert.ok(!Object.values(tree.nodes).some((node) => node.type === 'remoteShell'));
  }
});

test('Next-turn action: rack, switch and port selection become explicit text and validated context', () => {
  const { runtime, tree } = setup('action');
  let updated = tree;
  let result: RuntimeResult;
  for (const [label, value] of [
    ['Rack', 'Rack A02'],
    ['Switch', 'TOR-A02-B'],
  ]) {
    result = runtime.event(String(find(updated, 'select', label).props.onChange), value);
    assert.equal(result.action, undefined);
    updated = applyOperations(updated, result.operations);
  }
  result = runtime.event(String(find(updated, 'ports').props.onChange), 'TOR-A02-B/eth1/4');
  updated = applyOperations(updated, result.operations);
  result = runtime.event(String(find(updated, 'button').props.onClick));
  assert.equal(result.action?.type, 'issueNewTurn');
  assert.match(result.action!.text, /Rack A02 \/ TOR-A02-B \/ Ethernet1\/4/);
  assert.deepEqual(result.context, {
    rack: 'Rack A02',
    deviceId: 'TOR-A02-B',
    portId: 'TOR-A02-B/eth1/4',
  });
  assert.deepEqual(result.operations, []);
});

test('Evidence checks use three independently runnable business scenarios', () => {
  for (const [scenario, widget, selected] of [
    ['rack', 'rack', 'PE-A01-01'],
    ['gpu', 'gpus', 'GPU-A01-01:2'],
    ['network', 'ports', 'TOR-A01-A/eth1/3'],
  ] as const) {
    const { experiment, runtime, tree } = setup('evidence', scenario);
    const result = runtime.event(String(find(tree, widget).props.onChange), selected);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.context?.[experiment.contextKey!], selected);
    assert.ok(result.operations.length > 0);
  }
});
