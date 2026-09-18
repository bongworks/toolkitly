import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateUuidV4,
  generateUuidV7,
  generateUlid,
  validateIdentifier,
  generateIdentifiers
} from '../assets/js/id-tools.js';

test('generateUuidV4 creates a valid RFC 4122 version 4 identifier', () => {
  const value = generateUuidV4();
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual(validateIdentifier(value), { ok: true, value: { type: 'UUID v4' } });
});

test('generateUuidV7 encodes the supplied timestamp with RFC version and variant bits', () => {
  const value = generateUuidV7(1_726_000_000_123);
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(value.replaceAll('-', '').slice(0, 12), '0191dd9dec7b');
  assert.deepEqual(validateIdentifier(value), { ok: true, value: { type: 'UUID v7' } });
});

test('generateUlid produces deterministic Crockford Base32 output from supplied random bytes', () => {
  const value = generateUlid(1_726_000_000_123, new Uint8Array(10));
  assert.equal(value, '01J7ESVV3V0000000000000000');
  assert.deepEqual(validateIdentifier(value), { ok: true, value: { type: 'ULID' } });
});

test('validateIdentifier rejects invalid UUID and ULID input', () => {
  assert.equal(validateIdentifier('not-an-id').ok, false);
  assert.equal(validateIdentifier('01J7SXHR3V000000000000000I').ok, false);
  assert.equal(validateIdentifier('0191f3d8-c07b-6000-8000-000000000000').ok, false);
});

test('generateIdentifiers creates bounded batches for every supported kind', () => {
  const result = generateIdentifiers('ulid', 3);
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 3);
  assert.equal(result.value.every((value) => validateIdentifier(value).ok), true);
  assert.equal(generateIdentifiers('uuid-v4', 0).ok, false);
  assert.equal(generateIdentifiers('uuid-v7', 1001).ok, false);
  assert.equal(generateIdentifiers('unsupported', 1).ok, false);
});
