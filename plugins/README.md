# Esiana plugins (runtime directory)

Esiana loads enabled plugins from **`PLUGINS_DIR`** (default: this folder). The **catalog** of installable packages lives in the sibling [`community-plugins`](../../community-plugins/) repo — not here.

## Operators

1. Admin → **Plugins & Integrations** → set registry URL (default: community-plugins `registry.json`)
2. **Sync Registry** → install → enable plugins

See [Self-hosting: installation](../../docs/self-hosting/installation.md) and [`community-plugins/README.md`](../../community-plugins/README.md).

## Local development

Copy catalog packages into this folder:

```bash
npm run plugins:link
```

Or install via Admin after pinning real commit SHAs in `community-plugins/registry.json`.

## Plugin authors

- **Start here:** [Campaign model](../../docs/architecture/campaign-model.md) → [Plugin development](../../docs/plugin-development/getting-started.md)
- **30-min hello-world:** [`example-plugin/README.md`](../../community-plugins/example-plugin/README.md)
- Manifest format: [`community-plugins/README.md`](../../community-plugins/README.md)
- Host architecture (engineering): [`docs/plugins/phase-10-ecosystem.md`](../docs/plugins/phase-10-ecosystem.md)
- REST reference: `/api/docs` when running backend locally (version-locked to that instance)

Runtime routes mount under `/api/plugin-runtime/{plugin-id}/…`
