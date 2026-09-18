import test from 'node:test';
import assert from 'node:assert/strict';

import {
  diffJson,
  diffText,
  compareDiffSources,
  jsonToCsv,
  csvToJson,
  jsonToYaml,
  yamlToJson,
  base64Encode,
  base64Decode
} from '../assets/js/data-tools.js';

test('diffText ignores whitespace, blank lines, and case when requested', () => {
  const result = diffText('  Hello   Toolkitly  \n\nSecond line', 'hellotoolkitly\nsecondline', {
    ignoreWhitespace: true,
    ignoreBlankLines: true,
    ignoreCase: true
  });

  assert.deepEqual(result, { ok: true, value: { changes: [], comparedLines: 2 } });
});

test('diffText reports changed, added, and removed lines with one-based line numbers', () => {
  assert.deepEqual(diffText('first\nold\nremoved', 'first\nnew\nadded'), {
    ok: true,
    value: {
      comparedLines: 3,
      changes: [
        { line: 2, type: 'changed', before: 'old', after: 'new' },
        { line: 3, type: 'changed', before: 'removed', after: 'added' }
      ]
    }
  });
  assert.deepEqual(diffText('first', 'first\nadded'), {
    ok: true,
    value: { comparedLines: 2, changes: [{ line: 2, type: 'added', after: 'added' }] }
  });
  assert.deepEqual(diffText('first\nremoved', 'first'), {
    ok: true,
    value: { comparedLines: 2, changes: [{ line: 2, type: 'removed', before: 'removed' }] }
  });
});

test('compareDiffSources reports forced JSON errors and falls back to text in automatic mode', () => {
  const invalidJson = compareDiffSources('{not json}', '{}', 'json');
  assert.equal(invalidJson.ok, false);
  assert.match(invalidJson.message, /^Invalid JSON:/);

  assert.deepEqual(compareDiffSources('{not json}', '{}', 'auto'), {
    ok: true,
    value: {
      kind: 'text',
      changes: [{ line: 1, type: 'changed', before: '{not json}', after: '{}' }],
      comparedLines: 1
    }
  });
});

test('diffJson reports nested additions, removals, and changes', () => {
  const result = diffJson('{"user":{"name":"Ada","active":true}}', '{"user":{"name":"Grace","role":"admin"}}');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, [
    { path: '$.user.active', type: 'removed', before: true },
    { path: '$.user.name', type: 'changed', before: 'Ada', after: 'Grace' },
    { path: '$.user.role', type: 'added', after: 'admin' }
  ]);
});

test('jsonToCsv escapes commas, quotes, and newlines', () => {
  assert.deepEqual(jsonToCsv('[{"name":"Ada, Lovelace","note":"She said \\"hi\\""}]'), {
    ok: true,
    value: 'name,note\n"Ada, Lovelace","She said ""hi"""'
  });
});

test('csvToJson preserves common primitive types for a typed CSV round trip', () => {
  const result = csvToJson('name,active,score\nAda,true,42\nGrace,false,3.5');
  assert.deepEqual(result, {
    ok: true,
    value: [
      { name: 'Ada', active: true, score: 42 },
      { name: 'Grace', active: false, score: 3.5 }
    ]
  });
});

test('jsonToYaml and yamlToJson round trip simple mappings and lists', () => {
  const yaml = jsonToYaml('{"name":"Toolkitly","enabled":true,"items":["JSON",2,null]}');
  assert.equal(yaml.ok, true);
  assert.equal(yaml.value, 'name: Toolkitly\nenabled: true\nitems:\n  - JSON\n  - 2\n  - null');
  assert.deepEqual(yamlToJson(yaml.value), {
    ok: true,
    value: { name: 'Toolkitly', enabled: true, items: ['JSON', 2, null] }
  });
});

test('jsonToYaml and yamlToJson round trip top-level scalars and empty containers', () => {
  for (const value of ['hello', 42, true, null, {}, []]) {
    const yaml = jsonToYaml(JSON.stringify(value));
    assert.equal(yaml.ok, true);
    assert.deepEqual(yamlToJson(yaml.value), { ok: true, value });
  }
});

test('base64 handles Unicode text in both directions', () => {
  const encoded = base64Encode('Toolkitly 도구 🚀');
  assert.deepEqual(encoded, { ok: true, value: 'VG9vbGtpdGx5IOuPhOq1rCDwn5qA' });
  assert.deepEqual(base64Decode(encoded.value), { ok: true, value: 'Toolkitly 도구 🚀' });
});

test('conversion functions return useful errors for invalid input', () => {
  assert.equal(diffJson('{bad}', '{}').ok, false);
  assert.equal(csvToJson('a,b\n"unterminated').ok, false);
  assert.equal(yamlToJson('root:\n    - unsupported').ok, false);
  assert.equal(base64Decode('%%%').ok, false);
});
