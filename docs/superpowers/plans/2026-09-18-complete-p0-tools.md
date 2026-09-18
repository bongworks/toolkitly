# Complete P0 Tool Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn every P0 card in Toolkitly into a browser-local, bilingual utility that performs the promised conversion, validation, or generation work.

**Architecture:** Keep each tool group isolated in its own ES module and stylesheet. Tool pages load a shared header/i18n/theme bootstrap plus only their group controller; pure transformation functions are exported and tested with Node's built-in runner. QR generation is the sole third-party component and must be vendored locally, so user input never leaves the browser.

**Tech Stack:** Semantic HTML, CSS custom properties, browser-native ES modules, Node.js built-in test runner, a locally vendored MIT-licensed QR encoder.

**Spec:** `docs/mvp-tool-plan.md`

## Global Constraints

- Implement exactly the twelve P0 tools in `docs/mvp-tool-plan.md`; P1 tools remain excluded.
- Every tool works without login, server API, database, analytics, or manual advertising slot.
- Inputs are processed locally. Do not use remote conversion or generation APIs.
- Follow the established dark developer-tool UI; do not introduce GitHub controls or favorites.
- All rendered user input must use `textContent` or form control values, never `innerHTML`.
- English and Korean tool names, labels, errors, and result states must be supported.
- Every new pure transformation function has Node tests that first fail before implementation.

---

## File Structure

| Area | Files | Purpose |
| --- | --- | --- |
| Shared | `assets/js/tool-page.js`, `assets/css/tool-page.css` | bilingual header/theme bootstrap and consistent split-panel UI |
| Link suite | `assets/js/link-tools.js`, `assets/css/link-tools.css`, `tools/utm-builder.html`, `tools/url-parser.html`, `tools/url-codec.html`, `tools/qr-generator.html`, `tests/link-tools.test.js` | campaign, URL, and QR operations |
| Data suite | `assets/js/data-tools.js`, `assets/css/data-tools.css`, `tools/json-diff.html`, `tools/json-converter.html`, `tools/base64-codec.html`, `tests/data-tools.test.js` | JSON comparison, CSV/YAML conversion, Base64 |
| Time/design suite | `assets/js/time-design-tools.js`, `assets/css/time-design-tools.css`, `tools/timestamp-converter.html`, `tools/timezone-planner.html`, `tools/contrast-checker.html`, `tools/color-converter.html`, `tests/time-design-tools.test.js` | time conversion and WCAG/color operations |
| Catalog | `assets/js/tool-catalog.js`, `assets/js/home.js`, `tests/tool-catalog.test.js` | activate all routes and remove placeholder status |
| QR vendor | `assets/vendor/qrcode.min.js`, `assets/vendor/NOTICE-qrcode.txt` | locally served QR encoder and license notice |

## Task 1: Shared page bootstrap and page contract

**Files:** Create `assets/js/tool-page.js`, `assets/css/tool-page.css`; modify `assets/js/i18n.js`, `assets/css/components.css`.

**Interfaces:** `initializeToolPage({ titleKey, categoryKey, descriptionKey })` initializes language/theme controls and translates `[data-i18n]`, while `setStatus(element, { type, text })` writes accessible results without HTML interpolation.

- [ ] Write a failing test for `formatLocalizedStatus('ko', 'success')` returning a Korean success message.
- [ ] Run `npm test -- tests/tool-page.test.js`; expect missing-module failure.
- [ ] Implement the smallest shared bootstrap and generic panel styles.
- [ ] Run the focused and complete test suites.

## Task 2: Link and marketing tools

**Files:** Link suite files above, including local QR vendor.

**Interfaces:** Export `buildUtmUrl`, `parseUrl`, `encodeUrlComponent`, `decodeUrlComponent`. Each returns an explicit `{ ok, value | message }` result.

- [ ] Write failing tests for UTM existing-query preservation, repeated URL query parsing, Unicode URL encode/decode round trip, malformed URI decode error, and QR text input validation.
- [ ] Run `npm test -- tests/link-tools.test.js`; expect the missing-module failure.
- [ ] Implement the pure functions, then the four accessible pages and event handlers.
- [ ] Vendor the QR encoder locally with its license notice; do not use a QR API or remote script.
- [ ] Run focused/full tests and manually test UTM → URL parser → QR creation at desktop and 320px.

## Task 3: Data tools

**Files:** Data suite files above.

**Interfaces:** Export `diffJson`, `jsonToCsv`, `csvToJson`, `jsonToYaml`, `yamlToJson`, `base64Encode`, `base64Decode`. The YAML converter supports mappings, sequences, strings, numbers, booleans, and null; it returns a readable unsupported-structure error otherwise.

- [ ] Write failing tests for nested JSON differences, CSV escaping, typed CSV round trip, simple YAML mapping/list round trip, Unicode Base64 round trip, and invalid input errors.
- [ ] Run `npm test -- tests/data-tools.test.js`; expect missing-module failure.
- [ ] Implement pure conversions without network operations, then render three tool pages with text-safe result views and downloads where relevant.
- [ ] Run focused/full tests and manually check data survives conversion paths.

## Task 4: Time and design tools

**Files:** Time/design suite files above.

**Interfaces:** Export `timestampToDate`, `dateToTimestamp`, `getTimeZoneParts`, `contrastRatio`, `contrastRating`, `convertColor`.

- [ ] Write failing tests for second/millisecond timestamps, ISO date conversion, known time-zone output, black/white ratio 21, WCAG AA/AAA boundaries, and HEX/RGB/HSL conversion.
- [ ] Run `npm test -- tests/time-design-tools.test.js`; expect missing-module failure.
- [ ] Implement pure functions and four responsive tools. Timezone page must use `Intl.DateTimeFormat` rather than a server timezone API.
- [ ] Run focused/full tests and manually test a daylight-saving-zone date and representative colors.

## Task 5: Activate and verify the complete catalog

**Files:** Modify `assets/js/home.js`, `assets/js/tool-catalog.js`, `tests/tool-catalog.test.js`, `README.md`, `sitemap.xml`.

**Interfaces:** Every `TOOLS` entry has a functioning `href`; cards are links rather than coming-soon articles.

- [ ] Write a failing catalog test which asserts that all twelve tool page files exist and each catalog record is marked available.
- [ ] Run it to observe the missing availability contract.
- [ ] Activate cards, add every tool URL to sitemap, and document all P0 tools in README.
- [ ] Run `npm test`, `git diff --check`, and a static server smoke check of every local tool URL.
- [ ] Manually inspect home search, Korean switching, one link/data/time/design tool, and mobile layout.

## Plan Self-Review

- **Coverage:** Tasks 2–4 implement all eleven remaining P0 tools; Task 1 preserves a consistent bilingual UI; Task 5 turns catalog placeholders into usable routes and checks deployment metadata.
- **Isolation:** Tool groups use separate source, test, HTML, and CSS files so parallel work does not overwrite shared logic. Shared bootstrap is completed before group work begins.
- **Risk decisions:** QR is locally vendored to retain browser-local processing. YAML intentionally supports a documented useful subset rather than claiming full YAML 1.2 compliance.
- **Excluded:** P1 tools, server-backed persistence, file uploads, manual ad placements, accounts, billing, and all remote processing remain out of scope.
