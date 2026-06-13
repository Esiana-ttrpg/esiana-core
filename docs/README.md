# esiana-core documentation

Engineering records and internal platform specs for **maintainers**. User-facing, API, plugin author, and architecture explainers live in the [**docs wiki**](../../docs/README.md).

---

## Split

| Audience | Location |
|----------|----------|
| GMs, players, operators | [`docs/`](../../docs/) wiki |
| API integrators | [`docs/api/`](../../docs/api/) + `/api/docs` on running instance |
| Plugin authors | [`docs/plugin-development/`](../../docs/plugin-development/) |
| Platform learners | [`docs/architecture/`](../../docs/architecture/) |
| Core maintainers | **This tree** |

---

## This repo

| Directory | Contents |
|-----------|----------|
| [`audits/`](./audits/) | Export, migration, sign-off audits |
| [`security/`](./security/) | Threat models, tenant isolation reviews |
| [`migrations/`](./migrations/) | Migration history |
| [`architecture-internal/`](./architecture-internal/) | Deep platform specs (entity graph, projection semantics, etc.) |
| [`plugins/`](./plugins/) | Capability matrix appendix, interceptors, ecosystem engineering doc |
| [`deployment/`](./deployment/) | Object storage, operator internals |
| [`release/`](./release/) | RC checklists |
| [`plans/`](./plans/) | Internal design evolution |
| [`deferred-backlog.md`](./deferred-backlog.md) | Deferred scope ledger |

---

## OpenAPI runtime

Version-locked spec: [`backend/openapi/openapi.yaml`](../backend/openapi/openapi.yaml)  
Interactive explorer: `/api/docs` (ships with each release; not fetched from docs wiki)
