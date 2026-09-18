import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import {
  aesEncrypt,
  aesDecrypt,
  rsaEncrypt,
  rsaDecrypt,
  generateAesMaterial,
  bytesToBase64,
  bytesToPem
} from '../assets/js/crypto-tools.js';

const cryptoApi = globalThis.crypto ?? webcrypto;

test('AES-GCM round trips UTF-8 text using generated 256-bit material', async () => {
  const material = await generateAesMaterial();
  assert.equal(material.ok, true);
  const encrypted = await aesEncrypt({ plaintext: 'Toolkitly 암호화 🚀', ...material.value });
  assert.equal(encrypted.ok, true);
  const decrypted = await aesDecrypt({ ciphertext: encrypted.value.ciphertext, key: material.value.key, iv: encrypted.value.iv });
  assert.deepEqual(decrypted, { ok: true, value: 'Toolkitly 암호화 🚀' });
});

test('AES-GCM encryption replaces a supplied IV with a fresh IV for each ciphertext', async () => {
  const material = await generateAesMaterial();
  const first = await aesEncrypt({ plaintext: 'first', ...material.value });
  const second = await aesEncrypt({ plaintext: 'second', ...material.value });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.value.iv, material.value.iv);
  assert.notEqual(second.value.iv, material.value.iv);
  assert.notEqual(first.value.iv, second.value.iv);
  assert.deepEqual(await aesDecrypt({ ciphertext: first.value.ciphertext, key: material.value.key, iv: first.value.iv }), { ok: true, value: 'first' });
});

test('AES-GCM rejects material that is not a 256-bit key and 12-byte IV', async () => {
  const shortKey = bytesToBase64(new Uint8Array(16));
  const shortIv = bytesToBase64(new Uint8Array(11));
  const result = await aesEncrypt({ plaintext: 'private', key: shortKey, iv: shortIv });
  assert.equal(result.ok, false);
  assert.match(result.message, /256-bit key|12-byte IV/);
});

test('RSA-OAEP SHA-256 round trips with generated PEM keys', async () => {
  const pair = await cryptoApi.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  const publicKey = bytesToPem(new Uint8Array(await cryptoApi.subtle.exportKey('spki', pair.publicKey)), 'PUBLIC KEY');
  const privateKey = bytesToPem(new Uint8Array(await cryptoApi.subtle.exportKey('pkcs8', pair.privateKey)), 'PRIVATE KEY');
  const encrypted = await rsaEncrypt('Local only', publicKey);
  assert.equal(encrypted.ok, true);
  assert.deepEqual(await rsaDecrypt(encrypted.value, privateKey), { ok: true, value: 'Local only' });
});

test('crypto helpers reject malformed Base64 and PEM without throwing', async () => {
  assert.equal((await aesDecrypt({ ciphertext: 'not base64!', key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', iv: 'AAAAAAAAAAAAAAAA' })).ok, false);
  const encrypted = await rsaEncrypt('text', '-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----');
  assert.equal(encrypted.ok, false);
});
