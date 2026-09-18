import { initializeToolPage, setStatus } from './tool-page.js';

export function validateQrText(source) {
  const value = source.trim();
  return value
    ? { ok: true, value }
    : { ok: false, message: 'Enter text or a URL to generate a QR code.' };
}

export function formatQrStatus(language, state) {
  const copy = {
    en: { success: 'Done. You can download the QR code.', empty: 'Enter text or a URL to generate a QR code.', error: 'Something went wrong while generating the QR code.' },
    ko: { success: '완료했습니다. QR 코드를 다운로드할 수 있습니다.', empty: '텍스트 또는 URL을 입력해 QR 코드를 생성하세요.', error: 'QR 코드를 생성하는 중 문제가 발생했습니다.' }
  };
  return (copy[language === 'ko' ? 'ko' : 'en'][state] || copy.en.error);
}

export function buildQrSvg(matrix, foreground = '#0b0e14', background = '#ffffff') {
  const size = matrix.length;
  const cells = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (matrix[row][column]) cells.push(`M${column} ${row}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="${background}"/><path fill="${foreground}" d="${cells.join('')}"/></svg>`;
}

function drawQr(canvas, source, size, level, foreground, background) {
  const qr = qrcode(0, level);
  qr.addData(source);
  qr.make();
  const modules = qr.getModuleCount();
  const scale = Math.max(1, Math.floor(size / modules));
  canvas.width = modules * scale;
  canvas.height = modules * scale;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = foreground;
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (qr.isDark(row, column)) context.fillRect(column * scale, row * scale, scale, scale);
    }
  }
  return Array.from({ length: modules }, (_, row) => Array.from({ length: modules }, (_, column) => qr.isDark(row, column)));
}

function initializeQrPage() {
  const getLanguage = initializeToolPage();
  const input = document.querySelector('#qr-input');
  const size = document.querySelector('#qr-size');
  const level = document.querySelector('#qr-level');
  const foreground = document.querySelector('#qr-foreground');
  const background = document.querySelector('#qr-background');
  const canvas = document.querySelector('#qr-canvas');
  const status = document.querySelector('#qr-status');
  const generate = document.querySelector('#qr-generate');
  const download = document.querySelector('#qr-download');
  const svgDownload = document.querySelector('#qr-download-svg');
  if (!input || !size || !level || !foreground || !background || !canvas || !status || !generate || !download || !svgDownload) return;
  let currentMatrix = null;

  function language() { return document.documentElement.lang === 'ko' ? 'ko' : 'en'; }
  function renderLabels() {
    const current = language();
    for (const element of document.querySelectorAll('[data-en][data-ko]')) {
      const text = current === 'ko' ? element.dataset.ko : element.dataset.en;
      if (element.querySelector('select, input, textarea') && element.firstChild?.nodeType === 3) element.firstChild.nodeValue = `${text}`;
      else element.textContent = text;
    }
    if (!input.value.trim()) status.textContent = formatQrStatus(current, 'empty');
  }
  renderLabels();
  document.querySelector('[data-page-language]')?.addEventListener('click', () => setTimeout(renderLabels, 0));

  generate.addEventListener('click', () => {
    const result = validateQrText(input.value);
    if (!result.ok) return setStatus(status, { language: getLanguage(), type: 'error', text: result.message });
    try {
      currentMatrix = drawQr(canvas, result.value, Number(size.value), level.value, foreground.value, background.value);
      download.disabled = false;
      svgDownload.disabled = false;
      setStatus(status, { language: language(), type: 'success', text: formatQrStatus(language(), 'success') });
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
  svgDownload.addEventListener('click', () => {
    if (!currentMatrix) return;
    const blob = new Blob([buildQrSvg(currentMatrix, foreground.value, background.value)], { type: 'image/svg+xml' });
    const link = document.createElement('a'); link.download = 'toolkitly-qr-code.svg'; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href);
  });
}

if (typeof document !== 'undefined') initializeQrPage();
