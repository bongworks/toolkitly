# Developer Toolkit MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, bilingual developer-tool dashboard and a working JSON formatter that establish the reusable UI and behavior pattern for the broader MVP.

**Architecture:** A dependency-free static site uses a single source of truth for tool metadata, pure browser-side formatter logic, and DOM-rendering modules. `index.html` renders the searchable tool directory; `tools/json-formatter.html` shares the same header and theme tokens while loading only the JSON tool controller. No data is sent to a server.

**Tech Stack:** Semantic HTML, modern CSS custom properties, browser-native ES modules, Node.js built-in test runner, GitHub Pages/Cloudflare Pages-compatible static output.

**Spec:** `docs/mvp-tool-plan.md`

## Global Constraints

- Keep every MVP interaction browser-local; no login, API request, database, or tracking code in the initial build.
- Support English and Korean in the initial UI with a language toggle persisted in `localStorage`.
- Adopt the visual principles of https://devtools-hub-beryl.vercel.app/ without copying its branding, text, logo, source, GitHub link, or favorites feature.
- Use the palette and typography specified in `docs/mvp-tool-plan.md` section `5-1. UI 디자인 기준`.
- Do not add package dependencies.
- Do not create manual advertising slots; reserve vertical breathing room so automatic advertising does not collide visually with tool controls.
- Never render user-entered JSON with `innerHTML`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `index.html` | Home dashboard document shell and module entry point |
| `tools/json-formatter.html` | JSON formatter document shell and module entry point |
| `assets/css/tokens.css` | Shared font imports, colors, spacing, responsive layout, focus states |
| `assets/css/components.css` | Header, search, cards, editor panels, buttons, notices |
| `assets/js/tool-catalog.js` | Immutable P0 tool metadata and category data |
| `assets/js/i18n.js` | English/Korean copy dictionaries, language persistence, DOM translation helper |
| `assets/js/theme.js` | Theme persistence and root `data-theme` toggling |
| `assets/js/home.js` | Search, category filter, and dashboard card rendering |
| `assets/js/json-formatter.js` | Pure JSON parse/format/minify functions and editor event bindings |
| `tests/json-formatter.test.js` | Node tests for formatter success and error behavior |
| `tests/tool-catalog.test.js` | Node tests for catalog IDs, paths, and bilingual content |
| `package.json` | `node --test` test command only; no runtime dependencies |

## Task 1: Establish static site shell and visual tokens

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `assets/css/tokens.css`
- Create: `assets/css/components.css`

**Interfaces:**
- Produces: `data-theme` on `<html>`, shared classes `.site-header`, `.tool-card`, `.panel`, `.button`, `.sr-only`.
- Consumed by: all page entry documents and JavaScript renderers.

- [ ] **Step 1: Create the minimal test command configuration**

```json
{
  "name": "toolkitly",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
```

- [ ] **Step 2: Build the shared CSS token layer**

Define the exact color variables from the spec, an 8px spacing scale, `prefers-reduced-motion` handling, and visible `:focus-visible` outlines. Import Geist and JetBrains Mono through a font CDN only after documenting the privacy trade-off in the final README.

- [ ] **Step 3: Build the home document shell**

Use semantic `<header>`, `<nav>`, `<main>`, and `<section>` landmarks. The header must contain a text logo, a search input with `aria-label="Search tools"`, language toggle, and theme button, but no GitHub or favorites controls.

- [ ] **Step 4: Verify the static shell manually**

Run: `python3 -m http.server 4173`

Open: `http://localhost:4173/index.html`

Expected: dark graphite page, fixed header, keyboard-visible focus, no broken resources at 320px and 1440px widths.

- [ ] **Step 5: Commit the shell**

```bash
git add package.json index.html assets/css/tokens.css assets/css/components.css
git commit -m "feat: add static developer toolkit shell"
```

## Task 2: Add bilingual tool catalog, theme, and dashboard filtering

