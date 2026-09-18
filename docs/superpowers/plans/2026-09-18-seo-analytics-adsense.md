# SEO, GA4, and AdSense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable static site with correct SEO metadata and optional, consent-gated GA4 and AdSense integrations.

**Architecture:** A Node build script produces `dist/`, transforms HTML and static SEO files, and emits a public runtime config. A shared browser module reads that generated config and conditionally injects the two third-party scripts while exposing only sanitized analytics events.

**Tech Stack:** Node.js ESM, `node:test`, static HTML/CSS/JavaScript.

**Spec:** `docs/superpowers/specs/2026-09-18-seo-analytics-adsense-design.md`

## Global Constraints

- Use `https://tools.bongworks.co.kr` as the default public origin.
- Keep `.env` ignored and expose only valid public Google identifiers in generated output.
- Do not transmit tool content, queries, hashes, referrers, clipboard contents, or error strings.
- Valid GA4/AdSense IDs enable their matching integration by default. `GOOGLE_CONSENT_REQUIRED=true` additionally requires `window.__TOOLKITLY_CONSENT__ === true`.
- Preserve no-runtime-dependency static hosting.

---

### Task 1: Build static deployment output and SEO metadata

**Files:**
- Create: `scripts/build-site.js`
- Create: `tests/build-site.test.js`
- Create: `.env.example`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces `buildSite({ rootDir, outputDir, env })`, which returns generated page paths.
- Produces `dist/assets/js/runtime-config.js` defining `window.__TOOLKITLY_CONFIG__`.

- [ ] Write tests for invalid/blank public IDs, generated config, transformed metadata, and origin replacement.
- [ ] Run `node --test tests/build-site.test.js` and confirm the missing build module causes the expected failure.
- [ ] Implement the minimum build transform and build script.
- [ ] Re-run targeted tests, then `npm run build`.

### Task 2: Consent-gated shared GA4 and AdSense integration

**Files:**
- Create: `assets/js/site-integrations.js`
- Create: `tests/site-integrations.test.js`
- Modify: `privacy.html`

**Interfaces:**
- Exports `isValidGaMeasurementId`, `isValidAdsenseClientId`, `sanitizePathname`, and `createAnalyticsPayload`.
- Reads `window.__TOOLKITLY_CONFIG__` and `window.__TOOLKITLY_CONSENT__` only at browser runtime.

- [ ] Write tests for validation, sanitized page/event payloads, and forbidden parameters.
- [ ] Run `node --test tests/site-integrations.test.js` and confirm imports fail before the module exists.
- [ ] Implement the module with exactly-once external script insertion and delegated non-content events; preserve immediate opt-in from valid IDs and enforce CMP consent only when `GOOGLE_CONSENT_REQUIRED=true`.
- [ ] Amend privacy copy to describe optional, consent-gated integrations accurately.
- [ ] Re-run targeted tests.

### Task 3: End-to-end static regression coverage and documentation

**Files:**
- Modify: `tests/static-site.test.js`
- Modify: `README.md`

**Interfaces:**
- Consumes the generated `dist/` contract from Tasks 1-2.

- [ ] Write static assertions for transformed page coverage and lack of placeholder origin in `dist/`.
- [ ] Run the focused static test to verify it fails before the final assertions/build updates.
- [ ] Update documentation with local build, environment keys, deployment, consent, and CSP guidance.
- [ ] Run `npm test` and `npm run build`.
