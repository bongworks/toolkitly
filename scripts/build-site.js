import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

const DEFAULT_ORIGIN = 'https://tools.bongworks.co.kr';
const GA4_MEASUREMENT_ID = /^G-[A-Z0-9]+$/;
const ADSENSE_CLIENT_ID = /^ca-pub-\d+$/;
const SKIPPED_DIRECTORIES = new Set(['.git', '.superpowers', '.worktrees', 'dist', 'docs', 'node_modules', 'scripts', 'tests']);

function nonBlank(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function publicOrigin(value) {
  const candidate = nonBlank(value) ?? DEFAULT_ORIGIN;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Unsupported origin protocol');
    return url.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function publicConfig(env) {
  const ga4MeasurementId = nonBlank(env.GA4_MEASUREMENT_ID);
  const adsenseClientId = nonBlank(env.ADSENSE_CLIENT_ID);
  return {
    ga4MeasurementId: ga4MeasurementId && GA4_MEASUREMENT_ID.test(ga4MeasurementId) ? ga4MeasurementId : null,
    adsenseClientId: adsenseClientId && ADSENSE_CLIENT_ID.test(adsenseClientId) ? adsenseClientId : null,
    googleConsentRequired: env.GOOGLE_CONSENT_REQUIRED === 'true',
  };
}

async function readDotEnv(rootDir) {
  try {
    const contents = await readFile(join(rootDir, '.env'), 'utf8');
    return Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || line.trimStart().startsWith('#')) return [];
      const [, key, rawValue] = match;
      const value = rawValue.replace(/^(["'])(.*)\1$/, '$2');
      return [[key, value]];
    }));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function isWithin(path, possibleParent) {
  const pathFromParent = relative(possibleParent, path);
  return pathFromParent === '' || (!pathFromParent.startsWith('..') && !isAbsolute(pathFromParent));
}

async function findHtmlPages(rootDir, outputDir, relativeDir = '') {
  const entries = await readdir(join(rootDir, relativeDir), { withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    const entryPath = join(rootDir, relativeDir, entry.name);
    if (outputDir && resolve(entryPath) === outputDir) continue;
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) pages.push(...await findHtmlPages(rootDir, outputDir, join(relativeDir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      pages.push(join(relativeDir, entry.name));
    }
  }
  return pages.sort();
}

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function decodeHtmlEntities(value) {
  const namedEntities = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: '\u00a0', quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, reference) => {
    if (reference.startsWith('#')) {
      const codePoint = Number.parseInt(reference.slice(reference[1].toLowerCase() === 'x' ? 2 : 1), reference[1].toLowerCase() === 'x' ? 16 : 10);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    return namedEntities[reference.toLowerCase()];
  });
}

function pageUrl(origin, pagePath) {
  return new URL(pagePath === 'index.html' ? '/' : pagePath, `${origin}/`).href;
}

function metadataFor({ title, description, url, pagePath }) {
  const faviconPath = relative(dirname(pagePath), 'favicon.svg').replace(/\\/g, '/');
  const shared = [
    `<link rel="icon" href="${faviconPath}" type="image/svg+xml" />`,
    `<link rel="canonical" href="${escapeAttribute(url)}" />`,
    `<meta property="og:title" content="${escapeAttribute(title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(url)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeAttribute(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}" />`,
  ];
  let schema = null;
  if (pagePath === 'index.html') {
    schema = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Toolkitly', url };
  } else if (pagePath.startsWith('tools/')) {
    const name = title.replace(/\s*\|\s*Toolkitly\s*$/i, '');
    schema = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebApplication', name, description, url, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any' },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Toolkitly', item: new URL('/', url).href },
          { '@type': 'ListItem', position: 2, name, item: url },
        ] },
      ],
    };
  }
  if (schema) shared.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
  return shared.join('\n    ');
}

