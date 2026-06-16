# Object storage deployment

Esiana ships a **StorageDriver** registry with a built-in filesystem provider and an optional **`@esiana/storage-s3`** infrastructure package for S3-compatible backends.

**Optional** means configuration-time (`STORAGE_PROVIDER=filesystem` is the default), not a campaign plugin. The `@esiana/storage-s3` package ships in the core Docker image and registers lazily at boot when available. Set `STORAGE_PROVIDER=s3-compatible` only when you intend to use remote object storage.

## Active write provider

Select the provider that receives **new uploads** via environment variable:

```txt
STORAGE_PROVIDER=filesystem          # default — local UPLOADS_DIR
STORAGE_PROVIDER=s3-compatible       # remote object storage
```

**Reads and deletes** route to the provider that **owns** each asset pointer (`/uploads/...` vs `s3://...`), so legacy filesystem assets keep working after switching the active write provider.

Misconfigured remote storage marks the active provider **degraded**: the app boots, Admin → Storage shows the error, new uploads return 503, existing assets continue to serve when their owning provider is healthy.

## Filesystem (default)

```txt
UPLOADS_DIR=../uploads
STORAGE_PROVIDER=filesystem
```

Asset rows store pointers like `/uploads/{uuid}.webp`. Delivery remains through `GET /api/assets/:id` (ACL-backed).

## S3-compatible (`@esiana/storage-s3`)

Works with AWS S3, MinIO, Cloudflare R2, Wasabi, DigitalOcean Spaces, and other S3 API backends.

```txt
STORAGE_PROVIDER=s3-compatible
S3_BUCKET=esiana-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Required for MinIO / R2 / most self-hosted endpoints:
S3_ENDPOINT=https://minio.example.com:9000
S3_FORCE_PATH_STYLE=true
```

New assets store pointers like `s3://{uuid}.webp` (bucket implied by `S3_BUCKET` for v1).

### MinIO smoke test (local)

1. Run MinIO with a bucket (e.g. `esiana-dev`).
2. Set env vars above with `S3_ENDPOINT=http://127.0.0.1:9000`.
3. Restart Esiana; confirm Admin → Storage shows `s3-compatible` healthy.
4. Upload a campaign image; confirm `Asset.url` is `s3://…` and `GET /api/assets/:id` succeeds.

## Object key layout (current)

Flat UUID filenames shared across providers (e.g. `{uuid}.webp`, `{uuid}-display.webp`). Campaign isolation is enforced at the **API / database** layer, not by bucket prefixes.

Future bucket-prefix layouts and migration jobs are deferred — see [asset-storage-platform.md](../plans/asset-storage-platform.md).

## Security

- Map and image assets inherit campaign ACL at `GET /api/assets/:id`.
- Do not expose public bucket listing.
- Large objects may redirect to presigned URLs when `STORAGE_REDIRECT_THRESHOLD_BYTES` is exceeded (capability: `redirectDelivery`).

## Admin visibility

**Admin → Storage** shows active driver health, registered providers (dynamic list), sanitized configuration, and operational metrics (exact for filesystem; bounded estimate for remote). Metrics are not billing-grade accounting.

## Plugin note

Storage providers register via `registerStorageProvider()` from infrastructure packages — not campaign plugins. The legacy `remote-object-storage` campaign plugin stub was removed in favor of `@esiana/storage-s3`.

## Deferred

- Filesystem → bucket migration job
- Storage quotas and lifecycle policies
- Admin UI for driver switching without restart
- Bucket-qualified pointers (`s3://{bucket}/{key}`)

Plan: [asset-storage-platform.md](../plans/asset-storage-platform.md)
