import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { buildSite } from '../scripts/build-site.js';

async function writeFixture(rootDir, relativePath, contents) {
  const destination = join(rootDir, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents, { recursive: true });
}

async function createSiteFixture() {
  const rootDir = await mkdtemp(join(tmpdir(), 'toolkitly-build-'));
  const outputDir = join(rootDir, 'dist');
  await writeFixture(rootDir, 'index.html', `<!doctype html><html><head><title>Toolkitly | Private tools</title><meta name="description" content="Private utilities."></head><body>Home</body></html>`);
  await writeFixture(rootDir, 'tools/json.html', `<!doctype html><html><head><title>JSON Tool | Toolkitly</title><meta name="description" content="Format JSON locally."></head><body>Tool</body></html>`);
  await writeFixture(rootDir, 'privacy.html', `<!doctype html><html><head><title>Privacy | Toolkitly</title><meta name="description" content="Privacy details."></head><body>Privacy</body></html>`);
  await writeFixture(rootDir, 'assets/css/site.css', 'body { color: green; }');
  await writeFixture(rootDir, 'robots.txt', 'Sitemap: https://example.com/sitemap.xml\n');
  await writeFixture(rootDir, 'sitemap.xml', '<loc>https://example.com/tools/json.html</loc>\n');
  return { rootDir, outputDir };
}

test('buildSite exposes only valid public IDs in runtime configuration', async (t) => {
  const { rootDir, outputDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));

  await buildSite({
    rootDir,
    outputDir,
    env: {
      GA4_MEASUREMENT_ID: ' not-a-measurement-id ',
      ADSENSE_CLIENT_ID: 'ca-pub-not-a-number',
      SECRET_API_KEY: 'must-not-be-public',
    },
  });

  const config = await readFile(join(outputDir, 'assets/js/runtime-config.js'), 'utf8');
  assert.match(config, /window\.__TOOLKITLY_CONFIG__/);
  assert.match(config, /"ga4MeasurementId":null/);
  assert.match(config, /"adsenseClientId":null/);
  assert.match(config, /"googleConsentRequired":false/);
  assert.doesNotMatch(config, /must-not-be-public/);
});

test('buildSite enables the public consent requirement only for the literal true setting', async (t) => {
  const { rootDir, outputDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));

  await buildSite({ rootDir, outputDir, env: { GOOGLE_CONSENT_REQUIRED: 'true' } });

  const config = await readFile(join(outputDir, 'assets/js/runtime-config.js'), 'utf8');
  assert.match(config, /"googleConsentRequired":true/);
});

test('buildSite transforms pages with canonical social metadata and page-specific schema', async (t) => {
  const { rootDir, outputDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));

  const generatedPages = await buildSite({
    rootDir,
    outputDir,
    env: {
      PUBLIC_SITE_URL: 'https://tools.example.test/',
      GA4_MEASUREMENT_ID: 'G-AB12CD34',
      ADSENSE_CLIENT_ID: 'ca-pub-1234567890123456',
    },
  });

  assert.deepEqual(generatedPages, ['index.html', 'privacy.html', 'tools/json.html']);
  const home = await readFile(join(outputDir, 'index.html'), 'utf8');
  const tool = await readFile(join(outputDir, 'tools/json.html'), 'utf8');
  const privacy = await readFile(join(outputDir, 'privacy.html'), 'utf8');

  assert.match(home, /<link rel="canonical" href="https:\/\/tools\.example\.test\/" \/>/);
  assert.match(home, /<meta property="og:url" content="https:\/\/tools\.example\.test\/" \/>/);
  assert.match(home, /<meta name="twitter:card" content="summary" \/>/);
  assert.match(home, /"@type":"WebSite"/);
  assert.match(home, /<script type="module" src="assets\/js\/site-integrations\.js"><\/script>/);

  assert.match(tool, /<link rel="canonical" href="https:\/\/tools\.example\.test\/tools\/json\.html" \/>/);
  assert.match(tool, /"@type":"WebApplication"/);
  assert.match(tool, /"@type":"BreadcrumbList"/);
  assert.match(tool, /<script type="module" src="\.\.\/assets\/js\/site-integrations\.js"><\/script>/);
  assert.doesNotMatch(privacy, /"@type":"WebApplication"/);
  assert.doesNotMatch(privacy, /"@type":"WebSite"/);
});

test('buildSite replaces placeholder origins and defaults blank public settings safely', async (t) => {
  const { rootDir, outputDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));

  await buildSite({
    rootDir,
    outputDir,
    env: {
      PUBLIC_SITE_URL: '   ',
      GA4_MEASUREMENT_ID: '',
      ADSENSE_CLIENT_ID: '',
    },
  });

  const robots = await readFile(join(outputDir, 'robots.txt'), 'utf8');
  const sitemap = await readFile(join(outputDir, 'sitemap.xml'), 'utf8');
  const config = await readFile(join(outputDir, 'assets/js/runtime-config.js'), 'utf8');
  assert.match(robots, /https:\/\/tools\.bongworks\.co\.kr\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/tools\.bongworks\.co\.kr\/tools\/json\.html/);
  assert.doesNotMatch(`${robots}${sitemap}`, /example\.com/);
  assert.match(config, /"ga4MeasurementId":null/);
  assert.match(config, /"adsenseClientId":null/);
});

