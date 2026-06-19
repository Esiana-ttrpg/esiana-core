# Esiana plugins (runtime directory)

Esiana loads enabled plugins from **`PLUGINS_DIR`** (default: this folder). This directory is a **runtime install target** — plugin packages are not vendored in `esiana-core`.

## Operators

1. Admin → **Plugins & Integrations** → confirm registry URL (default: community-plugins `registry.json` blob link)
2. **Sync Registry** → install → enable plugins

Default registry URL:

```text
https://github.com/Esiana-ttrpg/community-plugins/blob/main/registry.json
```

See [Self-hosting: installation](../../docs/self-hosting/installation.md) and [`community-plugins/README.md`](../../community-plugins/README.md).

## Local development

Copy first-party catalog packages from a sibling `community-plugins` checkout:

```bash
pnpm run plugins:link
```

Or install via Admin after syncing the registry. Linked packages are **local-dev provenance** — they do not appear in the discovery catalog.

Restart the backend after manifest changes.

## Plugin authors

- **Start here:** [Plugin development](../../docs/plugin-development/getting-started.md)
- **Publish to catalog:** [Publishing to the registry](../../docs/plugin-development/publishing-to-registry.md)
- Host architecture (engineering): [`docs/plugins/phase-10-ecosystem.md`](../docs/plugins/phase-10-ecosystem.md)

Runtime routes mount under `/api/plugin-runtime/{plugin-id}/…`
