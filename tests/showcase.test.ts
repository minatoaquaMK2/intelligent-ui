import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile } from '../src/core/compiler';
import { en } from '../src/i18n/locales/en';
import { zh } from '../src/i18n/locales/zh';
import { ArchitectureDiagram } from '../src/showcase/ArchitectureDiagram';
import {
  architectureFlows,
  formatChapterNumber,
  lessonArchitecture,
} from '../src/showcase/architecture';
import { getLessons, getStages, streamSources } from '../src/showcase/lessons';

test('Chapter numbers identify teaching topics in both languages, independently of module positions', () => {
  assert.deepEqual(
    getLessons('zh').map((lesson) => lesson.id),
    getLessons('en').map((lesson) => lesson.id),
  );
  assert.equal(formatChapterNumber(1), '02');
  assert.equal(lessonArchitecture.state.focus, 'runtime');
  for (const lang of ['zh', 'en'] as const) {
    const stages = getStages(lang);
    for (const [index, lesson] of getLessons(lang).entries()) {
      const focus = lessonArchitecture[lesson.id].focus;
      const html = renderToStaticMarkup(
        createElement(ArchitectureDiagram, {
          lesson,
          chapterNumber: formatChapterNumber(index),
          selected: focus,
          onSelect: () => {},
          flat: false,
          animated: true,
          stages,
          labels: (lang === 'en' ? en : zh).diagram,
        }),
      );
      assert.ok(html.includes(`${formatChapterNumber(index)} / ${lesson.short}`));
      assert.ok(html.includes(`data-stage="${focus}" role="button" tabindex="0"`));
      // Modules have names and responsibilities, never competing numeric labels.
      for (const button of html.matchAll(/<g[^>]*role="button"[\s\S]*?<\/g>/g)) {
        assert.doesNotMatch(button[0], /0[1-6] \/ /);
      }
      assert.equal(html.includes('data-flow="nextTurn"'), lesson.id === 'action');
      assert.equal(html.includes('data-flow="action"'), lesson.id === 'action');
    }
  }
});

test('Local interactions and data updates have distinct paths that never reach the model or compiler', () => {
  const state = lessonArchitecture.state.flows.map((id) => architectureFlows[id]);
  assert.deepEqual(state, [
    { from: 'host', to: 'runtime', kind: 'event' },
    { from: 'runtime', to: 'host', kind: 'program' },
  ]);
  const data = lessonArchitecture.data.flows.map((id) => architectureFlows[id]);
  assert.deepEqual(data, [
    { from: 'data', to: 'runtime', kind: 'program' },
    { from: 'runtime', to: 'host', kind: 'program' },
  ]);
});

test('Only an explicit next-turn path carries a new message back to generation', () => {
  const action = lessonArchitecture.action.flows.map((id) => architectureFlows[id]);
  assert.deepEqual(action, [
    { from: 'host', to: 'runtime', kind: 'event' },
    { from: 'runtime', to: 'host', kind: 'event' },
    { from: 'host', to: 'source', kind: 'event' },
  ]);
  for (const [lesson, mechanism] of Object.entries(lessonArchitecture)) {
    if (lesson !== 'action') assert.ok(!mechanism.flows.includes('nextTurn'));
  }
});

test('Recompiling accumulated text can change constants while the program remains unchanged', () => {
  const before = compile(streamSources[0]);
  const after = compile(streamSources[0] + '继续增长的正文。');
  assert.deepEqual(before.program, after.program);
  assert.notDeepEqual(before.constants, after.constants);
  assert.deepEqual(after.diagnostics, []);
});
