# Contributing

Corrections, practical examples, accessibility improvements and new chapters are welcome.

## Before you start

Search existing issues. For a large change, open an issue describing the learner's problem and proposed approach. Keep changes focused and respect others' experience. Security vulnerabilities belong in private reports, not public issues; see SECURITY.md.

## Local setup and checks

Use Node.js 24 LTS, then run:

```sh
npm ci
npm test
npm run build
npm run dev
```

For interface changes, check phone and desktop layouts, keyboard navigation, dark mode and reading flow. Include screenshots when useful. Do not test by clicking real advertising units.

## Teaching content

Edit `content/topics/*.json`, not generated files under `public/data`. Preserve unique topic/section IDs because existing progress references them. Add a new chapter by following an existing JSON file; run the content build so it appears in the catalog and plans.

Explain when to use the concept, its trade-offs, a small runnable example and common mistakes. Link primary Android/Kotlin or tool documentation for technical claims. Label illustrative code and assumptions. Escape code markup inside pre/code. Do not include copied proprietary material, customer code, private project details or secrets. Preserve third-party attribution and license notices. AI-assisted contributions must be reviewed by their author for accuracy and rights to contribute.

## Pull requests

Use a branch such as `docs/gradle-example` or `fix/mobile-reading`. State the problem, what changed and the checks performed. New behavior needs meaningful tests; documentation edits generally do not need new tests. The GitHub workflow runs tests and a production build. Maintainers review changes before merging; deployments are separate.

## Licensing

By submitting a contribution, you agree that your original contribution can be distributed under the repository's MIT license. You must have the right to contribute it. Existing third-party dependencies and attributed material retain their own terms; do not relicense them.
