import test from 'node:test';
import assert from 'node:assert/strict';

import { getCopy, resolveLanguage } from '../assets/js/i18n.js';

test('JSON formatter page has localized Korean and English action copy', () => {
  assert.equal(getCopy('en', 'formatterFormat'), 'Format JSON');
  assert.equal(getCopy('ko', 'formatterFormat'), 'JSON 포맷');
  assert.equal(getCopy('ko', 'formatterPrivacyTitle'), '기본값은 비공개입니다.');
});

test('resolveLanguage prefers an explicit saved choice over the device language', () => {
  assert.equal(resolveLanguage('en', ['ko-KR', 'en-US']), 'en');
  assert.equal(resolveLanguage('ko', ['en-US']), 'ko');
});

test('resolveLanguage defaults Korean devices to Korean and other devices to English', () => {
  assert.equal(resolveLanguage(null, ['ko-KR', 'en-US']), 'ko');
  assert.equal(resolveLanguage(null, ['en-US', 'ko-KR']), 'en');
  assert.equal(resolveLanguage(null, ['ja-JP']), 'en');
});