**Files:**
- Create: `assets/js/tool-catalog.js`
- Create: `assets/js/i18n.js`
- Create: `assets/js/theme.js`
- Create: `assets/js/home.js`
- Create: `tests/tool-catalog.test.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `TOOLS`, `getCopy(language, key)`, `getStoredLanguage()`, `setLanguage(language)`, `initializeTheme()`.
- Consumes: P0 tool names/paths from `TOOLS`; header controls from Task 1.

- [ ] **Step 1: Write the failing catalog test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS } from '../assets/js/tool-catalog.js';

test('every catalog tool has a unique id, local route, and English/Korean copy', () => {
  const ids = TOOLS.map((tool) => tool.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const tool of TOOLS) {
    assert.match(tool.href, /^(?:\.\/)?tools\/.+\.html$/);
    assert.ok(tool.name.en && tool.name.ko);
    assert.ok(tool.description.en && tool.description.ko);
  }
});
```

- [ ] **Step 2: Run the test and verify the expected missing-module failure**

Run: `npm test -- tests/tool-catalog.test.js`

Expected: FAIL because `assets/js/tool-catalog.js` does not yet exist.

- [ ] **Step 3: Implement P0 metadata and render behavior**

Create catalog records for every P0 tool in the spec. `home.js` must show category filters and render only cards whose localized name, description, or category includes the search term. Insert card text using `textContent` and give each card a local route.

```js
export const TOOLS = [{
  id: 'json-formatter',
  href: 'tools/json-formatter.html',
  category: 'data',
  name: { en: 'JSON Formatter', ko: 'JSON 포매터' },
  description: { en: 'Format, validate, and minify JSON locally.', ko: 'JSON을 브라우저에서 포맷·검증·압축합니다.' }
}];
```

- [ ] **Step 4: Run focused and complete tests**

Run: `npm test -- tests/tool-catalog.test.js`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

- [ ] **Step 5: Manually verify dashboard behavior**

At `index.html`, search `json`, choose a category, switch to Korean, refresh, and switch theme. Expected: the matching card set and language persist; no GitHub/favorite controls appear.

- [ ] **Step 6: Commit the dashboard**

```bash
git add index.html assets/js tests/tool-catalog.test.js
git commit -m "feat: add bilingual searchable tool dashboard"
```

## Task 3: Implement pure JSON formatting behavior with TDD

**Files:**
- Create: `assets/js/json-formatter.js`
- Create: `tests/json-formatter.test.js`

**Interfaces:**
- Produces: `formatJson(source, indent)`, `minifyJson(source)` returning `{ ok: true, value: string }` or `{ ok: false, message: string }`.
- Consumed by: JSON formatter page controller in Task 4.

- [ ] **Step 1: Write failing formatter tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatJson, minifyJson } from '../assets/js/json-formatter.js';

test('formatJson prettifies valid JSON using the selected indentation', () => {
  assert.deepEqual(formatJson('{"enabled":true}', 2), {
    ok: true,
    value: '{\n  "enabled": true\n}'
  });
});

test('formatJson returns a user-readable error for invalid JSON', () => {
  const result = formatJson('{enabled:true}', 2);
  assert.equal(result.ok, false);
  assert.match(result.message, /Invalid JSON/);
});

