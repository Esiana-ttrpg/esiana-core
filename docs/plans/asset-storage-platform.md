# Asset Storage Platform

Shipped snapshot for pre-1.0 storage infrastructure (follows [asset-upload-governance.md](./asset-upload-governance.md) Phases 1–2).

## Scope shipped

- **Storage registry** — `StorageProviderRegistration`, provider capabilities, health states (`healthy` / `degraded`), `getRegisteredProviders()` without driver instantiation
- **Degraded boot** — misconfigured active provider does not crash the app; uploads return 503; Admin Storage shows config errors
- **Pointer-owned routing** — `parseStoragePointer()` + `resolveDriverForPointer()`; active provider controls writes only
- **Infrastructure package** — `@esiana/storage-s3` registers `s3-compatible` provider (AWS S3, MinIO, R2, Wasabi, DO Spaces)
- **Pointer formats (v1)** — filesystem: `/uploads/{key}`; s3-compatible: `s3://{key}`
- **Admin Storage** — health, sanitized config, capability-driven metrics (exact filesystem / bounded estimate remote), manual refresh

## Platform invariants

| Concern | Rule |
|---------|------|
| New writes | `STORAGE_PROVIDER` → `getActiveStorageDriver()` |
| Reads / deletes | Pointer scheme → owning provider via `resolveDriverForPointer()` |
| Structured references | `/api/assets/{id}` only (governance Phase 2) |
| Storage columns | Provider-managed pointers — not raw keys |

## Environment

```txt
STORAGE_PROVIDER=filesystem          # default
STORAGE_PROVIDER=s3-compatible       # remote writes

# S3-compatible (required when active)
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=                           # MinIO / R2 / etc.
S3_FORCE_PATH_STYLE=true               # default when endpoint set
```

## Explicit cuts (this pass)

- Storage quotas / lifecycle policies
- Admin UI for live driver switching or DB-stored credentials
- `Asset.storageKey` / mixed-driver migration job
- Inline / editor-body media interceptor

## Deferred follow-up

- **Network fetch hardening** — companion to storage registry work: writes are hardened via `assetIngest`; remote reads/downloads are not yet unified — see [asset-upload-governance.md](./asset-upload-governance.md) Phase 3
- Unified pointer schemes (`filesystem://{key}`)
- Bucket-qualified pointers (`s3://{bucket}/{key}`)
- Presigned redirect caching on `/api/assets/:id`
- Remote orphan detection
- Full remote metrics (background job)

## Docs

- Operator guide: [object-storage.md](../deployment/object-storage.md)
- Governance (complete): [asset-upload-governance.md](./asset-upload-governance.md)
