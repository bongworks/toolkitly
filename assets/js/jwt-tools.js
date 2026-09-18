import { initializeToolPage, setStatus } from './tool-page.js';

const HMAC_ALGORITHMS = {
  HS256: { hash: 'SHA-256' },
  HS384: { hash: 'SHA-384' },
  HS512: { hash: 'SHA-512' }
};
const RSA_ALGORITHMS = {
  RS256: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  RS384: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
  RS512: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
  PS256: { name: 'RSA-PSS', hash: 'SHA-256', saltLength: 32 },
  PS384: { name: 'RSA-PSS', hash: 'SHA-384', saltLength: 48 },
  PS512: { name: 'RSA-PSS', hash: 'SHA-512', saltLength: 64 }
};
const ECDSA_ALGORITHMS = {
  ES256: { namedCurve: 'P-256', hash: 'SHA-256' },
  ES384: { namedCurve: 'P-384', hash: 'SHA-384' },
  ES512: { namedCurve: 'P-521', hash: 'SHA-512' }
};

function failure(message, algorithm = null) {
  return { ok: false, value: { verified: false, algorithm }, message };
}

function base64UrlBytes(source, label) {
  if (typeof source !== 'string' || !/^[A-Za-z0-9_-]*$/.test(source) || source.length % 4 === 1) {
    throw new Error(`${label} is not valid Base64URL.`);
  }
  const padded = source.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - source.length % 4) % 4);
  const binary = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonSegment(source, label) {
  const bytes = base64UrlBytes(source, label);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must decode to a JSON object.`);
  return value;
}

function parseCompactJwt(token) {
  if (typeof token !== 'string') throw new Error('Enter a compact JWT string.');
  const parts = token.trim().split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1]) throw new Error('JWT must contain exactly three compact segments.');
  return { parts, header: decodeJsonSegment(parts[0], 'JWT header'), payload: decodeJsonSegment(parts[1], 'JWT payload') };
}

export function decodeJwt(token) {
  try {
    const { parts, header, payload } = parseCompactJwt(token);
    return { ok: true, value: { header, payload, signature: parts[2], verification: 'not-verified' } };
  } catch (error) {
    return { ok: false, message: `Could not decode JWT: ${error.message}` };
  }
}

function numericDate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.valueOf())) return null;
  return { seconds: value, iso: date.toISOString() };
}

export function summarizeJwtClaims(payload, nowMs = Date.now()) {
  const issuedAt = numericDate(payload?.iat);
  const notBefore = numericDate(payload?.nbf);
  const expiresAt = numericDate(payload?.exp);
  let timeStatus = 'unavailable';
  if (notBefore && nowMs < notBefore.seconds * 1000) timeStatus = 'not-active';
  else if (expiresAt && nowMs >= expiresAt.seconds * 1000) timeStatus = 'expired';
  else if (notBefore || expiresAt) timeStatus = 'active';
  return {
    issuer: typeof payload?.iss === 'string' ? payload.iss : null,
    subject: typeof payload?.sub === 'string' ? payload.sub : null,
    audience: typeof payload?.aud === 'string' || Array.isArray(payload?.aud) ? payload.aud : null,
    issuedAt,
    notBefore,
    expiresAt,
    timeStatus
  };
}

function webCrypto() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) throw new Error('Web Crypto is unavailable in this browser.');
  return cryptoApi;
}

function pemSpkiBytes(pem) {
  if (typeof pem !== 'string') throw new Error('Paste a PEM SPKI public key.');
  const normalized = pem.trim().replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length < 3 || lines[0] !== '-----BEGIN PUBLIC KEY-----' || lines.at(-1) !== '-----END PUBLIC KEY-----') throw new Error('Public key must be a PEM SPKI public key.');
  const body = lines.slice(1, -1).join('');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body)) throw new Error('Public key PEM contains invalid Base64.');
  const binary = typeof atob === 'function' ? atob(body) : Buffer.from(body, 'base64').toString('binary');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importVerificationKey(algorithm, keySource) {
  if (!keySource || typeof keySource !== 'object') throw new Error('Provide a verification key.');
  const cryptoApi = webCrypto();
  if (HMAC_ALGORITHMS[algorithm]) {
    if (keySource.type !== 'secret' || typeof keySource.value !== 'string' || !keySource.value) throw new Error(`${algorithm} requires a non-empty shared secret.`);
    return cryptoApi.subtle.importKey('raw', new TextEncoder().encode(keySource.value), { name: 'HMAC', hash: HMAC_ALGORITHMS[algorithm].hash }, false, ['verify']);
  }
  if (keySource.type !== 'publicKey') throw new Error(`${algorithm} requires a PEM SPKI public key.`);
  const publicKey = pemSpkiBytes(keySource.value);
  if (RSA_ALGORITHMS[algorithm]) {
    const config = RSA_ALGORITHMS[algorithm];
    return cryptoApi.subtle.importKey('spki', publicKey, { name: config.name, hash: config.hash }, false, ['verify']);
  }
  const config = ECDSA_ALGORITHMS[algorithm];
  return cryptoApi.subtle.importKey('spki', publicKey, { name: 'ECDSA', namedCurve: config.namedCurve }, false, ['verify']);
}

function verificationAlgorithm(algorithm) {
  if (HMAC_ALGORITHMS[algorithm]) return { name: 'HMAC' };
  if (RSA_ALGORITHMS[algorithm]) {
    const config = RSA_ALGORITHMS[algorithm];
    return config.name === 'RSA-PSS' ? { name: 'RSA-PSS', saltLength: config.saltLength } : { name: config.name };
  }
  const config = ECDSA_ALGORITHMS[algorithm];
  return { name: 'ECDSA', hash: config.hash };
}

export async function verifyJwtSignature(token, keySource) {
  let parsed;
  try {
    parsed = parseCompactJwt(token);
  } catch (error) {
    return failure(error.message);
  }
  const algorithm = parsed.header.alg;
  if (typeof algorithm !== 'string') return failure('JWT header algorithm must be a string.');
  if (Array.isArray(parsed.header.crit) && parsed.header.crit.length) return failure('JWT critical headers are not supported.', algorithm);
  if (parsed.header.crit !== undefined && !Array.isArray(parsed.header.crit)) return failure('JWT critical headers are invalid.', algorithm);
  if (algorithm === 'none') return failure('JWT algorithm "none" is not allowed.', algorithm);
  if (!HMAC_ALGORITHMS[algorithm] && !RSA_ALGORITHMS[algorithm] && !ECDSA_ALGORITHMS[algorithm]) return failure(`JWT algorithm "${String(algorithm)}" is not supported.`, typeof algorithm === 'string' ? algorithm : null);
  if (!parsed.parts[2]) return failure('JWT signature segment is missing.', algorithm);
  try {
    const signature = base64UrlBytes(parsed.parts[2], 'JWT signature');
    const key = await importVerificationKey(algorithm, keySource);
    const verified = await webCrypto().subtle.verify(verificationAlgorithm(algorithm), key, signature, new TextEncoder().encode(`${parsed.parts[0]}.${parsed.parts[1]}`));
    return verified
      ? { ok: true, value: { verified: true, algorithm } }
      : failure('JWT signature verification failed.', algorithm);
  } catch (error) {
    return failure(`JWT verification could not run: ${error.message}`, algorithm);
  }
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function copyText(text, status, language) {
  navigator.clipboard.writeText(text)
    .then(() => setStatus(status, { language, type: 'success', text: language === 'ko' ? '클립보드에 복사했습니다.' : 'Copied to clipboard.' }))
    .catch(() => setStatus(status, { language, type: 'error', text: language === 'ko' ? '복사하지 못했습니다.' : 'Copy failed.' }));
}

function initializeJwtInspector() {
  const getLanguage = initializeToolPage();
  const tokenInput = document.querySelector('#jwt-token');
  const keyType = document.querySelector('#jwt-key-type');
  const keyInput = document.querySelector('#jwt-key');
  const decodeButton = document.querySelector('#jwt-decode');
  const verifyButton = document.querySelector('#jwt-verify');
  const headerOutput = document.querySelector('#jwt-header-output');
  const payloadOutput = document.querySelector('#jwt-payload-output');
  const claimsOutput = document.querySelector('#jwt-claims-output');
  const decodeStatus = document.querySelector('#jwt-decode-status');
  const verifyStatus = document.querySelector('#jwt-verify-status');
  if (!tokenInput || !keyType || !keyInput || !decodeButton || !verifyButton || !headerOutput || !payloadOutput || !claimsOutput || !decodeStatus || !verifyStatus) return;
  const language = () => document.documentElement.lang === 'ko' ? 'ko' : 'en';
  const translateLabels = () => {
    const current = language();
    for (const element of document.querySelectorAll('[data-en][data-ko]')) element.textContent = element.dataset[current];
  };
  translateLabels();
  new MutationObserver(translateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const renderDecoded = () => {
    const result = decodeJwt(tokenInput.value);
    if (!result.ok) {
      headerOutput.textContent = '';
      payloadOutput.textContent = '';
      claimsOutput.textContent = '';
      setStatus(decodeStatus, { language: getLanguage(), type: 'error', text: result.message });
      return null;
    }
    headerOutput.textContent = prettyJson(result.value.header);
    payloadOutput.textContent = prettyJson(result.value.payload);
    claimsOutput.textContent = prettyJson(summarizeJwtClaims(result.value.payload));
    setStatus(decodeStatus, { language: getLanguage(), type: 'success', text: language() === 'ko' ? '디코딩되었습니다. 아직 서명 검증은 하지 않았습니다.' : 'Decoded. Signature verification has not run.' });
    return result;
  };
  decodeButton.addEventListener('click', renderDecoded);
  verifyButton.addEventListener('click', async () => {
    renderDecoded();
    const result = await verifyJwtSignature(tokenInput.value, { type: keyType.value, value: keyInput.value });
    setStatus(verifyStatus, { language: getLanguage(), type: result.ok ? 'success' : 'error', text: result.ok ? (language() === 'ko' ? '서명이 검증되었습니다.' : 'Signature verified.') : result.message });
  });
  for (const button of document.querySelectorAll('[data-copy-target]')) {
    button.addEventListener('click', () => copyText(document.querySelector(button.dataset.copyTarget)?.textContent ?? '', decodeStatus, getLanguage()));
  }
}

if (typeof document !== 'undefined') initializeJwtInspector();
