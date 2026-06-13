# Player Journal

TodoMVC-style **campaign plugin** demonstrating:

- `plugin:data` for per-user journal storage
- `dashboard` UI slot
- Calling **core campaign APIs** from the frontend (publish excerpt → `POST /api/c/:slug/wiki`)
- `emitDomainEvent` on publish (`player-journal:entry:published`)

## Enable

1. Campaign Settings → Plugins → enable **Player Journal**
2. `npm run plugins:link` from esiana-core for local dev

## Architecture

| Concern | Implementation |
|---------|----------------|
| Private notes | `PluginData` key `journal:{userId}` |
| Dashboard UI | `dashboard` slot (vanilla DOM) |
| Publish | Browser session → core wiki API; plugin marks entry published |
| Activity feed | Wiki create triggers core `CampaignActivity` |

## API (plugin runtime)

- `GET /api/plugin-runtime/player-journal/entries?campaignId=`
- `PUT /api/plugin-runtime/player-journal/entries` — body `{ campaignId, entries }`
- `POST /api/plugin-runtime/player-journal/entries/:id/published` — body `{ campaignId, wikiPageId }`

## Tutorial notes

This plugin intentionally uses **frontend → core API** for wiki publish so authors see the real integration path without Prisma access from plugins.

See also: [temporal integrity](../../esiana-core/docs/architecture-internal/temporal-integrity.md) for provenance on imports/seeders.
