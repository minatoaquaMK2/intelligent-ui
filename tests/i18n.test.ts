import assert from 'node:assert/strict';
import { test } from 'node:test';
import { en, zh } from '../src/i18n';
import { getLabSource, getLessons, getStages } from '../src/showcase/lessons';
import { compile } from '../src/core/compiler';
import { describeViewContext } from '../src/core/context';

function deepCheckKeys(objZh: Record<string, unknown>, objEn: Record<string, unknown>, path = '') {
  const keysZh = Object.keys(objZh).sort();
  const keysEn = Object.keys(objEn).sort();
  assert.deepEqual(keysEn, keysZh, `Key mismatch at ${path || 'root'}`);

  for (const key of keysZh) {
    const valZh = objZh[key];
    const valEn = objEn[key];
    const curPath = path ? `${path}.${key}` : key;
    assert.equal(typeof valEn, typeof valZh, `Type mismatch at ${curPath}`);

    if (typeof valZh === 'object' && valZh !== null && !Array.isArray(valZh)) {
      deepCheckKeys(valZh as Record<string, unknown>, valEn as Record<string, unknown>, curPath);
    } else if (typeof valZh === 'string') {
      assert.ok((valZh as string).length > 0, `Empty string in zh at ${curPath}`);
      assert.ok((valEn as string).length > 0, `Empty string in en at ${curPath}`);
    }
  }
}

test('i18n: translations dictionaries have full symmetry and no missing keys', () => {
  deepCheckKeys(zh as unknown as Record<string, unknown>, en as unknown as Record<string, unknown>);
});

test('i18n: lessons and stages exist for both zh and en and have matching IDs', () => {
  const lessonsZh = getLessons('zh');
  const lessonsEn = getLessons('en');
  assert.equal(lessonsZh.length, 7);
  assert.equal(lessonsEn.length, 7);

  for (let i = 0; i < lessonsZh.length; i++) {
    assert.equal(lessonsZh[i].id, lessonsEn[i].id);
    assert.ok(lessonsZh[i].name.length > 0);
    assert.ok(lessonsEn[i].name.length > 0);
    assert.ok(lessonsZh[i].description.length > 0);
    assert.ok(lessonsEn[i].description.length > 0);
  }

  const stagesZh = getStages('zh');
  const stagesEn = getStages('en');
  assert.equal(stagesZh.length, 5);
  assert.equal(stagesEn.length, 5);

  for (let i = 0; i < stagesZh.length; i++) {
    assert.equal(stagesZh[i].file, stagesEn[i].file);
    assert.ok(stagesZh[i].name.length > 0);
    assert.ok(stagesEn[i].name.length > 0);
    assert.ok(stagesZh[i].detail.length > 0);
    assert.ok(stagesEn[i].detail.length > 0);
  }
});

test('i18n: examples presets exist for both zh and en and have matching IDs', () => {
  assert.equal(zh.examples.length, 3);
  assert.equal(en.examples.length, 3);
  for (let i = 0; i < zh.examples.length; i++) {
    assert.equal(zh.examples[i].id, en.examples[i].id);
    assert.ok(zh.examples[i].title.length > 0);
    assert.ok(en.examples[i].title.length > 0);
    assert.ok(zh.examples[i].prompt.length > 0);
    assert.ok(en.examples[i].prompt.length > 0);
  }
});

test('i18n: describeViewContext produces localized summary text', () => {
  const ctx = { rack: 'Rack A01', threshold: 80, onlyHot: true };
  assert.equal(describeViewContext(ctx, 'zh'), 'Rack A01 · 阈值 80°C · 只看温度越限');
  assert.equal(describeViewContext(ctx, 'en'), 'Rack A01 · Threshold 80°C · Over-temp only');
});

test('i18n: lab sources compile cleanly in both Chinese and English', () => {
  const sourceZh = getLabSource('zh');
  const sourceEn = getLabSource('en');

  const compiledZh = compile(sourceZh);
  assert.deepEqual(compiledZh.diagnostics, []);
  assert.equal(compiledZh.program.roots.length > 0, true);

  const compiledEn = compile(sourceEn);
  assert.deepEqual(compiledEn.diagnostics, []);
  assert.equal(compiledEn.program.roots.length > 0, true);
});
