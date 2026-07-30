# esiana-core documentation

Engineering records and internal platform specs for **maintainers**. User-facing, API, plugin author, and architecture explainers live in the [**docs wiki**](../../docs/README.md).

Agent doctrine (current decisions only): [AGENTS.md](../AGENTS.md), [engineeringprinciples.md](../engineeringprinciples.md), [experience-doctrine.md](./experience-doctrine.md), [density-doctrine.md](./density-doctrine.md).

---

## Split

| Audience | Location |
|----------|----------|
| GMs, players, operators | [`docs/`](../../docs/) wiki |
| API integrators | [`docs/api/`](../../docs/api/) + `/api/docs` on running instance |
| Plugin authors | [`docs/plugin-development/`](../../docs/plugin-development/) |
| Platform learners | [`docs/architecture/`](../../docs/architecture/) |
| Core maintainers | **This tree** |

Historical Cursor plans live in the docs wiki [`plans/`](../../docs/plans/) folder — not an agent load path for normal coding.

---

## This repo

| Directory | Contents |
|-----------|----------|
| [`audits/`](./audits/) | Current operational audits (portability, migration, content packs) |
| [`security/`](./security/) | Threat models, tenant isolation reviews |
| [`migrations/`](./migrations/) | Migration history |
| [`architecture-internal/`](./architecture-internal/) | Deep platform specs (load only for the named subsystem) |
| [`plugins/`](./plugins/) | Capability matrix appendix, interceptors, ecosystem engineering doc |
| [`deployment/`](./deployment/) | Object storage, operator internals |
| [`release/`](./release/) | Release checklists |
| [`archive/`](./archive/) | Explicit historical material — not default reading |

---

## OpenAPI runtime

Version-locked spec: [`backend/openapi/openapi.yaml`](../backend/openapi/openapi.yaml)  
Interactive explorer: `/api/docs` (ships with each release; not fetched from docs wiki)
