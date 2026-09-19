import { initializeToolPage } from './tool-page.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function timestampToDate(input) {
  const value = Number(String(input).trim());
  if (!Number.isFinite(value)) throw new Error('Enter a valid timestamp.');
  const milliseconds = Math.abs(value) < 1e11 ? value * 1000 : value;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new Error('Timestamp is outside the supported date range.');
  return date;
}

export function dateToTimestamp(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date.');
  return Math.floor(date.getTime() / 1000);
}

function formatDateTime(date, timeZone, language = 'en') {
  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone, dateStyle: 'medium', timeStyle: 'medium'
  }).format(date);
}

export function formatRelativeTime(date, reference = new Date(), language = 'en') {
  const seconds = (date.getTime() - reference.getTime()) / 1000;
  const units = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  const [divisor, unit] = units.find(([size]) => Math.abs(seconds) >= size) ?? [1, 'second'];
  return new Intl.RelativeTimeFormat(language === 'ko' ? 'ko' : 'en', { numeric: 'always' }).format(Math.round(seconds / divisor), unit);
}

export function formatTimestampDetails(input, reference = new Date(), language = 'en') {
  const date = timestampToDate(input);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    utc: formatDateTime(date, 'UTC', language),
    local: formatDateTime(date, browserTimeZone, language),
    timeZone: browserTimeZone,
    iso: date.toISOString(),
    relative: formatRelativeTime(date, reference, language)
  };
}

export function getTimeZoneParts(input, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date.');
  const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFormatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const zoneFormatter = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' });
  return { timeZone, date: dateFormatter.format(date), time: timeFormatter.format(date).replace(/^24:/, '00:'), zone: zoneFormatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? '' };
}

export function formatTimezoneSummary(input, timeZones) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date.');
  return timeZones.map((timeZone) => ({ ...getTimeZoneParts(date, timeZone), timeZone }));
}

function parseColor(input) {
  const value = String(input).trim().toLowerCase();
  let match = value.match(/^#([0-9a-f]{3,8})$/i);
  if (match) {
    let hex = match[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((char) => char + char).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) throw new Error('Use a 3 or 6 digit HEX color.');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,[^)]*)?\)$/);
  if (match) return [0, 1, 2].map((index) => clamp(Number(match[index + 1]), 0, 255));
  match = value.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,[^)]*)?\)$/);
  if (match) {
    const h = ((Number(match[1]) % 360) + 360) % 360 / 360;
    const s = clamp(Number(match[2]) / 100, 0, 1);
    const l = clamp(Number(match[3]) / 100, 0, 1);
    const hue = (n) => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [hue(0), hue(8), hue(4)].map((channel) => Math.round(channel * 255));
  }
  throw new Error('Use HEX, RGB, or HSL color syntax.');
}

function rgbToHsl([r, g, b]) {
  const channels = [r, g, b].map((value) => value / 255);
  const max = Math.max(...channels); const min = Math.min(...channels); const delta = max - min;
  let h = 0; const l = (max + min) / 2;
  if (delta) {
    const s = delta / (1 - Math.abs(2 * l - 1));
    if (max === channels[0]) h = ((channels[1] - channels[2]) / delta) % 6;
    else if (max === channels[1]) h = (channels[2] - channels[0]) / delta + 2;
    else h = (channels[0] - channels[1]) / delta + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
    return [h, Math.round(s * 100), Math.round(l * 100)];
  }
  return [0, 0, Math.round(l * 100)];
}

