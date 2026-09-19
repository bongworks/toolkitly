import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';

import { matchesToolSearch, TOOLS } from '../assets/js/tool-catalog.js';

test('every catalog tool has a unique id, local route, and English/Korean copy', () => {
  const ids = TOOLS.map((tool) => tool.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(TOOLS.length, 17);

  for (const tool of TOOLS) {
    assert.match(tool.href, /^(?:\.\/)?tools\/.+\.html$/);
    assert.ok(tool.name.en);
    assert.ok(tool.name.ko);
    assert.ok(tool.description.en);
    assert.ok(tool.description.ko);
  }
});

test('catalog includes the implemented JSON formatter at its public route', () => {
  const formatter = TOOLS.find((tool) => tool.id === 'json-formatter');

  assert.deepEqual(formatter, {
    id: 'json-formatter',
    href: 'tools/json-formatter.html',
    category: 'data',
    icon: '{}',
    name: { en: 'JSON Formatter', ko: 'JSON 포매터' },
    description: {
      en: 'Format, validate, and minify JSON locally.',
      ko: 'JSON을 브라우저에서 포맷·검증·압축합니다.'
    },
    available: true
  });
});

test('accessibility contrast search finds the contrast checker', () => {
  const contrastChecker = TOOLS.find((tool) => tool.id === 'contrast-checker');

  assert.equal(matchesToolSearch(contrastChecker, '접근성 대비', 'ko'), true);
});

test('every catalog record is available and has a static tool page', async () => {
  assert.equal(TOOLS.every((tool) => tool.available), true);
  await Promise.all(TOOLS.map((tool) => access(tool.href)));
});

test('catalog registers every approved P1 tool at a local static route', async () => {
  const p1Ids = ['json-diff', 'jwt-inspector', 'regex-tester', 'crypto-lab', 'hash-generator', 'uuid-ulid-generator'];
  const p1Tools = p1Ids.map((id) => TOOLS.find((tool) => tool.id === id));

  assert.equal(p1Tools.every(Boolean), true);
  assert.equal(p1Tools.every((tool) => tool.available), true);
  await Promise.all(p1Tools.map((tool) => access(tool.href)));
});
