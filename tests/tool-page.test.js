import test from 'node:test';
import assert from 'node:assert/strict';

import { formatLocalizedStatus } from '../assets/js/tool-page.js';

test('formatLocalizedStatus returns localized success feedback', () => {
  assert.equal(formatLocalizedStatus('en', 'success'), 'Done. Your result is ready.');
  assert.equal(formatLocalizedStatus('ko', 'success'), '완료했습니다. 결과를 확인하세요.');
});
