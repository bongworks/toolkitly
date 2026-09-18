import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('static SEO and privacy files exist and describe browser-local processing', async () => {
  const files = ['robots.txt', 'sitemap.xml', 'privacy.html'];
  await Promise.all(files.map((file) => access(file)));

  const privacyPage = await readFile('privacy.html', 'utf8');
  assert.match(privacyPage, /processed only in your browser/i);
  assert.match(privacyPage, /브라우저 안에서만 처리됩니다/);
  assert.match(privacyPage, /업로드, 저장 또는 판매하지 않습니다/);
});

test('sitemap contains the public home and JSON formatter paths', async () => {
  const sitemap = await readFile('sitemap.xml', 'utf8');

  assert.match(sitemap, /https:\/\/example\.com\//);
  assert.match(sitemap, /https:\/\/example\.com\/tools\/json-formatter\.html/);
});
