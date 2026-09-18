import { initializeToolPage } from './tool-page.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser.');
  return globalThis.crypto;
}

function asArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function failure(error) {
  return { ok: false, message: error instanceof Error ? error.message : 'Crypto operation failed.' };
}

export function bytesToBase64(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(source) {
  if (typeof source !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source)) {
    return { ok: false, message: 'Input must be strict Base64.' };
  }
  try {
    const binary = typeof atob === 'function' ? atob(source) : Buffer.from(source, 'base64').toString('binary');
    return { ok: true, value: Uint8Array.from(binary, (character) => character.charCodeAt(0)) };
  } catch {
    return { ok: false, message: 'Input must be strict Base64.' };
  }
}

export function bytesToPem(input, label) {
  const base64 = bytesToBase64(input);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

export function pemToBytes(source, label) {
  if (typeof source !== 'string') return { ok: false, message: `A PEM ${label} is required.` };
  const match = source.match(new RegExp(`^-----BEGIN ${label}-----\\r?\\n([A-Za-z0-9+/=\\r\\n]+)\\r?\\n-----END ${label}-----$`));
  if (!match) return { ok: false, message: `Invalid ${label} PEM format.` };
  const body = match[1].replaceAll('\r', '').replaceAll('\n', '');
  const parsed = base64ToBytes(body);
  return parsed.ok ? parsed : { ok: false, message: `Invalid ${label} PEM data.` };
}

function aesMaterial({ key, iv }) {
  const keyBytes = base64ToBytes(key);
  if (!keyBytes.ok) return keyBytes;
  if (keyBytes.value.byteLength !== 32) return { ok: false, message: 'AES-GCM requires a 256-bit key.' };
  const ivBytes = base64ToBytes(iv);
  if (!ivBytes.ok) return ivBytes;
  if (ivBytes.value.byteLength !== 12) return { ok: false, message: 'AES-GCM requires a 12-byte IV.' };
  return { ok: true, value: { key: keyBytes.value, iv: ivBytes.value } };
}

export async function generateAesMaterial() {
  try {
    const api = cryptoApi();
    const key = new Uint8Array(32);
    const iv = new Uint8Array(12);
    api.getRandomValues(key);
    api.getRandomValues(iv);
    return { ok: true, value: { key: bytesToBase64(key), iv: bytesToBase64(iv) } };
  } catch (error) { return failure(error); }
}

export async function aesEncrypt({ plaintext, key, iv } = {}) {
  try {
    if (typeof plaintext !== 'string') throw new Error('Plaintext must be text.');
    const material = aesMaterial({ key, iv });
    if (!material.ok) return material;
    const api = cryptoApi();
    const cryptoKey = await api.subtle.importKey('raw', asArrayBuffer(material.value.key), { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const encrypted = await api.subtle.encrypt({ name: 'AES-GCM', iv: material.value.iv, tagLength: 128 }, cryptoKey, encoder.encode(plaintext));
    return { ok: true, value: { ciphertext: bytesToBase64(new Uint8Array(encrypted)) } };
  } catch (error) { return failure(error); }
}

export async function aesDecrypt({ ciphertext, key, iv } = {}) {
  try {
    const material = aesMaterial({ key, iv });
    if (!material.ok) return material;
    const ciphertextBytes = base64ToBytes(ciphertext);
    if (!ciphertextBytes.ok) return ciphertextBytes;
    const api = cryptoApi();
    const cryptoKey = await api.subtle.importKey('raw', asArrayBuffer(material.value.key), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const decrypted = await api.subtle.decrypt({ name: 'AES-GCM', iv: material.value.iv, tagLength: 128 }, cryptoKey, asArrayBuffer(ciphertextBytes.value));
    return { ok: true, value: decoder.decode(decrypted) };
  } catch (error) { return failure(error); }
}

async function importRsaPem(pem, label, format, usages) {
  const parsed = pemToBytes(pem, label);
  if (!parsed.ok) return parsed;
  try {
    const imported = await cryptoApi().subtle.importKey(format, asArrayBuffer(parsed.value), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, usages);
    return { ok: true, value: imported };
  } catch {
    return { ok: false, message: `Invalid RSA-OAEP SHA-256 ${label} PEM key.` };
  }
}

export async function rsaEncrypt(plaintext, publicKey) {
  try {
    const input = typeof plaintext === 'object' && plaintext !== null ? plaintext : { plaintext, publicKey };
    if (typeof input.plaintext !== 'string') throw new Error('Plaintext must be text.');
    const imported = await importRsaPem(input.publicKey, 'PUBLIC KEY', 'spki', ['encrypt']);
    if (!imported.ok) return imported;
    const encrypted = await cryptoApi().subtle.encrypt({ name: 'RSA-OAEP' }, imported.value, encoder.encode(input.plaintext));
    return { ok: true, value: bytesToBase64(new Uint8Array(encrypted)) };
  } catch (error) { return failure(error); }
}

export async function rsaDecrypt(ciphertext, privateKey) {
  try {
    const input = typeof ciphertext === 'object' && ciphertext !== null ? ciphertext : { ciphertext, privateKey };
    const cipherBytes = base64ToBytes(input.ciphertext);
    if (!cipherBytes.ok) return cipherBytes;
    const imported = await importRsaPem(input.privateKey, 'PRIVATE KEY', 'pkcs8', ['decrypt']);
    if (!imported.ok) return imported;
    const decrypted = await cryptoApi().subtle.decrypt({ name: 'RSA-OAEP' }, imported.value, asArrayBuffer(cipherBytes.value));
    return { ok: true, value: decoder.decode(decrypted) };
  } catch (error) { return failure(error); }
}

if (typeof document !== 'undefined') {
  initializeToolPage();
  const byId = (id) => document.getElementById(id);
  const language = () => document.documentElement.lang === 'ko' ? 'ko' : 'en';
  const message = (en, ko) => language() === 'ko' ? ko : en;
  const setStatus = (text, failed = false) => { byId('crypto-status').textContent = text; byId('crypto-status').dataset.state = failed ? 'error' : 'success'; };
  const setOutput = (value) => { byId('crypto-output').textContent = value; };
  function updateLabels() { for (const item of document.querySelectorAll('[data-en][data-ko]')) item.textContent = item.dataset[language()]; }
  updateLabels();
  new MutationObserver(updateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  byId('generate-aes')?.addEventListener('click', async () => {
    const result = await generateAesMaterial();
    if (!result.ok) return setStatus(result.message, true);
    byId('aes-key').value = result.value.key; byId('aes-iv').value = result.value.iv;
    setStatus(message('Generated a new AES-256 key and 12-byte IV locally.', '새 AES-256 키와 12바이트 IV를 브라우저에서 생성했습니다.'));
  });
  byId('crypto-run')?.addEventListener('click', async () => {
    const mode = byId('crypto-mode').value;
    const plaintext = byId('crypto-input').value;
    const result = mode === 'aes-encrypt' ? await aesEncrypt({ plaintext, key: byId('aes-key').value, iv: byId('aes-iv').value })
      : mode === 'aes-decrypt' ? await aesDecrypt({ ciphertext: plaintext, key: byId('aes-key').value, iv: byId('aes-iv').value })
        : mode === 'rsa-encrypt' ? await rsaEncrypt(plaintext, byId('rsa-public-key').value)
          : await rsaDecrypt(plaintext, byId('rsa-private-key').value);
    if (!result.ok) return setStatus(result.message, true);
    setOutput(typeof result.value === 'string' ? result.value : result.value.ciphertext);
    setStatus(message('Complete. The value never left this browser.', '완료했습니다. 값은 이 브라우저 밖으로 전송되지 않았습니다.'));
  });
  byId('copy-crypto')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(byId('crypto-output').textContent); setStatus(message('Copied.', '복사했습니다.')); } catch { setStatus(message('Copy failed.', '복사하지 못했습니다.'), true); } });
}