function transformHtml(source, { origin, pagePath }) {
  const title = decodeHtmlEntities(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim() ?? 'Toolkitly');
  const description = decodeHtmlEntities(source.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']\s*\/?\s*>/i)?.[1] ?? '');
  const url = pageUrl(origin, pagePath);
  const metadata = metadataFor({ title, description, url, pagePath });
  const integrationPath = relative(dirname(pagePath), 'assets/js/site-integrations.js').replace(/\\/g, '/');
  return source
    .replace(/<\/head>/i, `    ${metadata}\n  </head>`)
    .replace(/<\/body>/i, `    <script type="module" src="${integrationPath}"></script>\n  </body>`);
}

async function copyIfPresent(rootDir, outputDir, path) {
  try {
    await cp(join(rootDir, path), join(outputDir, path), { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function isGeneratedHtmlArtifact(path) {
  const page = await readFile(path, 'utf8');
  return page.includes('rel="canonical"') && page.includes('assets/js/site-integrations.js');
}

async function sourceHtmlDirectories(rootDir) {
  const pages = await findHtmlPages(rootDir);
  const directories = new Set();
  for (const pagePath of pages) {
    const page = join(rootDir, pagePath);
    if (dirname(page) !== rootDir && !await isGeneratedHtmlArtifact(page)) directories.add(dirname(page));
  }
  return directories;
}

function pathsOverlap(first, second) {
  return isWithin(first, second) || isWithin(second, first);
}

async function isSafeOutputDirectory(path) {
  try {
    const details = await stat(path);
    if (!details.isDirectory()) return false;
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
  try {
    const runtimeConfig = await readFile(join(path, 'assets/js/runtime-config.js'), 'utf8');
    if (!runtimeConfig.startsWith('window.__TOOLKITLY_CONFIG__ = ')) return false;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  const pages = await findHtmlPages(path);
  return pages.length > 0 && (await Promise.all(pages.map((pagePath) => isGeneratedHtmlArtifact(join(path, pagePath))))).every(Boolean);
}

export async function buildSite({ rootDir = process.cwd(), outputDir = join(rootDir, 'dist'), env = process.env } = {}) {
  const resolvedRoot = resolve(rootDir);
  const resolvedOutput = resolve(outputDir);
  const protectedSourceDirectories = [join(resolvedRoot, 'assets'), join(resolvedRoot, 'tools')];
  const discoveredSourceDirectories = await sourceHtmlDirectories(resolvedRoot);
  if (
    isWithin(resolvedRoot, resolvedOutput)
    || protectedSourceDirectories.some((directory) => pathsOverlap(resolvedOutput, directory))
    || [...discoveredSourceDirectories].some((directory) => pathsOverlap(resolvedOutput, directory))
    || !await isSafeOutputDirectory(resolvedOutput)
  ) {
    throw new Error('outputDir must not be the site root, an ancestor, or a source directory or file');
  }

  const dotEnv = await readDotEnv(resolvedRoot);
  const resolvedEnv = { ...dotEnv, ...env };
  const origin = publicOrigin(resolvedEnv.PUBLIC_SITE_URL);
  const pages = await findHtmlPages(resolvedRoot, resolvedOutput);

  await rm(resolvedOutput, { recursive: true, force: true });
  await mkdir(resolvedOutput, { recursive: true });
  await copyIfPresent(resolvedRoot, resolvedOutput, 'assets');
  await copyIfPresent(resolvedRoot, resolvedOutput, 'robots.txt');
  await copyIfPresent(resolvedRoot, resolvedOutput, 'sitemap.xml');

  for (const pagePath of pages) {
    const source = await readFile(join(resolvedRoot, pagePath), 'utf8');
    const destination = join(resolvedOutput, pagePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, transformHtml(source, { origin, pagePath }));
  }

  const configPath = join(resolvedOutput, 'assets/js/runtime-config.js');
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `window.__TOOLKITLY_CONFIG__ = ${JSON.stringify(publicConfig(resolvedEnv))};\n`);

  for (const path of ['favicon.svg', 'robots.txt', 'sitemap.xml']) {
    try {
      const destination = join(resolvedOutput, path);
      const contents = await readFile(destination, 'utf8');
      await writeFile(destination, contents.replaceAll('https://example.com', origin));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  return pages;
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  buildSite().then((pages) => {
    console.log(`Built ${pages.length} HTML pages in dist/.`);
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
