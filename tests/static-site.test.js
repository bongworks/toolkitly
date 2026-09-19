import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { getCopy } from '../assets/js/i18n.js';
import { buildSite } from '../scripts/build-site.js';

const NON_PUBLIC_DIRECTORIES = new Set(['.git', '.superpowers', '.worktrees', 'dist', 'docs', 'node_modules', 'scripts', 'tests']);

async function publicHtmlPages(rootDir, relativeDir = '') {
  const pages = [];
  for (const entry of await readdir(join(rootDir, relativeDir), { withFileTypes: true })) {
    const path = join(relativeDir, entry.name);
    if (entry.isDirectory() && !NON_PUBLIC_DIRECTORIES.has(entry.name)) {
      pages.push(...await publicHtmlPages(rootDir, path));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      pages.push(path);
    }
  }
  return pages.sort();
}

test('static SEO and privacy files exist and describe browser-local processing', async () => {
  const files = ['robots.txt', 'sitemap.xml', 'privacy.html', 'favicon.svg'];
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

test('README distinguishes browser-local tools from optional remote Google integrations', async () => {
  const readme = await readFile('README.md', 'utf8');

  assert.match(readme, /When optional Google integrations are not configured, the project has no remote font\/script requests\./);
  assert.match(readme, /Tool inputs stay in the browser by default\./);
});

test('sitemap contains the public home and JSON formatter paths', async () => {
  const sitemap = await readFile('sitemap.xml', 'utf8');

  assert.match(sitemap, /https:\/\/example\.com\//);
  assert.match(sitemap, /https:\/\/example\.com\/tools\/json-formatter\.html/);
});

test('P1 pages are represented in the sitemap and use only local scripts', async () => {
  const p1Pages = ['json-diff.html', 'jwt-inspector.html', 'regex-tester.html', 'crypto-lab.html', 'hash-generator.html', 'uuid-ulid-generator.html'];
  const sitemap = await readFile('sitemap.xml', 'utf8');
  const pages = await Promise.all(p1Pages.map((page) => readFile(`tools/${page}`, 'utf8')));

  for (const page of p1Pages) assert.match(sitemap, new RegExp(`https://example\\.com/tools/${page.replace('.', '\\.')}`));
  for (const page of pages) assert.doesNotMatch(page, /<script[^>]+src=["']https?:\/\//i);
});

test('JSON formatter language control routes to the matching static locale', async () => {
  const formatter = await readFile('tools/json-formatter.html', 'utf8');

  assert.match(formatter, /import \{ localePathFor \} from '\.\.\/assets\/js\/seo-copy\.js';/);
  assert.match(formatter, /window\.location\.assign\(localePathFor\(window\.location\.pathname, nextLanguage\)\)/);
});

test('contrast checker groups each color with its picker and lightness control', async () => {
  const page = await readFile('tools/contrast-checker.html', 'utf8');
  const backgroundStart = page.indexOf('class="contrast-color-group contrast-background-group"');
  const backgroundLightness = page.indexOf('id="contrast-background-lightness"');
  const foregroundStart = page.indexOf('class="contrast-color-group contrast-foreground-group"');
  const foregroundLightness = page.indexOf('id="contrast-foreground-lightness"');

  assert.ok(backgroundStart >= 0);
  assert.ok(backgroundStart < backgroundLightness);
  assert.ok(backgroundLightness < foregroundStart);
  assert.ok(foregroundStart < foregroundLightness);
  assert.doesNotMatch(page, /eyedropper-button/);
  const resultPanel = page.slice(page.indexOf('class="contrast-result-panel"'));
  assert.doesNotMatch(resultPanel, /24px 미만|24px 이상|18\.67px/);
  assert.match(page, /접근성 명암비[\s\S]*접근성 대비/);
  assert.match(page, /대형 텍스트 미리보기/);
  assert.match(page, /<circle[^>]+fill="currentColor"/);
  assert.match(page, /<path[^>]+d="M12 4 20 20H4Z"/);
  assert.match(page, /<rect[^>]+fill="currentColor"/);
  assert.doesNotMatch(page, /contrast-preview-button/);
});

test('production build transforms every public page without placeholder origins or remote source scripts', async (t) => {
  const rootDir = process.cwd();
  const tempDir = await mkdtemp(join(tmpdir(), 'toolkitly-static-site-'));
  const outputDir = join(tempDir, 'dist');
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const sourcePages = await publicHtmlPages(rootDir);
  const generatedPages = await buildSite({
    rootDir,
    outputDir,
    env: {
      PUBLIC_SITE_URL: 'https://tools.bongworks.co.kr',
      GA4_MEASUREMENT_ID: '',
      ADSENSE_CLIENT_ID: '',
      GOOGLE_CONSENT_REQUIRED: 'false',
    },
  });

  const localizedPages = sourcePages.map((pagePath) => join('ko', pagePath));
  assert.deepEqual(generatedPages, [...sourcePages, ...localizedPages].sort());

  const generatedHtml = await Promise.all(sourcePages.map(async (pagePath) => {
    const source = await readFile(join(rootDir, pagePath), 'utf8');
    assert.doesNotMatch(source, /<script[^>]+src=["']https?:\/\//i, `${pagePath} source script must remain local`);

    const outputPath = join(outputDir, pagePath);
    const page = await readFile(outputPath, 'utf8');
    assert.match(page, /<link rel="canonical" href="https:\/\/tools\.bongworks\.co\.kr(?:\/[^"?#]*)?" \/>/, `${pagePath} canonical origin`);
    assert.match(page, /<link rel="icon" href="(?:\.\.\/)?favicon\.svg" type="image\/svg\+xml" \/>/, `${pagePath} favicon link`);

    const integrationReferences = [...page.matchAll(/<script\s+type="module"\s+src="([^"]*site-integrations\.js)"><\/script>/g)];
    assert.equal(integrationReferences.length, 1, `${pagePath} has one shared integration module`);
    await access(resolve(dirname(outputPath), integrationReferences[0][1]));
    return page;
  }));

  const runtimeConfig = await readFile(join(outputDir, 'assets/js/runtime-config.js'), 'utf8');
  await access(join(outputDir, 'favicon.svg'));
  const configMatch = runtimeConfig.match(/^window\.__TOOLKITLY_CONFIG__ = (\{.*\});\n$/);
  assert.ok(configMatch, 'generated runtime configuration uses the public config assignment');
  assert.deepEqual(Object.keys(JSON.parse(configMatch[1])).sort(), [
    'adsenseClientId',
    'ga4MeasurementId',
    'googleConsentRequired',
  ]);

  const robots = await readFile(join(outputDir, 'robots.txt'), 'utf8');
  const sitemap = await readFile(join(outputDir, 'sitemap.xml'), 'utf8');
  assert.doesNotMatch(`${robots}${sitemap}`, /example\.com/i);
  for (const page of generatedHtml) {
    assert.doesNotMatch(page, /rel="canonical" href="https:\/\/example\.com/i);
    assert.doesNotMatch(page, /property="og:url" content="https:\/\/example\.com/i);
    assert.doesNotMatch(page, /"url":"https:\/\/example\.com/i);
  }

  const englishHome = await readFile(join(outputDir, 'index.html'), 'utf8');
  const koreanHome = await readFile(join(outputDir, 'ko/index.html'), 'utf8');
  const englishFormatter = await readFile(join(outputDir, 'tools/json-formatter.html'), 'utf8');
  const koreanFormatter = await readFile(join(outputDir, 'ko/tools/json-formatter.html'), 'utf8');
  assert.match(englishHome, /href="tools\/json-formatter\.html"/);
  assert.match(koreanHome, /<html lang="ko"/);
  assert.match(koreanFormatter, /rel="canonical" href="https:\/\/tools\.bongworks\.co\.kr\/ko\/tools\/json-formatter\.html"/);
  assert.match(englishFormatter, /hreflang="ko" href="https:\/\/tools\.bongworks\.co\.kr\/ko\/tools\/json-formatter\.html"/);
  assert.match(koreanFormatter, /JSON 포맷터·검증기 — JSON 정리·압축/);
});

test('localized tool pages expose localized WebPage and WebApplication schema', async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), 'toolkitly-localized-schema-'));
  const outputDir = join(tempDir, 'dist');
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await buildSite({
    rootDir: process.cwd(),
    outputDir,
    env: { PUBLIC_SITE_URL: 'https://tools.bongworks.co.kr' },
  });

  const page = await readFile(join(outputDir, 'ko/tools/contrast-checker.html'), 'utf8');
  const englishPage = await readFile(join(outputDir, 'tools/contrast-checker.html'), 'utf8');
  const schemaMatch = page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.match(englishPage, /<html lang="en"/);
  assert.match(englishPage, /data-en="Background color" data-ko="배경색">Background color<\/span>/);
  assert.match(englishPage, /How to use the color contrast checker and WCAG criteria/);
  assert.match(page, /data-en="Background color" data-ko="배경색">배경색<\/span>/);
  assert.match(page, /색상 대비 검사기 사용 방법과 WCAG 기준/);
  assert.match(page, /href="color-converter\.html"/);
  assert.match(page, /<title>색상 대비 검사기 — WCAG 명암비·접근성 대비 \| Toolkitly<\/title>/);
  assert.match(page, /배경색·텍스트 색상과 명도를 조절해 WCAG AA·AAA 접근성 대비와 명암비를 확인/);
  assert.ok(schemaMatch, 'Korean tool page has JSON-LD');
  const graph = JSON.parse(schemaMatch[1])['@graph'];
  assert.ok(graph.some((item) => item['@type'] === 'WebPage' && item.inLanguage === 'ko'));
  assert.ok(graph.some((item) => item['@type'] === 'WebApplication' && item.inLanguage === 'ko'));
});
