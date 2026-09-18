import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { getCopy } from '../assets/js/i18n.js';

test('static SEO and privacy files exist and describe browser-local processing', async () => {
  const files = ['robots.txt', 'sitemap.xml', 'privacy.html'];
  await Promise.all(files.map((file) => access(file)));

  const privacyPage = await readFile('privacy.html', 'utf8');
  assert.match(privacyPage, /processed only in your browser/i);
  assert.match(privacyPage, /data-i18n="privacyInputText"/);
  assert.match(privacyPage, /data-i18n="privacyAnalyticsText"/);
  assert.match(privacyPage, /data-i18n="privacyAdsText"/);
  assert.equal(getCopy('ko', 'privacyInputText'), '현재 제공되는 도구에 입력한 JSON과 기타 값은 브라우저 안에서만 처리됩니다. Toolkitly는 이 입력값을 업로드, 저장 또는 판매하지 않습니다.');
  assert.match(getCopy('en', 'privacyAnalyticsText'), /14 months/);
  assert.match(getCopy('ko', 'privacyAdsText'), /Google AdSense/);
});

test('sitemap contains the public home and JSON formatter paths', async () => {
  const sitemap = await readFile('sitemap.xml', 'utf8');

  assert.match(sitemap, /https:\/\/example\.com\//);
  assert.match(sitemap, /https:\/\/example\.com\/tools\/json-formatter\.html/);
});
