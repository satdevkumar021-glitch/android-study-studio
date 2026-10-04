# Rebuild delivery status

## Completed locally

- A separate Git repository: Android Study Studio, branch `codex/study-studio`.
- Migrated 97 lessons into canonical content files, preserving explanations, code, tables and practice questions.
- Replaced separate handwritten page shells with a shared TypeScript reader and reusable design system.
- Automatically generated topic catalog; adding a content file updates the library and preparation plans.
- Loaded chapters on demand; fingerprinted production assets configured for caching.
- Continuous article reading, optional practice-answer disclosures and chapter navigation.
- Search, engineering-area filters and completion filters.
- Local progress, saved reading position, completion tracking and validated progress import/export.
- 4-, 8- and 12-week plans balanced by estimated reading time, preserving the curriculum order.
- Responsive mobile navigation, dark mode, keyboard focus, skip link, reduced-motion and print styles.
- Firebase Hosting configuration and setup instructions.
- Optional clearly labeled manual sponsorship below the article, disabled by default.
- Automated validation workflow for GitHub Actions.
- Nine tests and production TypeScript/build checks pass.

## What this changes for learners

They can read the whole chapter without switching sections, find topics quickly, resume their study and follow a manageable preparation sequence. Progress can be moved to another device or domain through export/import.

## What this changes for maintainers

Layout and behavior are maintained once. The catalog is generated from lesson content instead of manually synchronized lists. Build checks reject invalid sections and executable content. The deployment output is generated, not hand-edited.

## Publishing status

Published to Firebase Hosting: https://android-study-studio-satdev.web.app/

Firebase project: `android-study-studio-satdev`. Public catalog, chapter reading and preparation plan verified after deployment. No custom domain has been purchased and third-party advertising is not activated. Public GitHub repository: https://github.com/satdevkumar021-glitch/android-study-studio.

## Deliberate limits

The preserved lessons have not all been technically fact-checked. Hash routes have limited individual-chapter SEO and social previews; future prerendering can use the same content model. Reading estimates exclude practical coding and revision time. Browser progress does not automatically follow users between domains. Advertising revenue is not guaranteed and third-party ads are not active.

## AdSense connection — 4 October 2026

The Firebase domain has been added to AdSense under publisher `pub-6403540175348297`. The account ownership meta tag and Google-provided ads.txt have been deployed. Google confirmed website ownership and accepted a review request; status is Getting ready. This is not approval to serve ads. No advertising SDK is active yet. Remaining steps: Google's site/account approval, resolve any payment onboarding notice, choose/configure the certified consent message and publish appropriate disclosures, then configure an approved ad unit or Auto ads. The older Weebly site was retained.

## Consent provider and launch draft

Google's built-in three-choice CMP (Consent, Do not consent, Manage options) has been selected and saved in AdSense. This is a provider configuration, not proof that a live message is integrated in the website. Site review and ad integration remain pending. `LINKEDIN-LAUNCH-POST.md` contains a launch draft describing the delivered study experience without job-search messaging or unverified open-source claims.
