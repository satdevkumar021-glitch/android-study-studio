# Android Study Studio

Live site: https://android-study-studio-satdev.web.app/

Repository: https://github.com/satdevkumar021-glitch/android-study-studio

A separate local rebuild of Satdev Kumar’s Android interview preparation library. It preserves 97 chapters while replacing duplicated page shells with one shared, responsive reader.

## Run locally

Use Node.js 22.12+ (or 24 LTS).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Development: http://127.0.0.1:8790 · production preview: http://127.0.0.1:8791

## Architecture and why

- `content/topics/*.json` is the canonical teaching content. Each chapter owns its metadata and section bodies, not an entire document layout.
- `scripts/build-content.mjs` validates content and generates a compact catalog plus individual chapter payloads.
- `src/main.ts` provides routing, library filters, adaptable preparation plans and the shared reader. TypeScript and Vite keep the application small without a large runtime framework.
- `src/styles.css` defines a consistent editorial design, responsive navigation, dark mode, print styles and reduced-motion support.
- A chapter loads only when opened. All its sections remain visible for continuous reading; optional answers use native accessible disclosures.
- Progress is local to the browser. Import/export lets people move it between devices and domains. There is no backend, tracking, AI service or advertising SDK in this preview.

Many HTML pages are not inherently poor architecture: generated static pages can be excellent for search engines. The old problem was repeated layout/behavior and competing catalogs. This version uses hash routes to keep static hosting simple. Its trade-off is limited per-chapter search indexing and social previews. If organic search becomes a priority, prerender topic URLs from this same content model; do not duplicate handwritten layouts again.

## Add a chapter

Add one JSON file to `content/topics`, following an existing chapter. Required fields: `id` (for example `42A`), `title`, `description`, `category`, `groupId`, `tier`, `tags` and `sections`. Each section has a unique `id`, a `title` and safe HTML in `html`. Then run `npm run build`. The catalog, library and preparation plan pick up the chapter automatically. Keep code escaped inside `<pre><code>`; scripts, inline styles and event handlers are rejected.

`npm run migrate -- /path/to/old/published/repository` is a one-time legacy import, not the normal authoring workflow. It overwrites canonical migrated content. The migration report in `public/data/migration-report.json` records preservation counts and repairs. This rebuild is not a complete technical fact-check of every legacy claim.

## Firebase Hosting

`firebase.json` hosts the production `dist` folder, caches fingerprinted assets and revalidates content. Hash routes need no blanket rewrite. After reviewing locally:

```sh
npm run build
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only hosting
```

Select your own Firebase project. The project `android-study-studio-satdev` has been created and deployed at https://android-study-studio-satdev.web.app/. No billing account has been linked and no custom domain has been purchased. Firebase gives a default `PROJECT.web.app` address. A custom domain is registered separately and connected in the Firebase console; there is no universal ₹45 domain price.

Firebase Spark Hosting currently includes 10 GB storage and 10 GB/month transfer. Free-tier limits still apply; transfer exhaustion can disable the site until the next month. Check current [Hosting pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing) and [custom domain setup](https://firebase.google.com/docs/hosting/custom-domain) before launch.

## Revenue without disturbing studying

Advertising is intentionally disabled for local review. `src/site-config.ts` contains a disabled manual sponsorship slot (`null`); supplying a reviewed HTTPS sponsor renders a labeled placement after the article, without an advertising SDK. A future clearly labeled sponsor placement below a finished chapter is the least disruptive starting point. Avoid overlays, sticky ads near reading controls and auto-inserted ads between explanations. AdSense requires useful original content, approval and privacy disclosures; consent requirements depend on audience. Revenue is not guaranteed. See [AdSense eligibility](https://support.google.com/adsense/answer/9724?hl=en) and [publisher policies](https://support.google.com/adsense/answer/1348695?hl=en).

## Validation

Tests check all migrated chapters, catalog uniqueness, section integrity and rejection of executable markup. Production build includes TypeScript validation. Browser review covers reading and responsive layout. Remaining launch work: your local review, Firebase project selection, custom domain decision, and any separate advertising approval. The current public GitHub Pages site is unchanged by this local rebuild.
