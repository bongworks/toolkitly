import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timestampToDate,
  dateToTimestamp,
  getTimeZoneParts,
  contrastRatio,
  contrastRating,
  convertColor
} from '../assets/js/time-design-tools.js';

test('timestampToDate handles seconds and milliseconds', () => {
  assert.equal(timestampToDate('0').toISOString(), '1970-01-01T00:00:00.000Z');
  assert.equal(timestampToDate('1704067200000').toISOString(), '2024-01-01T00:00:00.000Z');
});

test('dateToTimestamp converts ISO dates to seconds', () => {
  assert.equal(dateToTimestamp('2024-01-01T00:00:00.000Z'), 1704067200);
});

test('getTimeZoneParts formats a known instant with Intl', () => {
  const parts = getTimeZoneParts('2024-01-01T00:00:00.000Z', 'America/Los_Angeles');
  assert.equal(parts.timeZone, 'America/Los_Angeles');
  assert.equal(parts.date, '12/31/2023');
  assert.match(parts.time, /16:00/);
});

test('contrast ratio of black and white is 21', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
});

test('contrast rating follows WCAG AA and AAA boundaries', () => {
  assert.deepEqual(contrastRating(7), { normalAA: true, largeAA: true, normalAAA: true, largeAAA: true });
  assert.deepEqual(contrastRating(4.5), { normalAA: true, largeAA: true, normalAAA: false, largeAAA: true });
  assert.deepEqual(contrastRating(3), { normalAA: false, largeAA: true, normalAAA: false, largeAAA: false });
});

test('convertColor supports HEX, RGB and HSL', () => {
  assert.deepEqual(convertColor('#ff0000'), { hex: '#ff0000', rgb: 'rgb(255, 0, 0)', hsl: 'hsl(0, 100%, 50%)' });
  assert.deepEqual(convertColor('rgb(0, 128, 255)').hex, '#0080ff');
  assert.deepEqual(convertColor('hsl(120, 100%, 50%)').rgb, 'rgb(0, 255, 0)');
});
