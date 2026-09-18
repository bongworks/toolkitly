import test from 'node:test';
import assert from 'node:assert/strict';

import { testRegex } from '../assets/js/regex-tools.js';

test('testRegex returns every global match with zero-based ranges and capture groups', () => {
  const result = testRegex('(a)(\\d+)', 'g', 'a12 and a34');

  assert.deepEqual(result, {
    ok: true,
    value: {
      count: 2,
      matches: [
        { text: 'a12', start: 0, end: 3, captures: ['a', '12'] },
        { text: 'a34', start: 8, end: 11, captures: ['a', '34'] }
      ]
    }
  });
});

test('testRegex executes a non-global expression once', () => {
  const result = testRegex('a', '', 'a a');

  assert.deepEqual(result, {
    ok: true,
    value: { count: 1, matches: [{ text: 'a', start: 0, end: 1, captures: [] }] }
  });
});

test('testRegex returns useful errors for invalid patterns and flags', () => {
  assert.equal(testRegex('(', '', 'text').ok, false);
  assert.match(testRegex('a', 'gg', 'text').message, /regular expression|flag/i);
});

test('testRegex advances after empty global matches instead of looping forever', () => {
  const result = testRegex('(?:)', 'g', 'ab');

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.matches, [
    { text: '', start: 0, end: 0, captures: [] },
    { text: '', start: 1, end: 1, captures: [] },
    { text: '', start: 2, end: 2, captures: [] }
  ]);
});
