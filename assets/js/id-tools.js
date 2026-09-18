import { initializeToolPage, setStatus } from './tool-page.js';

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random generation is unavailable in this browser.');
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function formatUuid(bytes) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuidV4() {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

export function generateUuidV7(nowMs = Date.now()) {
  if (!Number.isInteger(nowMs) || nowMs < 0 || nowMs > 0xffffffffffff) throw new RangeError('Timestamp must fit in 48 bits.');
  const bytes = randomBytes(16);
  let timestamp = nowMs;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp & 0xff;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

export function generateUlid(nowMs = Date.now(), suppliedRandomBytes) {
  if (!Number.isInteger(nowMs) || nowMs < 0 || nowMs > 0xffffffffffff) throw new RangeError('Timestamp must fit in 48 bits.');
  const random = suppliedRandomBytes ?? randomBytes(10);
  if (!(random instanceof Uint8Array) || random.length !== 10) throw new TypeError('ULID randomness must be exactly 10 bytes.');
  let timestamp = BigInt(nowMs);
  let encodedTime = '';
  for (let index = 0; index < 10; index += 1) {
    encodedTime = ULID_ALPHABET[Number(timestamp & 31n)] + encodedTime;
    timestamp >>= 5n;
  }
  let encodedRandom = '';
  let value = 0n;
  for (const byte of random) value = (value << 8n) | BigInt(byte);
  for (let index = 0; index < 16; index += 1) {
    encodedRandom = ULID_ALPHABET[Number(value & 31n)] + encodedRandom;
    value >>= 5n;
  }
  return encodedTime + encodedRandom;
}

export function validateIdentifier(source) {
  const value = source.trim();
  if (UUID_V4.test(value)) return { ok: true, value: { type: 'UUID v4' } };
  if (UUID_V7.test(value)) return { ok: true, value: { type: 'UUID v7' } };
  if (ULID.test(value)) return { ok: true, value: { type: 'ULID' } };
  return { ok: false, message: 'Enter a valid UUID v4, UUID v7, or ULID.' };
}

export function generateIdentifiers(kind, count) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) return { ok: false, message: 'Choose a whole-number batch size from 1 to 1,000.' };
  const create = kind === 'uuid-v4' ? generateUuidV4 : kind === 'uuid-v7' ? generateUuidV7 : kind === 'ulid' ? generateUlid : null;
  if (!create) return { ok: false, message: 'Choose UUID v4, UUID v7, or ULID.' };
  try { return { ok: true, value: Array.from({ length: count }, () => create()) }; }
  catch (error) { return { ok: false, message: error.message }; }
}

function initializeIdentifierPage() {
  const getLanguage = initializeToolPage();
  const kind = document.querySelector('#identifier-kind');
  const count = document.querySelector('#identifier-count');
  const generate = document.querySelector('#generate-identifiers');
  const output = document.querySelector('#identifier-output');
  const status = document.querySelector('#identifier-status');
  const copy = document.querySelector('#copy-identifiers');
  const download = document.querySelector('#download-identifiers');
  const validateInput = document.querySelector('#identifier-validate');
  const validate = document.querySelector('#validate-identifier');
  const validation = document.querySelector('#identifier-validation');
  if (!kind || !count || !generate || !output || !status || !copy || !download || !validateInput || !validate || !validation) return;
  const language = () => document.documentElement.lang === 'ko' ? 'ko' : 'en';
  const local = (en, ko) => language() === 'ko' ? ko : en;

  generate.addEventListener('click', () => {
    const result = generateIdentifiers(kind.value, Number(count.value));
    if (!result.ok) return setStatus(status, { language: getLanguage(), type: 'error', text: result.message });
    output.textContent = result.value.join('\n');
    setStatus(status, { language: getLanguage(), type: 'success', text: local(`${result.value.length} identifiers generated locally.`, `${result.value.length}개의 식별자를 브라우저에서 생성했습니다.`) });
  });
  copy.addEventListener('click', async () => {
    if (!output.textContent) return;
    try { await navigator.clipboard.writeText(output.textContent); setStatus(status, { language: getLanguage(), type: 'success', text: local('Copied to clipboard.', '클립보드에 복사했습니다.') }); }
    catch { setStatus(status, { language: getLanguage(), type: 'error', text: local('Copy failed. Select the result and copy it manually.', '복사하지 못했습니다. 결과를 직접 선택해 복사하세요.') }); }
  });
  download.addEventListener('click', () => {
    if (!output.textContent) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([output.textContent + '\n'], { type: 'text/plain;charset=utf-8' }));
    link.download = 'toolkitly-identifiers.txt'; link.click(); URL.revokeObjectURL(link.href);
  });
  validate.addEventListener('click', () => {
    const result = validateIdentifier(validateInput.value);
    validation.dataset.status = result.ok ? 'success' : 'error';
    validation.textContent = result.ok ? local(`Valid ${result.value.type}.`, `유효한 ${result.value.type}입니다.`) : local(result.message, 'UUID v4, UUID v7 또는 ULID 형식을 입력하세요.');
  });
}

if (typeof document !== 'undefined') initializeIdentifierPage();
