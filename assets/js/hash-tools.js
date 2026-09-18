import { initializeToolPage } from './tool-page.js';

const encoder = new TextEncoder();

function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser.');
  return globalThis.crypto;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
}

function normalizeBytes(input) {
  if (typeof input === 'string') return encoder.encode(input);
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return null;
}

function expectedDigestMatches(encodings, expected) {
  if (typeof expected !== 'string' || !expected.trim()) return undefined;
  const candidate = expected.trim();
  return candidate.toLowerCase() === encodings.hex || candidate === encodings.base64;
}

export function digestEncodings(input) {
  const bytes = normalizeBytes(input);
  if (!bytes) throw new TypeError('Digest must be bytes.');
  return { hex: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''), base64: bytesToBase64(bytes) };
}

export async function hashBytes(input, algorithm = 'SHA-256', expectedDigest) {
  if (!['SHA-256', 'SHA-384', 'SHA-512'].includes(algorithm)) return { ok: false, message: 'Only SHA-256, SHA-384, and SHA-512 are supported.' };
  const bytes = normalizeBytes(input);
  if (!bytes) return { ok: false, message: 'Hash input must be text or bytes.' };
  try {
    const digest = new Uint8Array(await cryptoApi().subtle.digest(algorithm, bytes));
    const encodings = digestEncodings(digest);
    return { ok: true, value: { bytes: digest, matchesExpected: expectedDigestMatches(encodings, expectedDigest) } };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Hashing failed.' }; }
}

if (typeof document !== 'undefined') {
  initializeToolPage();
  const byId = (id) => document.getElementById(id);
  const language = () => document.documentElement.lang === 'ko' ? 'ko' : 'en';
  const copy = (en, ko) => language() === 'ko' ? ko : en;
  const setStatus = (text, failed = false) => { byId('hash-status').textContent = text; byId('hash-status').dataset.state = failed ? 'error' : 'success'; };
  function updateLabels() { for (const item of document.querySelectorAll('[data-en][data-ko]')) item.textContent = item.dataset[language()]; }
  updateLabels();
  new MutationObserver(updateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  byId('hash-run')?.addEventListener('click', async () => {
    const file = byId('hash-file').files[0];
    const input = file ? new Uint8Array(await file.arrayBuffer()) : byId('hash-input').value;
    const result = await hashBytes(input, byId('hash-algorithm').value, byId('expected-digest').value);
    if (!result.ok) return setStatus(result.message, true);
    const encodings = digestEncodings(result.value.bytes);
    byId('hash-hex').textContent = encodings.hex; byId('hash-base64').textContent = encodings.base64;
    const match = result.value.matchesExpected;
    setStatus(match === undefined ? copy('Digest ready. Input stayed in this browser.', '다이제스트를 생성했습니다. 입력값은 브라우저 안에만 남습니다.') : match ? copy('Expected digest matches.', '예상 다이제스트와 일치합니다.') : copy('Expected digest does not match.', '예상 다이제스트와 일치하지 않습니다.'), match === false);
  });
  byId('copy-hash')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(byId('hash-hex').textContent); setStatus(copy('Hex digest copied.', '16진수 다이제스트를 복사했습니다.')); } catch { setStatus(copy('Copy failed.', '복사하지 못했습니다.'), true); } });
}
