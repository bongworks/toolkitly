import test from 'node:test';
import assert from 'node:assert/strict';

import { hashBytes, digestEncodings, readLocalFileBytes } from '../assets/js/hash-tools.js';

test('hashBytes returns the known SHA-256 digest for UTF-8 text', async () => {
  const result = await hashBytes('abc', 'SHA-256');
  assert.equal(result.ok, true);
  assert.equal(digestEncodings(result.value.bytes).hex, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('hashBytes supports SHA-384 and SHA-512 with Base64 output', async () => {
  const sha384 = await hashBytes('abc', 'SHA-384');
  const sha512 = await hashBytes('abc', 'SHA-512');
  assert.equal(sha384.ok, true);
  assert.equal(sha512.ok, true);
  assert.equal(digestEncodings(sha384.value.bytes).base64, 'ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn');
  assert.equal(digestEncodings(sha512.value.bytes).base64, '3a81oZNherrMQXNJriBBMRLm+k6JqX6iCp7u5ktV05ohkpkqJ0/BqDa6PCOj/uu9RU1EI2Q86A4qmslPpUyknw==');
});

test('hashBytes compares an optional expected digest in either supported encoding', async () => {
  const matched = await hashBytes('abc', 'SHA-256', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const mismatched = await hashBytes('abc', 'SHA-256', 'AAAA');
  assert.equal(matched.value.matchesExpected, true);
  assert.equal(mismatched.value.matchesExpected, false);
});

test('hashBytes rejects an unsupported digest algorithm', async () => {
  const result = await hashBytes('abc', 'MD5');
  assert.deepEqual(result, { ok: false, message: 'Only SHA-256, SHA-384, and SHA-512 are supported.' });
});

test('readLocalFileBytes reports a local File API failure without throwing', async () => {
  const result = await readLocalFileBytes({ arrayBuffer: async () => { throw new Error('File read denied'); } });
  assert.deepEqual(result, { ok: false, message: 'Could not read the selected local file.' });
});
