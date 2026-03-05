# alfred-devdocs

[![CI](https://github.com/blackboxprogramming/alfred-devdocs/actions/workflows/ci.yml/badge.svg)](https://github.com/blackboxprogramming/alfred-devdocs/actions/workflows/ci.yml)
[![CodeQL](https://github.com/blackboxprogramming/alfred-devdocs/actions/workflows/codeql.yml/badge.svg)](https://github.com/blackboxprogramming/alfred-devdocs/actions/workflows/codeql.yml)
[![Release](https://github.com/blackboxprogramming/alfred-devdocs/actions/workflows/release.yml/badge.svg)](https://github.com/blackboxprogramming/alfred-devdocs/actions/workflows/release.yml)

Alfred workflow for searching [DevDocs.io](https://devdocs.io/) documentation directly from Alfred.

**Version**: 4.1.0 | **Bundle ID**: `com.yannickglt.alfred4.devdocs` | **License**: GPL-2.0

## Features

- Search 100+ documentation sets from DevDocs.io
- Per-documentation keyword triggers (e.g., `javascript`, `python`, `react`)
- Global search across all added documentation (`doc` keyword)
- Three-tier relevance ranking (exact prefix > partial match > type match)
- Documentation aliasing (e.g., `ng` for `angular`)
- Configurable cache lifetime (default: 7 days)
- HTTP proxy support with basic authentication
- QuickLook preview with Shift key

## Install

### From Release (Recommended)

Download the latest `DevDocs.alfredworkflow` from [Releases](https://github.com/blackboxprogramming/alfred-devdocs/releases) and double-click to install.

### Manual

```bash
git clone https://github.com/blackboxprogramming/alfred-devdocs.git
cd alfred-devdocs/src/scripts
composer install --no-dev
# Then symlink or copy the src/ directory to your Alfred workflows folder
```

## Quick Start

```
cdoc:add javascript    # Add JavaScript documentation
doc array.map          # Search across added docs
javascript map         # Search within JavaScript docs only
```

## Configuration Commands

| Command | Description |
|---------|-------------|
| `cdoc:add <doc>` | Add a documentation to your workflow |
| `cdoc:remove <doc>` | Remove a documentation from your workflow |
| `cdoc:list [query]` | List all available documentations (optionally filtered) |
| `cdoc:all` | Add all available documentations (not recommended for performance) |
| `cdoc:nuke` | Remove all documentations from your workflow |
| `cdoc:refresh [doc]` | Refresh cache for a specific doc or all added docs |
| `cdoc:alias <alias> <doc>` | Create a keyword alias for a documentation |
| `cdoc:unalias <alias>` | Remove a documentation alias |

## Usage

### Search within a specific documentation

Each added documentation gets its own keyword trigger:

```
javascript forEach     # Search JavaScript docs for "forEach"
python list            # Search Python docs for "list"
react useState         # Search React docs for "useState"
```

### Global search

Use the `doc` keyword to search across all added documentations:

```
doc map                # Search all docs for "map"
```

### Preview

Press **Shift** on any result to preview the documentation page via QuickLook.

### Custom URL Template

Set the `TEMPLATE` environment variable in Alfred to customize result URLs:

```
$baseUrl$documentation/$path     # Default: opens devdocs.io
```

Available variables: `$baseUrl`, `$documentation`, `$docalt`, `$name`, `$path`

## HTTP Proxy

Set these environment variables in Alfred's workflow configuration:

| Variable | Description |
|----------|-------------|
| `HTTP_PROXY` | Proxy URL (e.g., `tcp://proxy.example.com:8080`) |
| `HTTP_PROXY_AUTHORIZATION` | Base64-encoded `user:password` for basic auth |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `https://devdocs.io/` | DevDocs base URL |
| `CACHE_LIFE` | `7` | Cache lifetime in days (-1 to never expire) |
| `TEMPLATE` | `$baseUrl$documentation/$path` | URL template for results |

## Cloudflare Worker (Optional)

A Cloudflare Worker is included for edge-caching DevDocs API responses, reducing latency for users worldwide.

### Setup

```bash
cd cloudflare-worker
npm install
npx wrangler kv:namespace create DOCS_CACHE
# Update wrangler.toml with the KV namespace ID
npx wrangler deploy
```

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /docs/docs.json` | Cached list of all documentations |
| `GET /docs/:slug/index.json` | Cached documentation index |
| `GET /cache/status` | Cache status for debugging |

To use the worker, set `BASE_URL` in Alfred to your worker URL (e.g., `https://devdocs-proxy.yourname.workers.dev/`).

## Development

### Requirements

- PHP >= 7.4 with extensions: curl, json, xml, simplexml
- Composer 2.x
- Alfred 4+ (macOS)

### Testing

```bash
php tests/WorkflowsTest.php
```

### CI/CD

All GitHub Actions are **pinned to commit hashes** for reproducibility:

- **CI** (`ci.yml`): PHP lint, syntax check, unit tests across PHP 7.4-8.3, workflow packaging
- **Release** (`release.yml`): Builds and publishes `.alfredworkflow` on version tags
- **Automerge** (`automerge.yml`): Auto-merges Dependabot patch/minor updates
- **CodeQL** (`codeql.yml`): Weekly security scanning
- **Stale** (`stale.yml`): Closes inactive issues/PRs after 60+14 days

### Dependencies

All dependencies are pinned to specific versions:

| Dependency | Version | Reference |
|------------|---------|-----------|
| `rodneyrehm/plist` | v2.0.0 | `a59040c1c86188eec89de43f8827b42a0bd36028` |
| `actions/checkout` | v4.2.2 | `11bd71901bbe5b1630ceea73d27597364c9af683` |
| `shivammathur/setup-php` | v2.31.1 | `c541c155eee45413f5b09a52248675b1a2f3b754` |
| `actions/upload-artifact` | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| `softprops/action-gh-release` | v2.2.2 | `da05d552573ad5aba039eaac05058a918a7bf631` |
| `dependabot/fetch-metadata` | v2.3.0 | `d7267f607e9d3fb96fc2fbe83e0af444713e90b7` |
| `github/codeql-action` | v3.28.0 | `48ab28a6f5dbc2a99bf1e0131198dd8f1df78169` |
| `actions/stale` | v9.1.0 | `5bef64f19d7facfb25b37b414482c7164d639639` |
| `wrangler` | 3.99.0 | npm pinned |

## Security

See [SECURITY.md](SECURITY.md) for the security policy and vulnerability reporting.

## License

[GNU General Public License v2.0](LICENSE)
