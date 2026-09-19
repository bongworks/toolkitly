import test from 'node:test';
import assert from 'node:assert/strict';

import { getCopy, resolveLanguage } from '../assets/js/i18n.js';
import { applySeoDocumentCopy, localePathFor } from '../assets/js/seo-copy.js';

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

test('localePathFor switches between matching English and Korean static paths', () => {
  assert.equal(localePathFor('/tools/json-formatter.html', 'ko'), '/ko/tools/json-formatter.html');
  assert.equal(localePathFor('/ko/tools/json-formatter.html', 'en'), '/tools/json-formatter.html');
  assert.equal(localePathFor('/', 'ko'), '/ko/');
});

test('SEO copy replaces translated tool headings after the normal page copy renders', () => {
  const heading = { textContent: '' };
  const lead = { textContent: '' };
  const description = { content: '' };
  const document = {
    title: '',
    location: { pathname: '/ko/tools/json-formatter.html' },
    querySelector(selector) {
      return {
        '.tool-heading h1': heading,
        '.tool-heading h1 + p': lead,
        'meta[name="description"]': description,
      }[selector] ?? null;
    },
  };

  applySeoDocumentCopy(document, 'ko');

  assert.equal(heading.textContent, 'JSON 포맷터·검증기 — JSON 정리·압축');
  assert.match(lead.textContent, /문법을 검증하거나 압축/);
  assert.match(document.title, /JSON 포맷터·검증기/);
  assert.match(description.content, /무료 온라인 JSON 포맷터/);
});
