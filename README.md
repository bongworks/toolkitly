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

## Production build

```bash
cp .env.example .env
npm run build
```

`npm run build` creates the deployable `dist/` directory. The build reads `.env` when present; `.env.example` documents every supported key:

- `PUBLIC_SITE_URL` — the public HTTPS origin used for canonical URLs, social metadata, `robots.txt`, and `sitemap.xml`. Its default is `https://tools.bongworks.co.kr`.
- `GA4_MEASUREMENT_ID` — optional. Leave blank to disable GA4; only an unspaced `G-...` measurement ID is emitted to the public runtime config.
- `ADSENSE_CLIENT_ID` — optional. Leave blank to disable AdSense; only an unspaced `ca-pub-...` client ID is emitted to the public runtime config.
- `GOOGLE_CONSENT_REQUIRED` — defaults to `false`. It enables consent gating only when its value is the literal lowercase string `true`.

Only the validated Google IDs and the consent flag are generated into `dist/assets/js/runtime-config.js`. Do not put secrets or unrelated values in `.env`; it is a build input, never a browser-fetched configuration file, and must stay uncommitted.

When optional Google integrations are not configured, the project has no remote font/script requests. It has no runtime package dependencies and uses system UI and monospace font stacks, so the browser-local tools can operate from static hosting without sending tool inputs to a third party.

## Build and deploy

For local source preview, serve the repository root:

```bash
python3 -m http.server 4173
```

This is useful for tool development, but it is not the production artifact: the source contains no generated runtime configuration, SEO transforms, or integration injection. Do not upload the repository root as a static site.

For deployment, configure the host with `npm run build` as its build command and publish `dist/`. The build replaces the template origin in `dist/robots.txt` and `dist/sitemap.xml`, and transforms every public HTML page with the configured canonical origin. Set `PUBLIC_SITE_URL` before building if the production domain differs from its default. Add the final contact address to `privacy.html`, then submit the deployed sitemap to Search Console after the domain is live.

### GitHub Actions deployment

Push a `release-X.Y.Z` tag or run **Build and deploy** manually to deploy through the M2 self-hosted runner. The workflow writes `.env` only for the build, runs tests, builds `dist/`, then atomically switches the `launchd` service to the new release. It serves the site on `0.0.0.0:34561`; if the local health check fails, the previous release is restored.

Configure these repository-level GitHub Actions Variables before the first run:

- `TOOLKITLY_DEPLOY_ROOT` — required absolute path where releases, logs, and the `current` link are kept.
- `PUBLIC_SITE_URL`, `GA4_MEASUREMENT_ID`, `ADSENSE_CLIENT_ID`, and `GOOGLE_CONSENT_REQUIRED` — copied to the build-only `.env`; their behavior is described above.

Do not store secrets in these variables. The build validates and emits only the intentionally public Google integration IDs into the browser artifact.

## Optional Google integrations

With a valid `GA4_MEASUREMENT_ID`, the generated shared module loads GA4 and sends only its documented sanitized page and allowlisted tool-action events. Before enabling GA4, disable Enhanced Measurement and other automatic event collection in the GA4 data stream and Google tag account configuration, including form interactions, site search, outbound clicks, and file downloads. This is an account-side requirement; site code cannot enforce it.

With a valid `ADSENSE_CLIENT_ID`, the same module loads the AdSense Auto ads loader. It creates no ad slots: Auto ads placement remains controlled by AdSense and its account configuration. Neither setting verifies a Google account, property, approval, policy status, or live serving result.

For a deployment that requires consent, set `GOOGLE_CONSENT_REQUIRED=true` and integrate a CMP or consent bootstrap that sets `window.__TOOLKITLY_CONSENT__ = true` before the generated integration module executes. Until that exact boolean is present, neither Google script loads. This project does not provide a CMP; ensure the consent flow and privacy disclosures meet the requirements that apply to the deployment.

If the host uses a Content Security Policy, start from the host's current policy and test the built site with the chosen Google integrations enabled. Allow the local static assets and only the third-party script/network destinations required by the enabled Google services, using their current official documentation and the browser's CSP reports to refine the policy. Do not treat a copied host list as exhaustive: Google endpoints and required directives can vary by product and configuration.

## Product constraints

- Tool inputs stay in the browser by default.
- No user account, database, or server API is required for the current tools. QR generation uses a locally vendored MIT-licensed encoder; see `assets/vendor/NOTICE-qrcode.txt`.
- GitHub links, favorites, and manual ad placeholders are intentionally excluded from the UI.
