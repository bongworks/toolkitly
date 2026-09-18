import test from 'node:test';
import assert from 'node:assert/strict';
import * as integrations from '../assets/js/site-integrations.js';
import {
  isValidGaMeasurementId,
  isValidAdsenseClientId,
  sanitizePathname,
  createAnalyticsPayload,
} from '../assets/js/site-integrations.js';

test('public ID validators reject missing, malformed, and injection-bearing values', () => {
  assert.equal(isValidGaMeasurementId('G-ABC123'), true);
  assert.equal(isValidAdsenseClientId('ca-pub-1234567890123456'), true);
  for (const value of [undefined, null, {}, 123, '', ' G-ABC123', 'G-abc', 'G-', 'G-ABC?secret=x', 'G-ABC\n']) {
    assert.equal(isValidGaMeasurementId(value), false);
  }
  for (const value of [undefined, null, {}, 123, '', 'ca-pub-', 'ca-pub-123x', 'ca-pub-123\n', 'ca-pub-123&secret=x']) {
    assert.equal(isValidAdsenseClientId(value), false);
  }
});

test('route sanitization removes query, fragment, and arbitrary path content', () => {
  for (const [input, expected] of [
    ['/tools/json-formatter.html?token=secret#private', '/tools/json-formatter.html'],
    ['https://tools.bongworks.co.kr/tools/jwt-inspector.html?jwt=secret#claims', '/tools/jwt-inspector.html'],
    ['/privacy.html#settings', '/privacy.html'],
    ['/index.html?email=private', '/'],
    ['/tools/private-user-secret.html', '/'],
    ['/users/person@example.com', '/'],
    ['javascript:secret', '/'],
    [null, '/'],
    [{ toString() { throw new Error('Do not inspect arbitrary values'); } }, '/'],
  ]) assert.equal(sanitizePathname(input), expected);
});

test('analytics payload derives tool ID from a known route and only admits fixed action categories', () => {
  assert.deepEqual(createAnalyticsPayload({
    pathname: '/tools/json-formatter.html?token=secret#private',
    toolId: 'private-user-content', action: 'copy', input: 'secret', output: 'secret',
    page_location: 'https://example.com/?secret', referrer: 'secret', error: 'secret', clipboard: 'secret',
  }), { page_path: '/tools/json-formatter.html', tool_id: 'json-formatter', action: 'copy' });
  assert.deepEqual(createAnalyticsPayload({ pathname: '/privacy.html', action: 'private-secret' }), { page_path: '/privacy.html' });
  assert.deepEqual(createAnalyticsPayload(), { page_path: '/' });
  for (const action of ['run', 'copy', 'download']) {
    assert.equal(createAnalyticsPayload({ pathname: '/tools/qr-generator.html', action }).action, action);
  }
});

test('safe GA page locations use the fixed origin and allowlisted routes without URL content', () => {
  assert.equal(typeof integrations.createSafePageLocation, 'function');
  for (const [input, expected] of [
    ['/tools/json-formatter.html?secret=value#private', 'https://tools.bongworks.co.kr/tools/json-formatter.html'],
    ['https://private.example/tools/jwt-inspector.html?jwt=secret#claims', 'https://tools.bongworks.co.kr/tools/jwt-inspector.html'],
    ['/privacy.html?email=private', 'https://tools.bongworks.co.kr/privacy.html'],
    ['/users/private-person', 'https://tools.bongworks.co.kr/'],
    ['//private.example/unknown?secret=value', 'https://tools.bongworks.co.kr/'],
    [undefined, 'https://tools.bongworks.co.kr/'],
  ]) assert.equal(integrations.createSafePageLocation(input), expected);
});

