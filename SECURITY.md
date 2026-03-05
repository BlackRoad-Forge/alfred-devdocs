# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.1.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in alfred-devdocs, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please send an email to the repository maintainer with:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact assessment
4. Suggested fix (if any)

You should receive a response within 72 hours acknowledging receipt.

## Security Considerations

This workflow:
- Fetches data from `devdocs.io` over HTTPS
- Caches documentation indices locally on your machine
- Does not transmit any personal data
- Supports HTTP proxy with optional basic authentication
- All network requests go to the configured `BASE_URL` (default: `https://devdocs.io/`)

## Dependencies

- **rodneyrehm/plist v2.0** (commit `a59040c1c86188eec89de43f8827b42a0bd36028`) - MIT licensed plist parser
- All GitHub Actions are pinned to specific commit hashes
