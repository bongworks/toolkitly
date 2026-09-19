import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timestampToDate,
  dateToTimestamp,
  getTimeZoneParts,
  formatTimestampDetails,
  formatTimezoneSummary,
  contrastRatio,
  contrastRating,
  formatContrastResult,
  pickScreenColor,
  convertColor
} from '../assets/js/time-design-tools.js';

test('timestampToDate handles seconds and milliseconds', () => {
  assert.equal(timestampToDate('0').toISOString(), '1970-01-01T00:00:00.000Z');
  assert.equal(timestampToDate('1704067200000').toISOString(), '2024-01-01T00:00:00.000Z');
});

test('dateToTimestamp converts ISO dates to seconds', () => {
  assert.equal(dateToTimestamp('2024-01-01T00:00:00.000Z'), 1704067200);
});

test('formatTimestampDetails includes UTC, local, ISO, and relative values', () => {
  const details = formatTimestampDetails('1704067200', new Date('2024-01-01T01:00:00.000Z'));
  assert.equal(details.iso, '2024-01-01T00:00:00.000Z');
  assert.match(details.utc, /2024/);
  assert.match(details.local, /2024/);
  assert.equal(details.relative, '1 hour ago');
});

test('getTimeZoneParts formats a known instant with Intl', () => {
  const parts = getTimeZoneParts('2024-01-01T00:00:00.000Z', 'America/Los_Angeles');
  assert.equal(parts.timeZone, 'America/Los_Angeles');
  assert.equal(parts.date, '12/31/2023');
  assert.match(parts.time, /16:00/);
});

test('formatTimezoneSummary returns all selected zones', () => {
  const summary = formatTimezoneSummary('2024-01-01T00:00:00.000Z', ['UTC', 'Asia/Seoul', 'America/New_York']);
  assert.equal(summary.length, 3);
  assert.deepEqual(summary.map((entry) => entry.timeZone), ['UTC', 'Asia/Seoul', 'America/New_York']);
  assert.match(summary[1].time, /09:00/);
});

test('contrast ratio of black and white is 21', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
});

test('contrast rating follows WCAG AA and AAA boundaries', () => {
  assert.deepEqual(contrastRating(7), { normalAA: true, largeAA: true, normalAAA: true, largeAAA: true, nonTextAA: true, nonTextAAA: true });
  assert.deepEqual(contrastRating(4.5), { normalAA: true, largeAA: true, normalAAA: false, largeAAA: true, nonTextAA: true, nonTextAAA: true });
  assert.deepEqual(contrastRating(3), { normalAA: false, largeAA: true, normalAAA: false, largeAAA: false, nonTextAA: true, nonTextAAA: false });
});

test('contrast results use the active page language', () => {
  assert.match(formatContrastResult(4.5, 'en'), /Normal AA Pass/);
  assert.match(formatContrastResult(4.5, 'ko'), /일반 텍스트 AA 통과/);
  assert.match(formatContrastResult(4.5, 'ko'), /SVG·그래픽 아이콘 AAA 통과/);
});

test('screen color picker returns the selected screen color', async () => {
  class EyeDropper {
    open() {
      return Promise.resolve({ sRGBHex: '#123abc' });
    }
  }

  assert.equal(await pickScreenColor(EyeDropper), '#123abc');
});

test('screen color picker reports unsupported browsers', async () => {
  await assert.rejects(() => pickScreenColor(undefined), /not supported/i);
});

test('convertColor supports HEX, RGB and HSL', () => {
  assert.deepEqual(convertColor('#ff0000'), { hex: '#ff0000', rgb: 'rgb(255, 0, 0)', hsl: 'hsl(0, 100%, 50%)' });
  assert.deepEqual(convertColor('rgb(0, 128, 255)').hex, '#0080ff');
  assert.deepEqual(convertColor('hsl(120, 100%, 50%)').rgb, 'rgb(0, 255, 0)');
});
