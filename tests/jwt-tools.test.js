import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { decodeJwt, summarizeJwtClaims, verifyJwtSignature } from '../assets/js/jwt-tools.js';

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signedHs256Token(payload, secret = 'browser-local-secret') {
  const encodedHeader = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

function pemSpki(bytes) {
  const body = Buffer.from(bytes).toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

async function signedPublicKeyToken(algorithm, keyPair, signAlgorithm) {
  const encodedHeader = base64Url(JSON.stringify({ alg: algorithm, typ: 'JWT' }));
  const encodedPayload = base64Url(JSON.stringify({ sub: 'ada' }));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(signAlgorithm, keyPair.privateKey, new TextEncoder().encode(signingInput));
  const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return { token: `${signingInput}.${Buffer.from(signature).toString('base64url')}`, publicKey: pemSpki(spki) };
}

test('decodeJwt decodes Base64URL header and payload without implying verification', () => {
  const token = signedHs256Token({ sub: 'ada', name: 'Ada Lovelace' });
  const result = decodeJwt(token);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value.header, { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(result.value.payload, { sub: 'ada', name: 'Ada Lovelace' });
  assert.equal(result.value.verification, 'not-verified');
});

test('summarizeJwtClaims reports registered claims and readable NumericDate values', () => {
  const summary = summarizeJwtClaims({ iss: 'toolkitly', sub: 'ada', aud: ['web', 'mobile'], iat: 0, nbf: 1, exp: 2 }, 1_500);

  assert.deepEqual(summary, {
    issuer: 'toolkitly',
    subject: 'ada',
    audience: ['web', 'mobile'],
    issuedAt: { seconds: 0, iso: '1970-01-01T00:00:00.000Z' },
    notBefore: { seconds: 1, iso: '1970-01-01T00:00:01.000Z' },
    expiresAt: { seconds: 2, iso: '1970-01-01T00:00:02.000Z' },
    timeStatus: 'active'
  });
});

test('verifyJwtSignature verifies a valid HS256 signature with a user-provided secret', async () => {
  const result = await verifyJwtSignature(signedHs256Token({ sub: 'ada' }), { type: 'secret', value: 'browser-local-secret' });

  assert.deepEqual(result, { ok: true, value: { verified: true, algorithm: 'HS256' } });
});

test('verifyJwtSignature rejects an invalid HMAC signature with explicit state', async () => {
  const token = `${signedHs256Token({ sub: 'ada' }).slice(0, -1)}x`;
  const result = await verifyJwtSignature(token, { type: 'secret', value: 'browser-local-secret' });

  assert.equal(result.ok, false);
  assert.deepEqual(result.value, { verified: false, algorithm: 'HS256' });
  assert.match(result.message, /signature/i);
});

test('verifyJwtSignature rejects none and unsupported algorithms before key import', async () => {
  const none = `${base64Url(JSON.stringify({ alg: 'none' }))}.${base64Url(JSON.stringify({ sub: 'ada' }))}.`;
  const unsupported = `${base64Url(JSON.stringify({ alg: 'EdDSA' }))}.${base64Url(JSON.stringify({ sub: 'ada' }))}.signature`;

  for (const token of [none, unsupported]) {
    const result = await verifyJwtSignature(token, { type: 'secret', value: 'browser-local-secret' });
    assert.equal(result.ok, false);
    assert.equal(result.value.verified, false);
    assert.match(result.message, /not supported|not allowed/i);
  }
});

test('verifyJwtSignature rejects malformed compact tokens and incompatible key types', async () => {
  const malformed = await verifyJwtSignature('header.payload', { type: 'secret', value: 'browser-local-secret' });
  const incompatible = await verifyJwtSignature(signedHs256Token({ sub: 'ada' }), { type: 'publicKey', value: '-----BEGIN PUBLIC KEY-----\n-----END PUBLIC KEY-----' });

  assert.equal(malformed.ok, false);
  assert.match(malformed.message, /compact/i);
  assert.equal(incompatible.ok, false);
  assert.match(incompatible.message, /secret/i);
});

test('verifyJwtSignature verifies RSA, RSA-PSS, and ECDSA public-key signatures from PEM SPKI', async () => {
  const rsa = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pss = await crypto.subtle.generateKey({ name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-384' }, true, ['sign', 'verify']);
  const ecdsa = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const fixtures = await Promise.all([
    signedPublicKeyToken('RS256', rsa, { name: 'RSASSA-PKCS1-v1_5' }),
    signedPublicKeyToken('PS384', pss, { name: 'RSA-PSS', saltLength: 48 }),
    signedPublicKeyToken('ES256', ecdsa, { name: 'ECDSA', hash: 'SHA-256' })
  ]);

  for (const fixture of fixtures) {
    const result = await verifyJwtSignature(fixture.token, { type: 'publicKey', value: fixture.publicKey });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.value.verified, true);
  }
});

test('verifyJwtSignature rejects malformed PEM public keys for asymmetric algorithms', async () => {
  const header = base64Url(JSON.stringify({ alg: 'RS256' }));
  const token = `${header}.${base64Url(JSON.stringify({ sub: 'ada' }))}.AAAA`;
  const result = await verifyJwtSignature(token, { type: 'publicKey', value: 'not a PEM key' });

  assert.equal(result.ok, false);
  assert.match(result.message, /PEM SPKI/i);
});
