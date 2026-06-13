# Temporal integrity

Esiana distinguishes **what kind of write** happened (`WriteProvenance`) from **how much temporal trust** the platform grants (`TemporalAuthority`).

## Timestamp categories

| Category | Mutable via provenance? | Example |
|----------|-------------------------|---------|
| Historical provenance | Yes (trusted paths only) | Imported note from 2022 |
| System activity | No | Restore job row `createdAt = now` |
| Derived analytics | Recomputed | Writing Pulse from `WikiPageStats` + `NarrativeEvent` |

## Provenance vs authority

Clients may send `temporal.provenance` and `temporal.metadata` on wiki create/layout writes. The host resolves `TemporalAuthority` — clients cannot set `system` or `trusted-import` directly.

| Provenance | Typical authority | Effect |
|------------|-------------------|--------|
| `user` | `none` | No timestamp override |
| `import` | `untrusted` / `trusted-import` | Partial vs full preservation |
| `restore` | `system` (job) | Full restore from backup |
| `seed` | `trusted-import` with `campaign:seed` | Campaign seeder / automation |
| `migration` | `system` (admin) | One-shot migrations |

## API shape

Temporal metadata is embedded in normal domain writes only — there is no standalone “change timestamps” endpoint.

```json
{
  "title": "Blackwater Keep",
  "blocks": [],
  "temporal": {
    "provenance": "seed",
    "preserveTemporalHistory": true,
    "metadata": {
      "createdAt": "2024-06-01T12:00:00.000Z",
      "updatedAt": "2024-06-01T14:00:00.000Z"
    }
  }
}
```

Implementation: [`backend/src/lib/temporalProvenance.ts`](../../backend/src/lib/temporalProvenance.ts).

## Narrative events

`NarrativeEvent.source` mirrors write provenance. Optional `metadata.authority` supports feed filtering (e.g. exclude seed data from live Writing Pulse).
