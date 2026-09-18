# SEO, GA4, and AdSense Design

## Goal

Publish a static `dist/` site for `https://tools.bongworks.co.kr` with correct crawl metadata, optional GA4 measurement, and optional AdSense Auto ads.

## Constraints

- The source site remains browser-local for tool processing.
- `.env` is a build input only. It is never fetched by a browser or committed.
- Only `GA4_MEASUREMENT_ID` (`G-...`) and `ADSENSE_CLIENT_ID` (`ca-pub-...`) are exposed in generated public configuration.
- With either value absent or malformed, its third-party script and all related events must be disabled.
- GA4 may send only the path, tool ID, and allowlisted action category. It must never send tool values, results, query strings, hashes, referrers, clipboard data, or error text.
- Valid GA4 or AdSense IDs enable their matching integration by default, as requested. `GOOGLE_CONSENT_REQUIRED=true` changes this behavior for deployments that require a CMP: the browser must then set `window.__TOOLKITLY_CONSENT__ = true` before the integration module executes.

## Build and SEO

`npm run build` copies deployable files to `dist/`, reads `.env` when present, generates `dist/assets/js/runtime-config.js`, and transforms every HTML document. The transform adds the shared integration module, absolute canonical URL, Open Graph/Twitter metadata, and JSON-LD. It replaces the placeholder origin in `robots.txt` and `sitemap.xml` with `PUBLIC_SITE_URL`, defaulting to `https://tools.bongworks.co.kr`.

Home gets a `WebSite` schema. Tool pages get a `WebApplication` and `BreadcrumbList` schema based only on existing page title/description and public URL. Privacy is not represented as an application.

## Measurement and advertising

The shared integration module runs once per page. With valid configuration (and, when configured, CMP consent), it asynchronously adds Google Tag Manager, configures GA4 without the automatic page view, emits one sanitized manual `page_view`, and emits a `tool_open` event on tool pages. It delegates form submit and named action/copy/download button interactions to `tool_run`, `tool_copy`, and `tool_download` events without inspecting user-provided content.

With a valid AdSense client ID and consent, the same module asynchronously adds exactly one Auto ads loader. It never adds ad slots; AdSense decides Auto ad placement. Duplicate Google or AdSense script injection is prevented with a stable marker.

## Verification

Node tests cover public-ID validation, route sanitization, allowlisted analytics payloads, default and consent-required behavior, generated configuration, transformed HTML, full page coverage, and replacement of `example.com`. The existing complete test suite and a production build run before handoff.
