import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile } from '../src/core/compiler';
import { en } from '../src/i18n/locales/en';
import { zh } from '../src/i18n/locales/zh';
import { ArchitectureDiagram } from '../src/showcase/ArchitectureDiagram';
import {
  edgePath,
  formatChapterNumber,
  positionedNodes,
  sceneLayouts,
} from '../src/showcase/architecture';
import { getLessons, streamSources } from '../src/showcase/lessons';
import { getScene } from '../src/showcase/scenes';

test('Seven teaching topics have distinct diagrams with valid localized nodes, connections and source links', () => {
  assert.deepEqual(
    getLessons('zh').map((lesson) => lesson.id),
    ['pipeline', 'state', 'streaming', 'data', 'boundary', 'action', 'evidence'],
  );
  assert.deepEqual(
    getLessons('zh').map((lesson) => lesson.id),
    getLessons('en').map((lesson) => lesson.id),
  );
  const signatures = new Set<string>();
  for (const lang of ['zh', 'en'] as const) {
    for (const lesson of getLessons(lang)) {
      const scene = getScene(lang, lesson.id);
      const ids = scene.nodes.map((node) => node.id);
      assert.equal(new Set(ids).size, ids.length);
      signatures.add(ids.join(','));
      for (const node of scene.nodes) {
        assert.ok(node.name && node.detail && node.code && node.facts.length >= 2);
        assert.ok(existsSync(node.file), `Missing source: ${node.file}`);
      }
      for (const edge of scene.edges) {
        assert.ok(ids.includes(edge.from) && ids.includes(edge.to), `Dangling edge: ${edge.id}`);
        assert.ok(edge.text.length > 0);
      }
    }
  }
  assert.equal(signatures.size, 7, 'Every topic must have its own module set');
  const topologies = new Set(
    Object.values(sceneLayouts).map((scene) =>
      JSON.stringify(
        scene.edges.map((edge) => [
          scene.nodes.findIndex((node) => node.id === edge.from),
          scene.nodes.findIndex((node) => node.id === edge.to),
          edge.kind,
        ]),
      ),
    ),
  );
  assert.ok(topologies.size >= 5, 'Scenes must change connections, not just names');
});

test('Scene steps and chapter numbers render independently, with keyboard controls and correct arrows', () => {
  for (const lang of ['zh', 'en'] as const) {
    for (const [index, lesson] of getLessons(lang).entries()) {
      const scene = getScene(lang, lesson.id),
        selected = scene.nodes[0].id;
      const html = renderToStaticMarkup(
        createElement(ArchitectureDiagram, {
          scene,
          heading: `${formatChapterNumber(index)} / ${lesson.short}`,
          selected,
          onSelect: () => {},
          flat: false,
          animated: true,
          spacing: 50,
          labels: (lang === 'en' ? en : zh).diagram,
        }),
      );
      assert.ok(
        html.includes(`${formatChapterNumber(index)} / ${lesson.short.replace(/&/g, '&amp;')}`),
      );
      assert.ok(html.includes(`data-scene="${lesson.id}"`));
      assert.ok(html.includes(`data-node="${selected}" role="button" tabindex="0"`));
      assert.ok(html.includes('STEP 01'));
      assert.equal((html.match(/data-node=/g) ?? []).length, scene.nodes.length);
      for (const edge of scene.edges)
        assert.ok(
          html.includes(`data-flow="${edge.id}" data-from="${edge.from}" data-to="${edge.to}"`),
        );
    }
  }
});

test('Local state forms a closed event loop; independent data inputs converge without a model path', () => {
  assert.deepEqual(
    sceneLayouts.state.edges.map(({ from, to }) => [from, to]),
    [
      ['input', 'state'],
      ['state', 'diff'],
      ['diff', 'render'],
      ['render', 'input'],
    ],
  );
  assert.deepEqual(
    sceneLayouts.data.edges.map(({ from, to }) => [from, to]),
    [
      ['reference', 'binding'],
      ['snapshot', 'binding'],
      ['binding', 'value'],
    ],
  );
  for (const id of ['state', 'data'] as const)
    assert.ok(
      sceneLayouts[id].nodes.every((node) => node.id !== 'model' && node.id !== 'compiler'),
    );
});

test('Explicit actions lead to a separate response; native and conceptual web routes have different boundaries', () => {
  assert.deepEqual(
    sceneLayouts.action.edges.map(({ from, to }) => [from, to]),
    [
      ['choice', 'action'],
      ['action', 'message'],
      ['message', 'reply'],
    ],
  );
  const native = getScene('zh', 'boundary'),
    web = getScene('zh', 'boundary', 'web');
  assert.notDeepEqual(
    native.nodes.map((node) => node.id),
    web.nodes.map((node) => node.id),
  );
  assert.ok(native.nodes.some((node) => node.id === 'watchdog'));
  assert.ok(web.nodes.some((node) => node.id === 'web-frame'));
  assert.match(web.nodes[0].detail, /本 POC 的 DSL 不接受/);
  assert.match(getScene('en', 'boundary', 'web').nodes[0].detail, /does not accept/);
});

test('Every scene remains inside the SVG and its arrows follow layout changes at both spacing extremes', () => {
  for (const scene of Object.values(sceneLayouts)) {
    for (const flat of [false, true]) {
      for (const spacing of [0, 50, 100]) {
        const nodes = positionedNodes(scene, spacing);
        for (const node of nodes) {
          assert.ok(node.x >= 0 && node.x + 214 <= 1000);
          assert.ok(node.y - 64 >= 0 && node.y + 122 <= 520);
        }
        for (const flow of scene.edges) {
          const path = edgePath(flow, nodes, flat, spacing);
          assert.doesNotMatch(path, /NaN|undefined|Infinity/);
          assert.ok(path.startsWith('M'));
        }
      }
    }
  }
  const layout = sceneLayouts.pipeline;
  assert.notEqual(
    edgePath(layout.edges[1], positionedNodes(layout, 0), false, 0),
    edgePath(layout.edges[1], positionedNodes(layout, 100), false, 100),
  );
});

test('Recompiling accumulated text can change constants while the program remains unchanged', () => {
  const before = compile(streamSources[0]),
    after = compile(streamSources[0] + '继续增长的正文。');
  assert.deepEqual(before.program, after.program);
  assert.notDeepEqual(before.constants, after.constants);
  assert.deepEqual(after.diagnostics, []);
});
