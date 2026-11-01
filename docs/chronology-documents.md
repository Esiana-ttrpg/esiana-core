# Chronology records and authored pages

Events and eras are campaign-scoped chronology records. An authored page is an optional normal wiki document linked by immutable page ID. Creating an event, era, or generated world event does not create a wiki page.

## Routes and identity

The existing campaign prefix is retained:

- `/campaigns/:handle/events` — Events directory, with All events and Event pages views.
- `/campaigns/:handle/events/:slug` — one event definition, including recurring definitions.
- `/campaigns/:handle/event-pages/:pathKey` and `/event-pages` - the authored Events wiki workspace.
- `/campaigns/:handle/era-pages/:pathKey` and `/era-pages` - the authored Eras wiki workspace.
- `/campaigns/:handle/eras/:slug` — era detail, dates, overview, associated events and timeline navigation.

`ChronologyRoute` reserves slugs by campaign and entity type. IDs remain authoritative for relationships and occurrence identity. Renaming updates the canonical slug and retains every previous slug as an alias. Deleted records leave their URLs reserved until the campaign is deleted. Visible API records include their canonical slug and aliases; the client resolves aliases and replaces the URL with the canonical route. Missing or unauthorized records show an unavailable state. New slugs preserve Unicode letters, numbers and combining marks and normalize to NFC; existing reserved URLs remain valid. Restoring a canonical slug demotes other current routes for that entity while retaining them as aliases. Restoring a historical alias does not change the current route.

Known authored documents resolve through the normal wiki workspace registry before interpreting a legacy URL. This includes old `event-<id>` document IDs and prior generic Pages bookmarks. Only unknown legacy event links lead to chronology details. An unknown `/pages/present` link leads to the era interface; an existing era document opens in its wiki workspace.

## Page lifecycle and permissions

`CalendarEvent.wikiPageId` and nullable `CampaignEra.overviewPageId` identify optional documents. The event link has a named nullable Prisma relation and an inline database foreign key: hard page deletion sets the link to null, and page ID updates cascade. Campaign authorization remains enforced by the existing APIs. The migration links existing `event-<event-id>` pages without changing their IDs or contents. Existing era overview pages remain linked. Both document kinds have durable wiki ownership: `EVENTS` or `ERAS`, a standard path key, and a system-category parent (`chronology_events` or `chronology_eras`). This extends the existing workspace registry, wiki tree, page browser, search index and module-scope rules. It does not introduce a second document system.

Create page calls the normal wiki creation API with `chronologyEventId` or `chronologyEraId`. Page creation and linking are atomic and require both normal page creation authority and chronology management authority. Initial page visibility matches the chronology record. Pages retain normal editor, metadata, permissions, search, citations and plugin behavior.

The chronology page-link API validates the record, page, campaign and viewer permissions. Chronology disclosure and wiki authorization are checked independently on each read. Hidden, scheduled, restricted and deleted linked documents are omitted from chronology responses; legacy era descriptions also respect block permissions. Unlinking or deleting a document preserves the chronology record. Deleting or unlinking an event or era preserves its authored document and workspace ownership. The document remains browsable and searchable even without a chronology association. Calendar descriptions and authored page text are independent after initial seeding; reading or saving a page does not overwrite either description. Era writes use the explicit nullable `description` field; omission preserves authored text. The `overview` display projection is read-only and is never persisted as a description. The era form refreshes the list once before navigating to a saved era.

Event metadata is authoritative for operational consequences, including an explicitly empty set. Reads fall back to authorized legacy page metadata only when the event has no consequence set. Unlinking may import that legacy set once, but never replaces existing event consequences or unrelated event metadata. Consequence saves and unlinking serialize through the campaign row; saves do not modify wiki documents or create stub pages. GET and PUT return the same authorized linked-page state, with a null page ID for inaccessible, deleted or unlinked documents.

## Discovery and composition

The sidebar exposes chronology directories, with separate Events and Eras destinations. Each has a Browse authored pages link into the normal wiki browser. Authored pages expose authorized links back to associated chronology records, independently of their wiki route. The Events directory lists definitions once; occurrences stay in calendar, timeline and feed views. Directory rows and chronology details distinguish Page from Event only; search identifies authored Event pages and Era pages.

The event route's state object is the event definition, represented as a readable detail view. Its title and description are the focal region; date and occurrence links connect it to chronology. The directory is an index. Era detail retains the existing chronology studio, with one selected era and its historical context. Chronology record routes reuse the studio composition. Authored event and era documents use the existing codex composition and scene profiles; their wiki indexes use the hub composition.

## Validation

`pnpm --dir backend test:eras` applies the committed migrations to a disposable SQLite database and covers chronology permissions, optional pages, slug collisions against current, historical and deleted-record reservations, subsequent page and chronology visibility changes, stale page consequences and explicit empty sets, recurring definitions, generated events, hidden/deleted links, non-destructive era deletion and operational backup round-tripping. Frontend interaction tests cover directory filters, page creation through the wiki API, readable page navigation and view-only controls.

Schema migrations apply automatically on container start (PostgreSQL and SQLite). The process does not start against an outdated schema. The migration does not delete wiki documents. PostgreSQL uses the same portable table rebuild and inline foreign keys as SQLite.

## Workspace ownership migration

Startup backfills Event and Era wiki ownership once per campaign (`chronologyWorkspacesInitialized`). The same repair remains a defensive fallback on wiki-tree, path resolution, and search until that campaign is claimed, then those reads skip the tree scan. It creates system folders only when authored documents exist, reuses existing folders, retains document IDs and all authored data, and reindexes moved documents. Prior workspace/path-key coordinates are retained as wiki route aliases. Root folders are protected through the existing system-page deletion rules. `pnpm --dir backend db:migrate:chronology-workspaces` is an optional retry hatch, not part of the normal upgrade.

Chronology creation alone never creates a document or wiki folder. Page creation and linking assign wiki ownership atomically, and unlinking or chronology deletion leaves that ownership intact. Wiki page titles and paths are independent of event renames.

Campaign cloning remaps links from the source events already loaded in memory, and only assigns a destination page when that document was copied. The workspace integration test covers legacy workspace-less documents, new pages through the actual wiki creation API, normal wiki reads and category browsing, authorized search, prior workspace bookmarks, renamed events, event/era unlinking and deletion, and idempotence without duplicate documents. Frontend routing tests distinguish existing authored documents from genuinely unknown legacy event links.
