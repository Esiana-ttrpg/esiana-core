# Wiki OPDS Feed

Campaign-scoped plugin that exposes **OPDS 1.2** Atom catalogs of **Public** wiki pages for campaigns where it is enabled.

## Enable

1. **Campaign Settings → Campaign Plugins** — sync registry, **Install** Wiki OPDS Feed, enable for the campaign, save.
2. For local dev without registry install: `npm run plugins:link` in `esiana-core`, then install from **Available campaign plugins**.
3. Ensure the campaign has **Public viewable** enabled.
4. Mark lore pages **Public** visibility (Party/DM-only pages are never syndicated).

## URLs

| Resource | URL |
|----------|-----|
| OPDS catalog | `GET /api/public/plugin-runtime/wiki-opds-feed/c/{campaignSlug}/opds/catalog.atom` |
| Page markdown | `GET /api/public/plugin-runtime/wiki-opds-feed/c/{campaignSlug}/opds/pages/{pageId}.md` |

When the plugin is disabled for a campaign, or the campaign is not public viewable, these URLs return **404** JSON.

The catalog URL is shown in Campaign Settings when the plugin is enabled.

## E-reader setup

Add the catalog URL as a **catalog / OPDS** source in KOReader, Calibre, Aldiko, or any OPDS 1.2 client. Acquisitions are `text/markdown` — client support varies.

## Security

- Only `Public` wiki pages are included; session notes are excluded.
- Party/DM-only content never appears in the feed.

See [`esiana-core/docs/plugins/opds-wiki-feed-study.md`](../../esiana-core/docs/plugins/opds-wiki-feed-study.md) for the full mapping study.
