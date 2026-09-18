import { initializeToolPage, setStatus } from './tool-page.js';

export function validateQrText(source) {
  const value = source.trim();
  return value
    ? { ok: true, value }
    : { ok: false, message: 'Enter text or a URL to generate a QR code.' };
}

function drawQr(canvas, source, size) {
  const qr = qrcode(0, 'M');
  qr.addData(source);
  qr.make();
  const modules = qr.getModuleCount();
  const scale = Math.max(1, Math.floor(size / modules));
  canvas.width = modules * scale;
  canvas.height = modules * scale;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0b0e14';
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (qr.isDark(row, column)) context.fillRect(column * scale, row * scale, scale, scale);
    }
  }
}

function initializeQrPage() {
  const getLanguage = initializeToolPage();
  const input = document.querySelector('#qr-input');
  const size = document.querySelector('#qr-size');
  const canvas = document.querySelector('#qr-canvas');
  const status = document.querySelector('#qr-status');
  const generate = document.querySelector('#qr-generate');
  const download = document.querySelector('#qr-download');
  if (!input || !size || !canvas || !status || !generate || !download) return;

  generate.addEventListener('click', () => {
    const result = validateQrText(input.value);
    if (!result.ok) return setStatus(status, { language: getLanguage(), type: 'error', text: result.message });
    try {
      drawQr(canvas, result.value, Number(size.value));
      download.disabled = false;
      setStatus(status, { language: getLanguage(), type: 'success' });
    } catch (error) {
      setStatus(status, { language: getLanguage(), type: 'error', text: error.message });
    }
  });

  download.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'toolkitly-qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

if (typeof document !== 'undefined') initializeQrPage();
