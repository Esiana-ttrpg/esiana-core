# Adventure Party Preview — Complete and Verify Reduced-Context Projections

Adventure Party preview is enabled. The four core 503 paths now return reduced responses. Implementation and executed verification are recorded in [Adventure Party verification](../docs/adventure-party-preview-verification.md). Ordinary player access and published public campaign experiences retain their existing authorization.

## Acceptance scope

- Apply the server-resolved shared-party audience to every Adventure, Quest, Thread, Scene and related data request, including time tracking and direct page navigation. It must only narrow the requesting actor's permissions and must not impersonate an individual player.
- Filter hidden records, independent relationship visibility, lifecycle and revelation before deriving storyboard, graph, arc and calendar results, counts and metadata. Project authored layout details only where their access can be established; decide whether remaining omissions are an acceptable Party experience.
- Verify backlinks, related identifiers, cached data, secondary requests and authorization on raw endpoints. Never fall back to manager-context data on a rejected preview.
- Add database-backed HTTP fixtures covering manager, writer, ordinary player and unauthorized/cross-campaign access, hidden ancestors and relationships, draft/future content and manipulated requests. Run without security-critical skips.
- Verify audience switches, pending request races, refresh and navigation, plus desktop/mobile, empty/populated campaigns and accessibility in a browser.
- Enable Party only for paths covered by the completed contract and tests. Public is not a workspace perspective.

## Context

`docs/campaign-workspace-ux-audit.md` records the current implementation and links to the PostgreSQL/browser verification. Character Party preview is implemented separately and awaits its own PostgreSQL HTTP and first-hand browser acceptance; do not infer its safety from Adventure's tests.
