# Adventure Party Preview — Complete and Verify Reduced-Context Projections

Party preview is intentionally disabled. The existing reduced-context code is a foundation and must not be treated as an end-to-end authorization contract. Preserve ordinary player access and published public campaign experiences.

## Work

- Apply the server-resolved shared-party audience to every Adventure, Quest, Thread, Scene and related data request, including time tracking and direct page navigation. It must only narrow the requesting actor's permissions and must not impersonate an individual player.
- Filter hidden records, independent relationship visibility, lifecycle and revelation before deriving storyboard, graph, arc and calendar results, counts and metadata. Project authored layout details only where their access can be established; decide whether remaining omissions are an acceptable Party experience.
- Verify backlinks, related identifiers, cached data, secondary requests and authorization on raw endpoints. Never fall back to manager-context data on a rejected preview.
- Add database-backed HTTP fixtures covering manager, writer, ordinary player and unauthorized/cross-campaign access, hidden ancestors and relationships, draft/future content and manipulated requests. Run without security-critical skips.
- Verify audience switches, pending request races, refresh and navigation, plus desktop/mobile, empty/populated campaigns and accessibility in a browser.
- Enable Party only for paths covered by the completed contract and tests. Public is not a workspace perspective.

## Context

`docs/campaign-workspace-ux-audit.md` records the current containment, request inventory, reduced-context infrastructure and test-database limitations. Character Party preview is separately disabled pending its own domain audit; do not infer its safety from Adventure's tests.