test('buildSite rejects the source root, its ancestors, and source files but permits descendant deployment directories', async (t) => {
  const { rootDir } = await createSiteFixture();
  const parentDir = dirname(rootDir);
  t.after(() => rm(rootDir, { recursive: true, force: true }));

  await assert.rejects(
    buildSite({ rootDir, outputDir: rootDir, env: {} }),
    /outputDir must not be the site root, an ancestor, or a source directory or file/,
  );
  await assert.rejects(
    buildSite({ rootDir, outputDir: parentDir, env: {} }),
    /outputDir must not be the site root, an ancestor, or a source directory or file/,
  );
  await assert.rejects(
    buildSite({ rootDir, outputDir: join(rootDir, 'index.html'), env: {} }),
    /outputDir must not be the site root, an ancestor, or a source directory or file/,
  );
});

test('buildSite rejects an existing source directory instead of deleting it as output', async (t) => {
  const { rootDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  await writeFixture(rootDir, 'assets/js/runtime-config.js', 'window.__TOOLKITLY_CONFIG__ = {};\n');
  await writeFixture(rootDir, 'assets/assets/js/runtime-config.js', 'window.__TOOLKITLY_CONFIG__ = {};\n');

  await assert.rejects(
    buildSite({ rootDir, outputDir: join(rootDir, 'assets'), env: {} }),
    /outputDir must not be the site root, an ancestor, or a source directory or file/,
  );
  assert.equal(await readFile(join(rootDir, 'assets/css/site.css'), 'utf8'), 'body { color: green; }');
});

test('buildSite rejects source HTML directories even when their output marker is forged', async (t) => {
  const { rootDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  await writeFixture(rootDir, 'tools/assets/js/runtime-config.js', 'window.__TOOLKITLY_CONFIG__ = {};\n');
  await writeFixture(rootDir, 'tools/json.html', '<!doctype html><html><head><link rel="canonical" href="https://tools.example.test/tools/json.html" /></head><body><script type="module" src="../assets/js/site-integrations.js"></script></body></html>');
  await writeFixture(rootDir, 'tools/source-sentinel.txt', 'keep tools source');

  await assert.rejects(
    buildSite({ rootDir, outputDir: join(rootDir, 'tools'), env: {} }),
    /outputDir must not be the site root, an ancestor, or a source directory or file/,
  );
  assert.equal(await readFile(join(rootDir, 'tools/source-sentinel.txt'), 'utf8'), 'keep tools source');
});

test('buildSite rejects output paths nested under required assets input', async (t) => {
  const { rootDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  await writeFixture(rootDir, 'assets/js/sentinel.txt', 'keep assets source');
  await writeFixture(rootDir, 'assets/js/index.html', '<!doctype html><html><head><link rel="canonical" href="https://tools.example.test/" /></head><body><script type="module" src="assets/js/site-integrations.js"></script></body></html>');
  await writeFixture(rootDir, 'assets/js/assets/js/runtime-config.js', 'window.__TOOLKITLY_CONFIG__ = {};\n');

  await assert.rejects(
    buildSite({ rootDir, outputDir: join(rootDir, 'assets/js'), env: {} }),
    /outputDir must not be the site root, an ancestor, or a source directory or file/,
  );
  assert.equal(await readFile(join(rootDir, 'assets/js/sentinel.txt'), 'utf8'), 'keep assets source');
});

test('buildSite decodes source entities before emitting metadata and schema', async (t) => {
  const { rootDir, outputDir } = await createSiteFixture();
  t.after(() => rm(rootDir, { recursive: true, force: true }));
  await writeFixture(rootDir, 'tools/entities.html', `<!doctype html><html><head><title>AT&amp;T Tool | Toolkitly</title><meta name="description" content="Format A &amp; B locally."></head><body>Tool</body></html>`);

  await buildSite({ rootDir, outputDir, env: {} });

  const page = await readFile(join(outputDir, 'tools/entities.html'), 'utf8');
  assert.match(page, /<meta property="og:title" content="AT&amp;T Tool \| Toolkitly" \/>/);
  assert.match(page, /<meta property="og:description" content="Format A &amp; B locally\." \/>/);
  assert.doesNotMatch(page, /&amp;amp;/);
  assert.match(page, /"name":"AT&T Tool"/);
  assert.match(page, /"description":"Format A & B locally\."/);
});

test('buildSite excludes a custom descendant output directory during repeated page discovery', async (t) => {
  const { rootDir } = await createSiteFixture();
  const outputDir = join(rootDir, 'generated');
  t.after(() => rm(rootDir, { recursive: true, force: true }));

  await buildSite({ rootDir, outputDir, env: {} });
  const generatedPages = await buildSite({ rootDir, outputDir, env: {} });

  assert.deepEqual(generatedPages, ['index.html', 'privacy.html', 'tools/json.html']);
  assert.match(await readFile(join(outputDir, 'index.html'), 'utf8'), /rel="canonical"/);
});
