# Security policy

## Supported versions

Security fixes target the latest `main` branch. Older copies and forks should update to the latest source and dependency lockfile.

## Report privately

Use GitHub's **Security → Report a vulnerability** option for this repository. Include the affected file or URL, reproducible steps, likely impact and a minimal example. Do not include live credentials or other people's private data. Avoid publishing exploit details in public issues before a fix is available.

If the private report option is unavailable, use the maintainer's private LinkedIn messaging channel linked from the GitHub profile to arrange a secure report. Do not post sensitive details in a public comment. Response and fix times depend on maintainer availability; this project makes no guaranteed response-time promise.

## Scope and handling

Relevant reports include unsafe lesson markup, script injection, compromised dependencies and exposed credentials. Reproduce only on a local copy or a system you are authorized to test. Do not access other users' data or generate disruptive traffic on the live site.

The site stores study progress in browser storage; it is not suitable for sensitive data. Firebase deployment credentials must stay outside the repository. Never commit .env files, service-account keys, tokens, payment details or customer information. If a secret is exposed, revoke or rotate it; deleting the file alone does not remove it from history.

An open-source license defines reuse rights and warranty terms; it does not make software automatically secure. Review dependency updates and technical content before production use.
