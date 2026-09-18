import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFormatterAction, formatJson, minifyJson } from '../assets/js/json-formatter.js';

test('formatJson prettifies valid JSON using the selected indentation', () => {
  assert.deepEqual(formatJson('{"enabled":true}', 2), {
    ok: true,
    value: '{\n  "enabled": true\n}'
  });
});

test('formatJson returns a user-readable error for invalid JSON', () => {
  const result = formatJson('{enabled:true}', 2);

  assert.equal(result.ok, false);
  assert.match(result.message, /^Invalid JSON:/);
});

test('minifyJson removes insignificant whitespace without changing values', () => {
  assert.deepEqual(minifyJson('{\n  "id": 1,\n  "tags": ["tool", "local"]\n}'), {
    ok: true,
    value: '{"id":1,"tags":["tool","local"]}'
  });
});

test('applyFormatterAction selects minification without changing valid JSON data', () => {
  assert.deepEqual(applyFormatterAction({ source: '{ "x": 1 }', action: 'minify', indent: 2 }), {
    ok: true,
    value: '{"x":1}'
  });
});