let importCount = 0;
function browserFixture(config = { ga4MeasurementId: 'G-ABC123', adsenseClientId: 'ca-pub-1234567890123456' }, consent = true, pathname = '/tools/json-formatter.html') {
  const scripts = [];
  const listeners = new Map();
  const document = {
    head: { appendChild(script) { scripts.push(script); } },
    createElement(tag) { assert.equal(tag, 'script'); return { dataset: {}, setAttribute(name, value) { this[name] = value; } }; },
    getElementById(id) { return scripts.find((script) => script.id === id) ?? null; },
    addEventListener(name, listener) { const handlers = listeners.get(name) ?? []; handlers.push(listener); listeners.set(name, handlers); },
    get title() { throw new Error('Must not read page titles'); },
    get referrer() { throw new Error('Must not read referrers'); },
  };
  const window = {
    __TOOLKITLY_CONFIG__: config,
    __TOOLKITLY_CONSENT__: consent,
    location: { pathname, get href() { throw new Error('Must not read full URL'); }, get search() { throw new Error('Must not read queries'); }, get hash() { throw new Error('Must not read fragments'); } },
    document,
  };
  return {
    window, document, scripts, listeners,
    events() { return (window.dataLayer ?? []).map((entry) => Array.from(entry)).filter(([command]) => command === 'event'); },
    dispatch(type, target) { for (const listener of listeners.get(type) ?? []) listener({ target }); },
  };
}

