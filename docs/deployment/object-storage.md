# Object storage deployment

Esiana ships a **StorageDriver** registry with a built-in filesystem provider. S3-compatible remote storage is provided by the **`remote-object-storage`** global community plugin (install under `PLUGINS_DIR`, enable in Admin → System Plugins).

**Optional** means configuration-time (`STORAGE_PROVIDER=filesystem` is the default). The core Docker image does not bundle S3 support. Set `STORAGE_PROVIDER=s3-compatible` only when the plugin is installed and enabled.

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

## S3-compatible (`remote-object-storage` plugin)

Install from the community catalog (Admin → Plugins) or link locally via `pnpm run plugins:link` when developing beside [`community-plugins`](https://github.com/Esiana-ttrpg/community-plugins).

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

1. Install and enable **Remote Object Storage** in Admin → System Plugins.
2. Run MinIO with a bucket (e.g. `esiana-dev`).
3. Set env vars above with `S3_ENDPOINT=http://127.0.0.1:9000`.
4. Restart Esiana; confirm Admin → Storage shows `s3-compatible` healthy.
5. Upload a campaign image; confirm `Asset.url` is `s3://…` and `GET /api/assets/:id` succeeds.

If the plugin is installed but **disabled**, storage stays **degraded** with an Admin warning — Esiana does not silently fall back to filesystem while `STORAGE_PROVIDER=s3-compatible`.

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

Storage providers register via `registerStorageProvider()` from global plugins with the `storage:provider` permission. The **`remote-object-storage`** plugin ships as a pre-bundled ESM file (`manifest.json`, `backend/index.js`, `README.md` only at runtime — no `node_modules`).

## Deferred

- Filesystem → bucket migration job
- Storage quotas and lifecycle policies
- Admin UI for driver switching without restart
- Bucket-qualified pointers (`s3://{bucket}/{key}`)

Plan: [asset-storage-platform.md](../plans/asset-storage-platform.md)
