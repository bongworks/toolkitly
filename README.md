# Toolkitly

Static, browser-local utilities for links, data, time, and design work. The initial build includes a bilingual English/Korean dashboard and a JSON formatter.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/index.html`.

## Tests

```bash
npm test
```

The project has no runtime package dependencies. The interface loads Geist and JetBrains Mono from Google Fonts. Before a public launch, either document that provider in the privacy notice or self-host the font files.

## Deploy before publishing

1. Deploy the repository to a static host such as Cloudflare Pages, Vercel, or Netlify.
2. Replace every `https://example.com` occurrence in `robots.txt` and `sitemap.xml` with the final HTTPS domain.
3. Add the final contact address to `privacy.html`.
4. Add Search Console and ensure the sitemap is submitted after the domain is live.
5. If analytics or automatic advertising is enabled, update the privacy notice and configure consent handling for applicable regions before activating it.

## Product constraints

- Tool inputs stay in the browser by default.
- No user account, database, or server API is required for the current tools.
- GitHub links, favorites, and manual ad placeholders are intentionally excluded from the UI.