test('minifyJson removes insignificant whitespace', () => {
  assert.deepEqual(minifyJson('{\n  "id": 1\n}'), { ok: true, value: '{"id":1}' });
});
```

- [ ] **Step 2: Run tests and verify expected failure**

Run: `npm test -- tests/json-formatter.test.js`

Expected: FAIL because `assets/js/json-formatter.js` does not yet exist.

- [ ] **Step 3: Implement the smallest browser-safe formatter**

Use `JSON.parse` and `JSON.stringify`; catch only parsing errors and return a stable `Invalid JSON: …` message. Do not call `eval`, do not use `innerHTML`, and do not send the source outside the page.

```js
export function formatJson(source, indent = 2) {
  try {
    return { ok: true, value: JSON.stringify(JSON.parse(source), null, indent) };
  } catch (error) {
    return { ok: false, message: `Invalid JSON: ${error.message}` };
  }
}
```

- [ ] **Step 4: Run formatter tests and the full suite**

Run: `npm test -- tests/json-formatter.test.js`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

- [ ] **Step 5: Commit the tested formatter logic**

```bash
git add assets/js/json-formatter.js tests/json-formatter.test.js
git commit -m "feat: add browser-local JSON formatter logic"
```

## Task 4: Build the JSON formatter workbench

**Files:**
- Create: `tools/json-formatter.html`
- Modify: `assets/js/json-formatter.js`
- Modify: `assets/css/components.css`

**Interfaces:**
- Consumes: `formatJson`, `minifyJson`, `getCopy`, `initializeTheme`, shared styles.
- Produces: interactive formatter UI with format, minify, copy, clear, and error feedback.

- [ ] **Step 1: Write a failing DOM-level behavior test**

Add an exported `applyFormatterAction({ source, action, indent })` function to keep DOM behavior testable without a browser DOM.

```js
test('applyFormatterAction selects minification without changing valid JSON data', () => {
  assert.deepEqual(applyFormatterAction({ source: '{ "x": 1 }', action: 'minify', indent: 2 }), {
    ok: true,
    value: '{"x":1}'
  });
});
```

- [ ] **Step 2: Run the test and verify expected failure**

Run: `npm test -- tests/json-formatter.test.js`

Expected: FAIL because `applyFormatterAction` is not exported.

- [ ] **Step 3: Implement the split-panel workbench**

Build a labelled source `<textarea>`, output `<pre><code>` updated with `textContent`, indentation select, Format/Minify/Clear/Copy buttons, and `aria-live="polite"` status. On mobile, stack output under input. Leave no manual ad placeholder.

- [ ] **Step 4: Run tests and manually inspect interactions**

Run: `npm test`

Expected: PASS with zero failures.

At `tools/json-formatter.html`, verify valid formatting, invalid input error, minify output, clear action, keyboard tab sequence, and copy feedback. Test a 320px viewport and a 1440px viewport.

- [ ] **Step 5: Commit the workbench**

```bash
git add tools/json-formatter.html assets/js/json-formatter.js assets/css/components.css tests/json-formatter.test.js
git commit -m "feat: add JSON formatter workbench"
```

## Task 5: Add static SEO, privacy baseline, and deployment guidance

**Files:**
- Create: `robots.txt`
- Create: `sitemap.xml`
- Create: `privacy.html`
- Create: `README.md`
- Modify: `index.html`
- Modify: `tools/json-formatter.html`

**Interfaces:**
- Consumes: final public domain placeholder only through a single documented replacement value in `README.md`.
- Produces: crawlable static entry pages and user-facing browser-local data disclosure.

- [ ] **Step 1: Write a failing static-file presence test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';

test('static SEO and privacy files exist', async () => {
  await Promise.all(['robots.txt', 'sitemap.xml', 'privacy.html'].map((file) => access(file)));
  assert.ok(true);
});
```

- [ ] **Step 2: Run the test and verify expected failure**

Run: `npm test -- tests/static-site.test.js`

Expected: FAIL because the static policy files do not exist.

- [ ] **Step 3: Add static operational files**

Write a privacy page that states tool input stays in the browser and that future advertising/analytics changes will update the notice. Use a placeholder domain in sitemap and document exactly how to replace it before deployment. Add unique English/Korean titles and descriptions to each implemented page.

- [ ] **Step 4: Run all tests and perform a static preview**

Run: `npm test`

Expected: PASS with zero failures.

Run: `python3 -m http.server 4173`

Expected: home, JSON tool, privacy page, and assets load without server-side routing.

- [ ] **Step 5: Commit release baseline**

```bash
git add README.md robots.txt sitemap.xml privacy.html index.html tools/json-formatter.html tests/static-site.test.js
git commit -m "docs: add static site deployment baseline"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1-4 cover the approved dark developer-tool UI, no GitHub/favorites, static browser-local functionality, English/Korean UI, and the first reusable tool pattern. Task 5 covers initial SEO, policy, and deployment needs. Automatic advertising is deliberately not coded; this matches the scope constraint.
- **Excluded by design:** The remaining P0 tools, manual ad placements, user accounts, file upload conversion, external APIs, and monetization integration are not part of this first implementation slice.
- **Placeholder scan:** No task contains deferred implementation instructions. The domain placeholder is intentionally called out as a deployment-time required value and is confined to the sitemap/README pairing.
- **Interface consistency:** Catalog fields, i18n functions, formatter result shape, and DOM-safe rendering are named consistently across their producing and consuming tasks.
