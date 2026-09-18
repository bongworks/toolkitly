# P1 Developer Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved P1 browser-local developer tool suite with safe JWT verification, cryptography, hashing, diffing, regex testing, and identifier generation.

**Architecture:** Each tool is an isolated static document with a Node-testable ES module plus page controller. Existing shared page bootstrap and CSS are reused. A final integration task registers every page in the catalog, sitemap, README, and static tests.

**Tech Stack:** Static HTML/CSS, browser Web Crypto API, ES modules, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-18-p1-developer-tools-design.md`

## Global Constraints

- All input, selected files, keys, ciphertext, generated IDs, decoding, verification, and hashing stay in the browser; no remote API, dependency, analytics, account, database, or persistence is added.
- Use `textContent` for raw user data, bilingual `data-en`/`data-ko` copy, and `aria-live` for user-visible status.
- JWT supports only HS256/384/512, RS256/384/512, PS256/384/512, and ES256/384/512; decode and verification statuses are visibly separate.
- Crypto Lab supports only RSA-OAEP SHA-256 and AES-GCM 256-bit with a 12-byte IV; do not offer ECB, custom cryptography, or password hashing.
- Preserve existing P0 behavior and do not create any excluded P1 tools.

---

## File structure

| File | Responsibility |
| --- | --- |
| `assets/js/data-tools.js` / `tools/json-diff.html` | Extend JSON diff into automatic JSON/text Diff Checker without regressing JSON comparison. |
| `assets/js/jwt-tools.js` / `tools/jwt-inspector.html` / `assets/css/jwt-tools.css` | JWT parse, claim summary, PEM key import, and local signature verification. |
| `assets/js/regex-tools.js` / `tools/regex-tester.html` / `assets/css/regex-tools.css` | Regex execution, ranges, captures, examples, and safe result rendering. |
| `assets/js/crypto-tools.js` / `tools/crypto-lab.html` / `assets/css/crypto-tools.css` | AES-GCM and RSA-OAEP local encryption/decryption and key helpers. |
| `assets/js/hash-tools.js` / `tools/hash-generator.html` / `assets/css/hash-tools.css` | Digest conversion and local File API controller. |
| `assets/js/id-tools.js` / `tools/uuid-ulid-generator.html` / `assets/css/id-tools.css` | UUID/ULID generation, validation, batching, copy, and download. |
| `assets/js/tool-catalog.js`, `sitemap.xml`, `README.md`, static tests | P1 dashboard and deployment registration after tool work is complete. |

### Task 1: Diff Checker

**Files:**
- Modify: `assets/js/data-tools.js`, `tools/json-diff.html`, `assets/css/data-tools.css`
- Modify: `tests/data-tools.test.js`

**Interfaces:**
- Produces: `diffText(beforeSource, afterSource, options)` returning `{ ok, value: { changes, comparedLines } }`; `diffJson` remains unchanged.

- [ ] **Step 1: Write failing tests** for normalizing whitespace/blank lines/case, changed/added/removed text lines, forced JSON errors, and automatic JSON fallback.
- [ ] **Step 2: Run** `node --test tests/data-tools.test.js` and observe the missing Diff Checker contract.
- [ ] **Step 3: Implement** pure text normalization/comparison and a controller mode selector that chooses existing `diffJson` only when required or both auto sources parse as JSON.
- [ ] **Step 4: Add** controls and localized labels for mode, ignore options, change count, copy, and accessible status without removing the existing JSON inputs.
- [ ] **Step 5: Run** `node --test tests/data-tools.test.js` and commit the isolated worktree change.

### Task 2: JWT Inspector

**Files:**
- Create: `assets/js/jwt-tools.js`, `assets/css/jwt-tools.css`, `tools/jwt-inspector.html`, `tests/jwt-tools.test.js`

**Interfaces:**
- Produces: `decodeJwt(token)`, `summarizeJwtClaims(payload, nowMs)`, `verifyJwtSignature(token, keySource)` returning Promise result objects with explicit verification state.

- [ ] **Step 1: Write failing tests** for Base64URL decoding, claims/time summaries, valid and invalid HS256 signatures, `none` rejection, and unsupported-algorithm rejection.
- [ ] **Step 2: Run** `node --test tests/jwt-tools.test.js` and observe expected missing exports.
- [ ] **Step 3: Implement** compact-token parser, algorithm/key compatibility map, PEM SPKI parser, Web Crypto HMAC/RSA-PKCS1/PSS/ECDSA verification, and strict error results.
- [ ] **Step 4: Add** bilingual page sections for decoded header/payload, time/claim summary, key entry, separate verify output, copy buttons, and persistent decode-is-not-verification notice.
- [ ] **Step 5: Run** `node --test tests/jwt-tools.test.js` and commit the isolated worktree change.

### Task 3: Regex Tester

**Files:**
- Create: `assets/js/regex-tools.js`, `assets/css/regex-tools.css`, `tools/regex-tester.html`, `tests/regex-tools.test.js`

**Interfaces:**
- Produces: `testRegex(pattern, flags, source)` returning `{ ok, value: { matches, count } }`, with match ranges and capture group values.

- [ ] **Step 1: Write failing tests** for global capture output, non-global execution, invalid flags/pattern errors, and empty global matches finishing without a loop.
- [ ] **Step 2: Run** `node --test tests/regex-tools.test.js` and observe the missing tester module.
- [ ] **Step 3: Implement** regex compilation and iterative match extraction using a cloned global regex and explicit `lastIndex` advancement for empty matches.
- [ ] **Step 4: Add** a bilingual page with pattern, flags, target text, result table, match count, warning, cheat sheet, copyable examples, and live feedback.
- [ ] **Step 5: Run** `node --test tests/regex-tools.test.js` and commit the isolated worktree change.

### Task 4: Crypto Lab and Hash Generator

**Files:**
- Create: `assets/js/crypto-tools.js`, `assets/css/crypto-tools.css`, `tools/crypto-lab.html`, `tests/crypto-tools.test.js`
- Create: `assets/js/hash-tools.js`, `assets/css/hash-tools.css`, `tools/hash-generator.html`, `tests/hash-tools.test.js`

**Interfaces:**
- Produces: `aesEncrypt`, `aesDecrypt`, `rsaEncrypt`, `rsaDecrypt`, `generateAesMaterial`, `hashBytes`, `digestEncodings`; every encryption helper returns Promise result objects rather than throwing input errors.

- [ ] **Step 1: Write failing crypto tests** for AES-GCM round trip, 256-bit key and 12-byte IV validation, RSA-OAEP round trip with generated test keys, and malformed Base64/PEM rejection.
- [ ] **Step 2: Run** `node --test tests/crypto-tools.test.js` and observe missing exports.
- [ ] **Step 3: Implement** UTF-8/Base64 helpers, PEM import/export handling, AES-GCM and RSA-OAEP SHA-256 only, plus a page with algorithm separation and local-only warning.
- [ ] **Step 4: Write failing hash tests** for SHA-256 known digest, SHA-384/512 selection, Base64 output, expected-digest equality, and unsupported algorithm rejection.
- [ ] **Step 5: Run** `node --test tests/hash-tools.test.js`, implement browser digest helpers/File API page wiring, then run both test files and commit the isolated worktree change.

### Task 5: UUID / ULID Generator

**Files:**
- Create: `assets/js/id-tools.js`, `assets/css/id-tools.css`, `tools/uuid-ulid-generator.html`, `tests/id-tools.test.js`

**Interfaces:**
- Produces: `generateUuidV4()`, `generateUuidV7(nowMs)`, `generateUlid(nowMs, randomBytes)`, `validateIdentifier(value)`, and `generateIdentifiers(kind, count)`.

- [ ] **Step 1: Write failing tests** for UUID v4/version bits, UUID v7/version and RFC variant bits, deterministic ULID encoding/validation, invalid values, and batch count limits.
- [ ] **Step 2: Run** `node --test tests/id-tools.test.js` and observe missing exports.
- [ ] **Step 3: Implement** cryptographically random UUID v4/v7 and ULID generators, validation, 1–1,000 bounded batches, and newline download output.
- [ ] **Step 4: Add** a bilingual page that explains unpredictable UUID versus sortable ULID use, provides validation/copy/download, and uses only local values.
- [ ] **Step 5: Run** `node --test tests/id-tools.test.js` and commit the isolated worktree change.

### Task 6: P1 catalog integration and complete verification

**Files:**
- Modify: `assets/js/tool-catalog.js`, `README.md`, `sitemap.xml`, `tests/tool-catalog.test.js`, `tests/static-site.test.js`

**Interfaces:**
- Consumes: committed tool page paths from Tasks 1–5.
- Produces: six P1 cards with static routes and final deployment documentation.

- [ ] **Step 1: Write failing catalog/static tests** asserting all six P1 routes exist, catalog records are available and no HTML references a remote script/API URL.
- [ ] **Step 2: Run** `node --test tests/tool-catalog.test.js tests/static-site.test.js` and observe missing P1 metadata.
- [ ] **Step 3: Register** P1 tool records, static routes, sitemap entries, and README tool list while retaining all twelve P0 records.
- [ ] **Step 4: Run** `npm test`, `git diff --check`, then start `python3 -m http.server 4173` and request every P1 page locally.
- [ ] **Step 5: Review** behavior with a browser for one state per P1 tool, then commit the integration change.

## Plan self-review

- **Spec coverage:** Tasks 1–5 map one-to-one to every P1 tool; Task 6 provides catalog, sitemap, README, and static verification. Security constraints are repeated in the JWT and Crypto tasks.
- **Placeholder scan:** No task leaves implementation or error behavior unspecified; the explicit algorithms, validation paths, and test targets are named.
- **Interface consistency:** All modules return `{ ok, value }`/`{ ok, message }` style results; P1 pages remain independent until Task 6.
