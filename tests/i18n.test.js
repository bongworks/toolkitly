import test from 'node:test';
import assert from 'node:assert/strict';

import { getCopy } from '../assets/js/i18n.js';

test('JSON formatter page has localized Korean and English action copy', () => {
  assert.equal(getCopy('en', 'formatterFormat'), 'Format JSON');
  assert.equal(getCopy('ko', 'formatterFormat'), 'JSON 포맷');
  assert.equal(getCopy('ko', 'formatterPrivacyTitle'), '기본값은 비공개입니다.');
});
