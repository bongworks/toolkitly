# Toolkitly

Static, browser-local utilities for links, data, time, and design work. The bilingual English/Korean dashboard includes 12 P0 tools: UTM Builder, URL Parser, URL Encoder/Decoder, JSON Formatter, Diff Checker, JSON/CSV/YAML Converter, Base64 Encoder/Decoder, Timestamp Converter, Timezone Planner, QR Code Generator, Contrast Checker, and Color Converter.

P1 adds JWT Inspector (including local signature verification with a user-provided secret or public key), Regex Tester, Crypto Lab (AES-GCM and RSA-OAEP), Hash Generator, and UUID / ULID Generator. All tool inputs remain local to the browser.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/index.html`.

## Tests

```bash
npm test
```

The project has no runtime package dependencies or remote font/script requests. It uses system UI and monospace font stacks so the full site can operate from static hosting without sending tool data to a third party.

## Deploy before publishing

1. Deploy the repository to a static host such as Cloudflare Pages, Vercel, or Netlify.
2. Replace every `https://example.com` occurrence in `robots.txt` and `sitemap.xml` with the final HTTPS domain.
3. Add the final contact address to `privacy.html`.
4. Add Search Console and ensure the sitemap is submitted after the domain is live.
5. If analytics or automatic advertising is enabled, update the privacy notice and configure consent handling for applicable regions before activating it.

## Product constraints

- Tool inputs stay in the browser by default.
- No user account, database, or server API is required for the current tools. QR generation uses a locally vendored MIT-licensed encoder; see `assets/vendor/NOTICE-qrcode.txt`.
- GitHub links, favorites, and manual ad placeholders are intentionally excluded from the UI.
