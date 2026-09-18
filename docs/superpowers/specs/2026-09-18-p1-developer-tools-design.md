# P1 Developer Tools Design

## Goal

Extend Toolkitly with six browser-local P1 developer utilities while retaining the existing P0 tools, bilingual interface, static hosting model, and no-upload privacy posture.

## Product scope

P1 contains one expanded existing tool and five new tool pages:

1. **Diff Checker** extends `tools/json-diff.html`. When both sources are valid JSON it retains path and type-aware structural comparison. Otherwise it compares text line by line. Users can select automatic, JSON, or text mode and choose whether whitespace, blank lines, and case participate in text comparison.
2. **JWT Inspector** decodes compact JWT header and payload, summarizes registered claims, converts `iat`, `nbf`, and `exp` to readable times, and verifies the compact token signature with a user-supplied key.
3. **Regex Tester** runs a JavaScript regular expression against text and shows matches, zero-based ranges, capture groups, a match count, flags, examples, and a compact cheat sheet.
4. **Crypto Lab** encrypts/decrypts RSA-OAEP SHA-256 payloads and AES-GCM 256-bit payloads. RSA inputs use PEM keys; AES uses Base64 key, Base64 IV, and Base64 ciphertext. It can generate a fresh AES key and IV locally.
5. **Hash Generator** hashes text or a selected local file using SHA-256, SHA-384, or SHA-512, displays Hex and Base64 encodings, and compares an optional expected digest without uploading the file.
6. **UUID / ULID Generator** creates UUID v4, UUID v7, or ULID values in batches, validates an entered value, and copies or downloads its generated list.

The explicitly excluded P1 items in `docs/mvp-tool-plan.md` remain excluded.

## Architecture

Each P1 tool owns one document shell, stylesheet, browser controller, and Node-testable ES module. Pure functions must not access `document` at import time; page wiring stays below the exported utilities. The existing `tool-page.js` header/bootstrap and CSS tokens/components remain shared unchanged.

P1 metadata is added only after all tool modules are merged. The catalog remains the source of dashboard cards, and `sitemap.xml`, `README.md`, and static-page tests are updated from that final catalog.

## Security and privacy

- Every transformation, key import, file read, generated value, and signature verification is local to the browser. No runtime dependencies, remote APIs, storage, analytics, or network requests are added.
- JWT decoding is never presented as verification. Decode status and signature verification status are separate visible outputs. The inspector supports HS256/384/512 with a UTF-8 secret, RS256/384/512 and PS256/384/512 with a PEM SPKI public key, and ES256/384/512 with a PEM SPKI public key. `none`, malformed compact tokens, unsupported algorithms, incompatible keys, and invalid signatures are rejected with useful errors.
- Crypto Lab supports only RSA-OAEP SHA-256 and AES-GCM with a 256-bit key. It generates a new 12-byte AES-GCM IV when requested and never offers ECB, custom ciphers, or password hashing. PEM parsing and Base64 decoding reject invalid input.
- Hash Generator labels itself as an integrity digest tool and explicitly says it is not for password storage.
- Regex Tester warns that complex browser regular expressions may take time to execute. It catches invalid patterns and avoids infinite iteration for global empty matches.

## UX and accessibility

- New pages follow the existing dark/light, English/Korean, keyboard-accessible page shell.
- Results and errors use `aria-live` status output; copy/download actions give localized feedback.
- Raw user-provided data is inserted with `textContent`, never `innerHTML`.
- Each page tells the user that values remain in the browser; crypto and JWT pages additionally warn users not to share secrets.

## Verification

- Unit tests cover each pure function's normal result, invalid input, and security-sensitive rejection path.
- Static-site tests prove every cataloged P1 page exists and that no source uses remote script or API URLs.
- `npm test`, `git diff --check`, and static HTTP smoke requests cover the assembled site.
