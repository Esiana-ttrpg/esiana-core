# Chronology records and authored pages

Events and eras are campaign-scoped chronology records. An authored page is an optional normal wiki document linked by immutable page ID. Creating an event, era, or generated world event does not create a wiki page.

## Routes and identity

The existing campaign prefix is retained:

- `/campaigns/:handle/events` — Events directory, with All events and Event pages views.
- `/campaigns/:handle/events/:slug` — one event definition, including recurring definitions.
- `/campaigns/:handle/eras/:slug` — era detail, dates, overview, associated events and timeline navigation.

`ChronologyRoute` reserves slugs by campaign and entity type. IDs remain authoritative for relationships and occurrence identity. Renaming updates the canonical slug and retains every previous slug as an alias. Deleted records leave their URLs reserved until the campaign is deleted. Visible API records include their canonical slug and aliases; the client resolves aliases and replaces the URL with the canonical route. Missing or unauthorized records show an unavailable state.

Legacy event-page bookmarks, including initialization query strings, lead to event details. Existing event pages receive ordinary wiki workspace paths on the next wiki-tree load. `/pages/present` leads to the era interface.

## Page lifecycle and permissions

`CalendarEvent.wikiPageId` and nullable `CampaignEra.overviewPageId` identify optional documents. The migration links existing `event-<event-id>` pages without changing their IDs or contents. Existing era overview pages remain linked.

Create page calls the normal wiki creation API with `chronologyEventId` or `chronologyEraId`. Page creation and linking are atomic and require both normal page creation authority and chronology management authority. Initial page visibility matches the chronology record. Pages retain normal editor, metadata, permissions, search, citations and plugin behavior.

The chronology page-link API validates the record, page, campaign and viewer permissions. Chronology disclosure and wiki authorization are checked independently on each read. Hidden, scheduled, restricted and deleted linked documents are omitted from chronology responses; legacy era descriptions also respect block permissions. Unlinking or deleting a document preserves the chronology record. Deleting an era preserves its authored document. Calendar descriptions and authored page text are independent after initial seeding; reading or saving a page does not overwrite either description.

Event metadata is authoritative for operational consequences, including an explicitly empty set. Reads fall back to authorized legacy page metadata only when the event has no consequence set. Unlinking may import that legacy set once, but never replaces existing event consequences or unrelated event metadata. Consequence saves and unlinking serialize through the campaign row; saves do not modify wiki documents or create stub pages.

## Discovery and composition

The sidebar exposes directories, with separate Events and Eras destinations. The Events directory lists definitions once; occurrences stay in calendar, timeline and feed views. Directory rows and chronology details distinguish Page from Event only; search identifies authored Event pages and Era pages.

The event route's state object is the event definition, represented as a readable detail view. Its title and description are the focal region; date and occurrence links connect it to chronology. The directory is an index. Era detail retains the existing chronology studio, with one selected era and its historical context. These routes reuse the studio composition; scene pilots remain scoped to existing prose workspaces.

## Validation

`pnpm --dir backend test:eras` applies the committed migrations to a disposable SQLite database and covers chronology permissions, optional pages, slug collisions against current, historical and deleted-record reservations, subsequent page and chronology visibility changes, stale page consequences and explicit empty sets, recurring definitions, generated events, hidden/deleted links, non-destructive era deletion and operational backup round-tripping. Frontend interaction tests cover directory filters, page creation through the wiki API, readable page navigation and view-only controls.

The migration must be deployed before running the updated backend. It does not delete wiki documents. PostgreSQL uses the same portable table rebuild and inline foreign keys as SQLite.
