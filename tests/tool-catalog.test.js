import test from 'node:test';
import assert from 'node:assert/strict';

import { TOOLS } from '../assets/js/tool-catalog.js';

test('every catalog tool has a unique id, local route, and English/Korean copy', () => {
  const ids = TOOLS.map((tool) => tool.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(TOOLS.length, 12);

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
    }
  });
});
