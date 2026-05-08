# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the dBaronX security contact placeholder:

- Contact: `security-contact-placeholder@dbaronx.example`

Replace this placeholder with the authorized security contact before public launch. Do not include secrets, private keys, seed phrases, or sensitive customer data in an initial report unless the security contact requests a secure transfer method.

## Coordinated disclosure

Do not publicly disclose exploit details, proof-of-concept code, private logs, customer data, or bypass instructions before dBaronX has confirmed, fixed, and safely deployed a remediation.

## Supported branches

- The production branch is supported for security fixes.
- Active release branches may be supported when they are used for a current production deployment.
- Experimental, abandoned, or local-only branches are not supported unless the dBaronX maintainer explicitly says otherwise.

## Secret leak response

If a secret is exposed in a commit, issue, chat, log, screenshot, or support ticket:

1. Treat the secret as compromised.
2. Revoke or rotate the exposed value immediately.
3. Review logs for unauthorized use.
4. Remove the exposed value from active systems and public views where possible.
5. Document the timeline, scope, rotation evidence, and follow-up controls.
6. Do not rely only on deleting the message or commit; assume copies may exist.
