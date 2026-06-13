# Quest card properties (Type, Date, Tags)

**Status:** Implemented  
**Scope:** Wiki-native quest metadata + wiki page tags.

## Schema

- `questType: string | null` — free text; UI datalist: Main, Side, Character, Faction, Downtime
- `questDate: { year, month, day } | null` — master fantasy calendar parts
- Tags: native `WikiPage` tag relation (not metadata)

Clearing date: `PATCH { metadata: { questDate: null } }` removes the key from stored metadata.

## UI

- **Edit** (page settings only): [`QuestCardProperties`](../../frontend/src/components/quest/QuestCardProperties.tsx) in [`QuestMetadataEditor`](../../frontend/src/components/quest/QuestMetadataEditor.tsx)
- **Read-only on hub**: [`QuestCardPropertySummary`](../../frontend/src/components/quest/QuestCardPropertySummary.tsx) on list + Kanban cards
- Date display via [`formatQuestDateLabel`](../../frontend/src/lib/chronologyCalendar.ts) + full `FantasyCalendarLike`
- Kanban still supports drag for status + `boardOrder` only
