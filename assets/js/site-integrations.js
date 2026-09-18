import { TOOLS } from './tool-catalog.js';

const SITE_ORIGIN = 'https://tools.bongworks.co.kr';
const TOOL_PATHS = new Map(TOOLS.map((tool) => [`/${tool.href}`, tool.id]));
const ACTIONS = new Set(['run', 'copy', 'download']);
const TOOL_CONTROLS = {
  'json-formatter': { run: ['action:format', 'action:minify'], copy: ['id:copy-result'], download: ['id:download-json'] },
  'json-diff': { run: ['id:run-diff'], copy: ['id:copy-diff'] },
  'json-converter': { run: ['id:run-convert'], copy: ['id:copy-convert'], download: ['id:download-convert'] },
  'base64-codec': { run: ['id:run-base64'], copy: ['id:copy-base64'] },
  'utm-builder': { form: 'utm-form', copy: ['id:utm-copy'] },
  'url-parser': { form: 'url-parser-form', run: ['id:url-parser-recompose'], copy: ['id:url-parser-copy'] },
  'url-codec': { form: 'url-codec-form', copy: ['id:url-codec-copy'] },
  'qr-generator': { run: ['id:qr-generate'], download: ['id:qr-download', 'id:qr-download-svg'] },
  'timestamp-converter': { run: ['action:to-date', 'action:to-timestamp'] },
  'timezone-planner': { run: ['action:convert-timezone'], copy: ['action:copy-timezone'] },
  'contrast-checker': { run: ['action:check-contrast'] },
  'color-converter': { run: ['action:convert-color'] },
  'jwt-inspector': { run: ['id:jwt-decode', 'id:jwt-verify'], copy: ['copy:#jwt-header-output', 'copy:#jwt-payload-output', 'copy:#jwt-claims-output'] },
  'regex-tester': { run: ['id:regex-run'] },
  'crypto-lab': { run: ['id:crypto-run', 'id:generate-aes'], copy: ['id:copy-crypto'] },
  'hash-generator': { run: ['id:hash-run'], copy: ['id:copy-hash'] },
  'uuid-ulid-generator': { run: ['id:generate-identifiers', 'id:validate-identifier'], copy: ['id:copy-identifiers'], download: ['id:download-identifiers'] },
};

export function isValidGaMeasurementId(value) {
  return typeof value === 'string' && value === value.trim() && /^G-[A-Z0-9]+$/.test(value);
}

export function isValidAdsenseClientId(value) {
  return typeof value === 'string' && value === value.trim() && /^ca-pub-\d+$/.test(value);
}

export function sanitizePathname(value) {
  if (typeof value !== 'string') return '/';
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (!['https:', 'http:'].includes(url.protocol)) return '/';
    // Only shipped routes are measurable; arbitrary path segments may contain input.
    return url.pathname === '/privacy.html' || TOOL_PATHS.has(url.pathname) ? url.pathname : '/';
  } catch {
    return '/';
  }
}

export function createSafePageLocation(pathname) {
  return `${SITE_ORIGIN}${sanitizePathname(pathname)}`;
}

export function createAnalyticsPayload({ pathname, action } = {}) {
  const page_path = sanitizePathname(pathname);
  const toolId = TOOL_PATHS.get(page_path);
  return {
    page_path,
    ...(toolId ? { tool_id: toolId } : {}),
    ...(toolId && ACTIONS.has(action) ? { action } : {}),
  };
}

function insertScript(document, id, src, crossOrigin) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  script.referrerPolicy = 'no-referrer';
  if (crossOrigin) script.crossOrigin = crossOrigin;
  document.head.appendChild(script);
}

function initializeIntegrations(browser) {
  const config = browser.__TOOLKITLY_CONFIG__ ?? {};
  const canLoad = () => config.googleConsentRequired !== true || browser.__TOOLKITLY_CONSENT__ === true;
  if (!canLoad()) return;
  const document = browser.document;
  const state = browser.__TOOLKITLY_INTEGRATIONS__ ??= {};

  if (isValidGaMeasurementId(config.ga4MeasurementId) && !state.analytics) {
    state.analytics = true;
    const pathname = sanitizePathname(browser.location.pathname);
    const toolId = TOOL_PATHS.get(pathname);
    browser.dataLayer ??= [];
    browser.gtag ??= function () { browser.dataLayer.push(arguments); };
    const gtag = browser.gtag;
    gtag('js', new Date());
    gtag('config', config.ga4MeasurementId, {
      send_page_view: false,
      page_location: createSafePageLocation(pathname),
      page_referrer: '',
      page_title: '',
      ignore_referrer: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    function track(eventName, action) {
      if (canLoad()) {
        gtag('event', eventName, createAnalyticsPayload({ pathname, action }));
      }
    }
    track('page_view');
    if (toolId) {
      track('tool_open');
      const controls = TOOL_CONTROLS[toolId] ?? {};
      document.addEventListener('submit', (event) => {
        if (event.target?.tagName === 'FORM' && controls.form && event.target.id === controls.form) track('tool_run', 'run');
      });
      document.addEventListener('click', (event) => {
        const button = event.target?.closest?.('button');
        if (!button || button.disabled || (button.type === 'submit' && button.form)) return;
        const names = [`id:${button.id}`, `action:${button.dataset.action}`, `copy:${button.dataset.copyTarget}`];
        for (const action of ACTIONS) {
          if (controls[action]?.some((name) => names.includes(name))) {
            track(`tool_${action}`, action);
            break;
          }
        }
      });
    }
    insertScript(document, 'toolkitly-ga4', `https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementId}`);
  }

  if (isValidAdsenseClientId(config.adsenseClientId) && !state.adsense) {
    state.adsense = true;
    insertScript(document, 'toolkitly-adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsenseClientId}`, 'anonymous');
  }
}

if (typeof window !== 'undefined' && window.document) {
  const browser = window;
  if (!browser.__TOOLKITLY_CONFIG__) {
    // Generated for deployment. Opening unbuilt sources keeps integrations disabled.
    try { await import('./runtime-config.js'); } catch { /* No generated configuration. */ }
  }
  initializeIntegrations(browser);
}