export function convertColor(input) {
  const rgb = parseColor(input).map((value) => Math.round(value));
  const hex = `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  const [h, s, l] = rgbToHsl(rgb);
  return { hex, rgb: `rgb(${rgb.join(', ')})`, hsl: `hsl(${h}, ${s}%, ${l}%)` };
}

function relativeLuminance(input) {
  return parseColor(input).reduce((sum, channel, index) => {
    const value = channel / 255;
    return sum + (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

export function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground); const second = relativeLuminance(background);
  return Math.round(((Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)) * 100) / 100;
}

export function contrastRating(ratio) {
  return { normalAA: ratio >= 4.5, largeAA: ratio >= 3, normalAAA: ratio >= 7, largeAAA: ratio >= 4.5 };
}

export function formatContrastResult(ratio, language = 'en') {
  const rating = contrastRating(ratio);
  if (language === 'ko') {
    const pass = (value) => value ? '통과' : '실패';
    return `${ratio}:1\n일반 텍스트 AA ${pass(rating.normalAA)} · 큰 텍스트 AA ${pass(rating.largeAA)}\n일반 텍스트 AAA ${pass(rating.normalAAA)} · 큰 텍스트 AAA ${pass(rating.largeAAA)}`;
  }
  return `${ratio}:1\nNormal AA ${rating.normalAA ? 'Pass' : 'Fail'} · Large AA ${rating.largeAA ? 'Pass' : 'Fail'}\nNormal AAA ${rating.normalAAA ? 'Pass' : 'Fail'} · Large AAA ${rating.largeAAA ? 'Pass' : 'Fail'}`;
}

// The browser owns screen access; this only returns the color after an explicit user selection.
export async function pickScreenColor(EyeDropperConstructor = globalThis.EyeDropper) {
  if (typeof EyeDropperConstructor !== 'function') throw new Error('Screen color picking is not supported in this browser.');
  const { sRGBHex } = await new EyeDropperConstructor().open();
  if (!sRGBHex) throw new Error('No screen color was selected.');
  return sRGBHex;
}

function localize(root) {
  const language = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  root?.querySelectorAll('[data-en]').forEach((element) => { element.textContent = element.dataset[language] || element.dataset.en; });
  return language;
}

function setupTimestamp() {
  const input = document.querySelector('#timestamp-input'); const output = document.querySelector('#timestamp-output'); const status = document.querySelector('#timestamp-status');
  const render = (mode) => { try { if (mode === 'timestamp') { output.textContent = String(dateToTimestamp(input.value)); } else { const details = formatTimestampDetails(input.value); output.textContent = `UTC       ${details.utc}\nLocal     ${details.local}\nISO       ${details.iso}\nRelative  ${details.relative}`; } status.textContent = 'Done. Your result is ready.'; status.dataset.status = 'success'; } catch (error) { output.textContent = ''; status.textContent = error.message; status.dataset.status = 'error'; } };
  document.querySelector('[data-action="to-date"]')?.addEventListener('click', () => render('date'));
  document.querySelector('[data-action="to-timestamp"]')?.addEventListener('click', () => render('timestamp'));
}

function setupTimezone() {
  const input = document.querySelector('#timezone-input'); const output = document.querySelector('#timezone-output'); const status = document.querySelector('#timezone-status');
  const getZones = () => [...document.querySelectorAll('[data-timezone-select]')].map((select) => select.value);
  const render = () => { try { const summary = formatTimezoneSummary(input.value, getZones()); output.textContent = summary.map((result) => `${result.timeZone}\n  ${result.date} ${result.time} (${result.zone})`).join('\n\n'); status.textContent = 'Done. Your result is ready.'; status.dataset.status = 'success'; return output.textContent; } catch (error) { output.textContent = ''; status.textContent = error.message; status.dataset.status = 'error'; return ''; } };
  document.querySelector('[data-action="convert-timezone"]')?.addEventListener('click', render); document.querySelector('[data-action="copy-timezone"]')?.addEventListener('click', async () => { const text = render(); if (!text) return; try { await navigator.clipboard.writeText(text); status.textContent = 'Summary copied to clipboard.'; } catch { status.textContent = 'Copy failed. Select the summary and copy it manually.'; } }); render();
}

function setupContrast() {
  const foreground = document.querySelector('#contrast-foreground'); const background = document.querySelector('#contrast-background'); const output = document.querySelector('#contrast-output'); const preview = document.querySelector('#contrast-preview'); const status = document.querySelector('#contrast-status');
  const copy = (en, ko) => document.documentElement.lang === 'ko' ? ko : en;
  const paintPreview = () => { preview.style.color = foreground.value; preview.style.backgroundColor = background.value; };
  const render = () => { try { output.textContent = formatContrastResult(contrastRatio(foreground.value, background.value), document.documentElement.lang); status.textContent = copy('Done. Your result is ready.', '완료했습니다. 결과를 확인하세요.'); status.dataset.status = 'success'; } catch (error) { output.textContent = ''; status.textContent = error.message; status.dataset.status = 'error'; } };
  const pick = async (input) => {
    try {
      input.value = await pickScreenColor();
      paintPreview();
      render();
      status.textContent = copy('Screen color applied and contrast result updated.', '화면 색상을 적용하고 대비 결과를 갱신했습니다.');
      status.dataset.status = 'success';
    } catch (error) {
      const cancelled = error?.name === 'AbortError';
      status.textContent = cancelled ? copy('Color selection cancelled.', '색상 선택을 취소했습니다.') : error.message;
      status.dataset.status = cancelled ? 'idle' : 'error';
    }
  };
  foreground.addEventListener('input', paintPreview); background.addEventListener('input', paintPreview);
  document.querySelector('[data-action="check-contrast"]')?.addEventListener('click', render);
  document.querySelector('[data-action="pick-foreground"]')?.addEventListener('click', () => pick(foreground));
  document.querySelector('[data-action="pick-background"]')?.addEventListener('click', () => pick(background));
  document.querySelector('[data-page-language]')?.addEventListener('click', () => setTimeout(render, 0));
  paintPreview(); render();
}

function setupColor() {
  const input = document.querySelector('#color-input'); const output = document.querySelector('#color-output'); const status = document.querySelector('#color-status');
  const render = () => { try { const result = convertColor(input.value); output.textContent = `HEX  ${result.hex}\nRGB  ${result.rgb}\nHSL  ${result.hsl}`; status.textContent = 'Done. Your result is ready.'; status.dataset.status = 'success'; } catch (error) { output.textContent = ''; status.textContent = error.message; status.dataset.status = 'error'; } };
  document.querySelector('[data-action="convert-color"]')?.addEventListener('click', render); render();
}

if (typeof document !== 'undefined') {
  initializeToolPage();
  const root = document.querySelector('[data-tool-root]');
  const rerenderLanguage = () => localize(root);
  rerenderLanguage();
  document.querySelector('[data-page-language]')?.addEventListener('click', () => setTimeout(rerenderLanguage, 0));
  if (document.querySelector('#timestamp-input')) setupTimestamp();
  if (document.querySelector('#timezone-input')) setupTimezone();
  if (document.querySelector('#contrast-foreground')) setupContrast();
  if (document.querySelector('#color-input')) setupColor();
}
