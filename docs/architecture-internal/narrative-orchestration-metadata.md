# Narrative orchestration metadata governance (future)

**Status:** Planned — not required for schema freeze

As Layer 2 features accumulate (`narrativeBranchGraph`, `narrativeConsequenceRules`, `threadMetadata`, publication hooks), wiki page metadata risks becoming opaque JSON without tooling.

## Planned capabilities

| Capability | Purpose |
|------------|---------|
| Schema registries | Versioned shapes per domain |
| Validation tooling | CI + runtime guards |
| Editor affordances | Structured forms, not raw JSON |
| Migration helpers | Version bumps on import/rebuild |

## Convention today

All orchestration blobs use explicit version keys:

- `thread-metadata-v1`
- `narrative-branch-v1`
- `narrative-consequence-v1`