async function loadInBrowser(fixture) {
  globalThis.window = fixture.window;
  globalThis.document = fixture.document;
  try {
    await import(`../assets/js/site-integrations.js?browser-test=${++importCount}`);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
}

function control({ id = '', action, copyTarget, tagName = 'BUTTON', type = 'button', form = null } = {}) {
  const element = {
    id, tagName, type, form, disabled: false,
    dataset: { ...(action ? { action } : {}), ...(copyTarget ? { copyTarget } : {}) },
    get value() { throw new Error('Must not read values'); },
    get textContent() { throw new Error('Must not read button text'); },
    get innerHTML() { throw new Error('Must not read HTML'); },
    closest(selector) { return selector === 'button' && tagName === 'BUTTON' ? element : null; },
    hasAttribute(name) { return name === 'data-copy-target' && copyTarget !== undefined; },
  };
  return element;
}

test('valid IDs initialize integrations and safe events without consent in default mode', async () => {
  for (const googleConsentRequired of [undefined, false]) {
    const fixture = browserFixture();
    fixture.window.__TOOLKITLY_CONFIG__.googleConsentRequired = googleConsentRequired;
    delete fixture.window.__TOOLKITLY_CONSENT__;
    await loadInBrowser(fixture);
    assert.equal(fixture.scripts.length, 2);
    assert.deepEqual(fixture.events().map(([, name]) => name), ['page_view', 'tool_open']);
    fixture.dispatch('click', control({ action: 'format' }));
    assert.deepEqual(fixture.events().at(-1), ['event', 'tool_run', {
      page_path: '/tools/json-formatter.html', tool_id: 'json-formatter', action: 'run',
    }]);
  }
});

test('consent-required configuration initializes nothing without exact boolean consent', async () => {
  for (const consent of [undefined, false, 'true', 1, {}, null]) {
    const fixture = browserFixture();
    fixture.window.__TOOLKITLY_CONFIG__.googleConsentRequired = true;
    fixture.window.__TOOLKITLY_CONSENT__ = consent;
    await loadInBrowser(fixture);
    assert.equal(fixture.scripts.length, 0);
    assert.equal(fixture.window.dataLayer, undefined);
    assert.equal(fixture.listeners.size, 0);
  }
});

test('consent-required configuration initializes both integrations with exact true consent', async () => {
  const fixture = browserFixture();
  fixture.window.__TOOLKITLY_CONFIG__.googleConsentRequired = true;
  await loadInBrowser(fixture);
  assert.equal(fixture.scripts.length, 2);
  assert.deepEqual(fixture.events().map(([, name]) => name), ['page_view', 'tool_open']);
});

test('each integration requires its own valid ID', async () => {
  const disabled = browserFixture({ ga4MeasurementId: 'bad', adsenseClientId: 'bad' });
  await loadInBrowser(disabled);
  assert.equal(disabled.scripts.length, 0);
  assert.equal(disabled.events().length, 0);
  const analytics = browserFixture({ ga4MeasurementId: 'G-ABC123', adsenseClientId: null });
  await loadInBrowser(analytics);
  assert.deepEqual(analytics.scripts.map((script) => script.src), ['https://www.googletagmanager.com/gtag/js?id=G-ABC123']);
  const ads = browserFixture({ ga4MeasurementId: null, adsenseClientId: 'ca-pub-123' });
  await loadInBrowser(ads);
  assert.deepEqual(ads.scripts.map((script) => script.src), ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-123']);
  assert.equal(ads.window.dataLayer, undefined);
});

test('initialization emits sanitized page and tool events once and deduplicates loaders', async () => {
  const fixture = browserFixture();
  await loadInBrowser(fixture);
  await loadInBrowser(fixture);
  assert.equal(fixture.scripts.length, 2);
  assert.ok(fixture.scripts.every((script) => script.async && script.referrerPolicy === 'no-referrer'));
  assert.equal(fixture.scripts[1].crossOrigin, 'anonymous');
  const commands = fixture.window.dataLayer.map((entry) => Array.from(entry));
  const config = commands.find(([command]) => command === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.page_location, 'https://tools.bongworks.co.kr/tools/json-formatter.html');
  assert.equal(config.page_referrer, '');
  assert.equal(config.page_title, '');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.deepEqual(fixture.events(), [
    ['event', 'page_view', { page_path: '/tools/json-formatter.html', tool_id: 'json-formatter' }],
    ['event', 'tool_open', { page_path: '/tools/json-formatter.html', tool_id: 'json-formatter' }],
  ]);
});

test('existing marked external scripts are not inserted again', async () => {
  const fixture = browserFixture();
  fixture.scripts.push({ id: 'toolkitly-ga4' }, { id: 'toolkitly-adsense' });
  await loadInBrowser(fixture);
  assert.equal(fixture.scripts.length, 2);
});

test('delegated safe actions use only fixed categories, including nested button targets', async () => {
  const fixture = browserFixture();
  await loadInBrowser(fixture);
  fixture.dispatch('click', control({ action: 'format' }));
  const copyButton = control({ id: 'copy-result' });
  fixture.dispatch('click', { closest() { return copyButton; } });
  fixture.dispatch('click', control({ id: 'download-json' }));
  fixture.dispatch('click', control({ action: 'private-user-content' }));
  fixture.dispatch('click', control({ id: 'clear-json' }));
  fixture.dispatch('click', control({ id: 'page-language' }));
  assert.deepEqual(fixture.events().slice(2), [
    ['event', 'tool_run', { page_path: '/tools/json-formatter.html', tool_id: 'json-formatter', action: 'run' }],
    ['event', 'tool_copy', { page_path: '/tools/json-formatter.html', tool_id: 'json-formatter', action: 'copy' }],
    ['event', 'tool_download', { page_path: '/tools/json-formatter.html', tool_id: 'json-formatter', action: 'download' }],
  ]);
});

test('form submission is counted once without reading fields or unrelated forms', async () => {
  const fixture = browserFixture(undefined, true, '/tools/utm-builder.html');
  await loadInBrowser(fixture);
  const form = control({ id: 'utm-form', tagName: 'FORM' });
  fixture.dispatch('click', control({ type: 'submit', form }));
  fixture.dispatch('submit', form);
  fixture.dispatch('submit', control({ id: 'other-form', tagName: 'FORM' }));
  assert.deepEqual(fixture.events().slice(2), [
    ['event', 'tool_run', { page_path: '/tools/utm-builder.html', tool_id: 'utm-builder', action: 'run' }],
  ]);
});

test('JWT copy controls and named tool actions are recognized without content inspection', async () => {
  const fixture = browserFixture(undefined, true, '/tools/jwt-inspector.html');
  await loadInBrowser(fixture);
  fixture.dispatch('click', control({ id: 'jwt-verify' }));
  fixture.dispatch('click', control({ copyTarget: '#jwt-payload-output' }));
  assert.deepEqual(fixture.events().slice(2).map(([, name, payload]) => [name, payload.action]), [['tool_run', 'run'], ['tool_copy', 'copy']]);
});

test('non-tool pages send only page views and consent revocation stops delegated events', async () => {
  const privacy = browserFixture(undefined, true, '/privacy.html');
  await loadInBrowser(privacy);
  privacy.dispatch('click', control({ id: 'copy-result' }));
  assert.deepEqual(privacy.events(), [['event', 'page_view', { page_path: '/privacy.html' }]]);
  const tool = browserFixture();
  tool.window.__TOOLKITLY_CONFIG__.googleConsentRequired = true;
  await loadInBrowser(tool);
  tool.window.__TOOLKITLY_CONSENT__ = false;
  tool.dispatch('click', control({ action: 'format' }));
  assert.equal(tool.events().length, 2);
});
