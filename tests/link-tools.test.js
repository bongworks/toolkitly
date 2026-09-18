import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUtmUrl, parseUrl, recomposeUrl, encodeUrlComponent, decodeUrlComponent } from '../assets/js/link-tools.js';

test('buildUtmUrl preserves existing query parameters and adds campaign values', () => {
  const result = buildUtmUrl('https://example.com/landing?ref=nav#pricing', {
    source: 'newsletter', medium: 'email', campaign: 'spring sale'
  });

  assert.equal(result.ok, true);
  assert.equal(result.value, 'https://example.com/landing?ref=nav&utm_source=newsletter&utm_medium=email&utm_campaign=spring+sale#pricing');
});

test('buildUtmUrl rejects invalid URLs', () => {
  const result = buildUtmUrl('not a url', { source: 'x' });
  assert.equal(result.ok, false);
  assert.match(result.message, /valid URL/i);
});

test('parseUrl returns repeated query parameters as arrays', () => {
  const result = parseUrl('https://example.com/path?a=one&a=two&empty=&encoded=hello%20world#section');

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.query, { a: ['one', 'two'], empty: '', encoded: 'hello world' });
  assert.equal(result.value.hash, 'section');
  assert.equal(result.value.pathname, '/path');
});

test('parseUrl rejects invalid URLs', () => {
  const result = parseUrl('://bad');
  assert.equal(result.ok, false);
  assert.match(result.message, /valid URL/i);
});

test('recomposeUrl edits query rows while preserving path and hash', () => {
  const result = recomposeUrl('https://example.com/path?keep=yes&old=remove#section', [
    { key: 'keep', value: 'updated' },
    { key: 'new key', value: 'hello world' },
    { key: 'keep', value: 'again' }
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.value, 'https://example.com/path?keep=updated&new+key=hello+world&keep=again#section');
});

test('recomposeUrl rejects a malformed URL', () => {
  const result = recomposeUrl('not a url', []);
  assert.equal(result.ok, false);
  assert.match(result.message, /valid URL/i);
});

test('encodeUrlComponent and decodeUrlComponent round trip unicode text', () => {
  const encoded = encodeUrlComponent('안녕하세요 / Toolkitly?');
  assert.equal(encoded.ok, true);
  assert.equal(encoded.value, '%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94%20%2F%20Toolkitly%3F');
  assert.deepEqual(decodeUrlComponent(encoded.value), { ok: true, value: '안녕하세요 / Toolkitly?' });
});

test('decodeUrlComponent returns an explicit error for malformed URI sequences', () => {
  const result = decodeUrlComponent('%E0%A4%A');
  assert.equal(result.ok, false);
  assert.match(result.message, /decode/i);
});
