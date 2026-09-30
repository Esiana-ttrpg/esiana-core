# Engineering Principles

## Database Agnosticism

Core functionality must not depend on vendor-specific SQL features.

Avoid:
- PostgreSQL-only syntax
- SQLite-only behavior
- engine-specific triggers

All migrations and queries should remain portable through Prisma abstractions where possible.

## Multi-Tenant Isolation

Campaigns are isolated tenants.

No cross-campaign leakage should occur:
- queries
- caches
- search indexing
- plugin access
- exports

Tenant boundaries are a core security model.

## Data Sovereignty

Users own their campaign data.

The platform should prioritize:
- exportability
- inspectable formats
- backup safety
- migration resilience
- minimal lock-in

## API-First Architecture

All core functionality should be accessible through stable APIs.

Frontend code should avoid privileged direct access patterns when equivalent APIs can exist.

## Plugin System

Plugins are capability-constrained integrations, not unrestricted code execution.

The core platform remains authoritative over:
- permissions
- provenance
- temporal integrity
- tenant boundaries

## Rate Limiting

Rate limiting is an abuse-control layer only. It must not alter authentication,
authorization, visibility, or public/private access semantics.

Identity for rate-limit buckets comes from existing session cookies and
user-generated API tokens — there is no separate credential system for limits.

### Policies (cumulative)

Named policies may stack on a single request and each consumes an independent budget:

| Policy | Default scope | Typical use |
|--------|---------------|-------------|
| `authenticated` | account (`user:<id>`, else IP) | Normal authenticated traffic |
| `mutation` | account (skips GET/HEAD/OPTIONS) | Writes |
| `expensive` | account (overridable to `ip`) | Uploads, exports, heavy reads |
| `public` | IP | Auth/public surfaces |
| `admin` | account | System admin routes |
| `apiKey` | per API token key | Bearer traffic (stacked with account policies) |

Policies are cumulative: an expensive API-token POST consumes
`authenticated` + `mutation` + `expensive` + `apiKey`. For API users the
effective ceiling is the per-key limit while all of a user's keys together
remain bounded by the account-wide limit. Generating additional API keys or
operating across multiple campaigns does not multiply the account allowance.

### Storage

`RATE_LIMIT_STORE=memory` is the only supported value (in-process
`MemoryStore`, suitable for single-node / self-hosted). Unknown values fail
configuration validation. A future distributed adapter would extend the store
factory and accepted env values together — Redis is not a selectable mode today.

Set `TRUST_PROXY=true` when behind a reverse proxy so IP buckets use the
client address from `X-Forwarded-For` (one trusted hop).

### Coverage

Every statically mounted HTTP operation must have at least one effective
rate-limit policy unless listed in
`backend/src/lib/rateLimit/coverage.exemptions.ts` with a documented reason.
Run `npm run rate-limit:audit` from `backend/` to print the inventory.
