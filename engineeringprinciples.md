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