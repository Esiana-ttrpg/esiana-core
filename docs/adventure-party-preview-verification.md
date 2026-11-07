# Adventure Party preview verification

Adventure Party preview is enabled. Character Party preview remains disabled.

## Contract

The server intersects shared Public/Party visibility with the authenticated campaign actor. It never selects an individual player. Ordinary player and published-public authorization remain unchanged.

The four formerly guarded entry points now return populated projections: Adventure hub, Quest hub, Thread hub, and direct wiki pages, including workspace-path resolution. Shared projection precedes block snippets, progress, references and derived results. It checks ancestry, lifecycle, narrative Secret status, revelation, future availability, private blocks and independently restricted relationships.

Secondary coverage includes tree navigation, backlinks/outlinks, structured references, integrity, link index, mention targets, hover previews/snippets, interpretive summaries, Party Knowledge, storyboard layouts, graph queries/projections, sessions and time tracking. Malformed audience parameters return 400. Hidden and cross-campaign pages return 403/404. Graph diagnostics remain a GM operation.

One wiki provider is mounted per audience. Switching discards the previous workspace state and pending responses. Party refresh does not first load a manager tree. Scenes and Storyboard support read-only Party navigation.

## Executed verification

- PostgreSQL 16 with all 45 repository migrations deployed; no `db push`, authorization stubs or security skips.
- Real-router fixture: manager, writer, player, outsider and anonymous access; successful primary and secondary responses; hidden ancestors and relationships; locked lifecycle, Secret, Draft, unrevealed and future content; shared/hidden session anchors and chronology counts; cross-campaign IDs; malformed/repeated audience parameters; independent block visibility; structured references and graph suppression manipulation.
- Edge browser against the enabled Vite frontend and the same real-router fixture: populated and empty campaigns, GM/Party/GM switching, Quests/Threads/Scenes/Storyboard, direct pages, refresh and history, delayed GM responses released after Party selection, rejected Party requests, desktop and 390px mobile, horizontal overflow, keyboard switching, and accessible toggle state/group semantics.
- Backend projection tests: 9 passed; chronology regression tests: 5 passed. Frontend focused tests: 6 passed. Backend and frontend TypeScript checks passed.

The browser test intercepts responses only for its explicit delay and rejection scenarios. Ordinary browser navigation uses the real API and migrated database. This is basic keyboard/semantic acceptance, not a full assistive-technology certification.

## Reproduce

In `backend`, set `TEST_DATABASE_URL` to an isolated PostgreSQL database with repository migrations applied, then run `pnpm test:adventure-party`. The test fails if the database URL is missing.

For browser acceptance, run Vite on port 5174 with `VITE_API_PROXY_TARGET=http://127.0.0.1:55440`. Set `ADVENTURE_BROWSER_URL=http://127.0.0.1:5174` for the fixture. Install Playwright, or set `PLAYWRIGHT_MODULE` to its local ESM entry point; the runner uses installed Edge. Set test-process request budgets `RATE_LIMIT_AUTHENTICATED_MAX`, `RATE_LIMIT_PUBLIC_MAX` and `RATE_LIMIT_EXPENSIVE_MAX` to `10000` for repeated automated navigation. Authorization middleware is unchanged. Run `pnpm test:adventure-party` again.

## Deliberate omissions

Party layouts preserve authorized node positions. Authored annotations, lane labels, manual edges and unknown plugin metadata lack independent audience policy and are omitted. Party does not expose GM graph diagnostics, orchestration conditions/outcomes, or editing tools. These omissions do not prevent reading visible quests, threads, scenes or their projected connections.
