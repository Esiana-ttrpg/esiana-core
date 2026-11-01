# Frontend build toolchain

The frontend uses Vite 8.3.5, `@vitejs/plugin-react` 6.1.2, and Vitest 5.0.5
with the repository's Node 26 requirement and pnpm 9.15.9. The pnpm lockfile is
authoritative; npm lockfiles are ignored. Vite and the React plugin were already
updated in the committed manifest and lockfile when this migration was reviewed;
the local installation still contained Vite 6.4.4 and plugin-react 4.7.0.

## Configuration and compatibility

- Use Vite 8's default browser target, Rolldown dependency optimizer/bundler, Oxc
  JSX transform/minifier, and Lightning CSS minifier. No legacy browser targets,
  CommonJS compatibility flags, manual chunk settings, or esbuild fallback.
- Keep `react()` for automatic JSX and React Fast Refresh. The frontend has no
  custom Babel pipeline or React Compiler. Backend Babel usage for OpenAPI route
  inventory and its dependencies are preserved.
- Tailwind's existing Vite plugin accepts Vite 8. The shared TypeScript resolver
  uses the supported `resolveId` hook; retain it to avoid stale shared CommonJS
  emits. Aliases, extension priority, port 5173, API/uploads proxies, and the
  product-version constant retain their existing purposes.
- The top-level draggable debug `define` also applies to optimized dependencies;
  the duplicate deprecated `optimizeDeps.esbuildOptions` has been removed.
- The config uses `import.meta.dirname` and an explicit `.ts` import, with
  `allowImportingTsExtensions` in its no-emit TypeScript project, to avoid Vite's
  native config-loader warnings.
- Leaflet CSS uses package-relative PNG URLs so Vite bundles them rather than
  leaving production requests to `/node_modules`. These small images are inlined.
- Vitest 5.0.5 declares compatibility with Vite 8 and Node 26. Existing Node tests
  continue to use `node:test` and tsx; existing Vitest tests run separately through
  the same Vite config. The runner discovers all frontend test files and retains
  the five shared suites previously included. Both runners execute even if one fails.

## Validation on 2026-10-29

| Check | Result |
| --- | --- |
| Windows Node 26.12.1, installed dependency versions | Vite 8.3.5, React plugin 6.1.2, Vitest 5.0.5 |
| `pnpm --filter @esiana/frontend exec tsc -b --force` | Passed |
| `pnpm --filter @esiana/frontend build` | Passed with native defaults |
| `pnpm --filter @esiana/frontend test` | Node: 653/653 passed; Vitest: 14/14 passed in six files; no skipped tests |
| `docker build -f docker/esiana.Dockerfile -t esiana-vite8-migration:local .` | Passed, including frontend/backend builds and nginx configuration check, using Node 26.13.0 Alpine |
| Runtime image inspection | Static frontend only; no frontend node_modules, Vite, Vitest, React plugin, Rolldown, or Tailwind Vite plugin |
| Browser development startup | Real unauthenticated app loaded with API response fixtures; port override 5187 |
| React Fast Refresh | Temporary component harness retained counter and editor content after a source edit |
| Production component smoke | Tiptap formatting/Markdown, application highlight extension, Leaflet image/zoom/CSS, React grid layout, campaign URL helpers/navigation, lazy React chunk, and JSZip CommonJS import passed |
| Production nginx browser startup | Real unauthenticated application loaded from the Docker image using API response fixtures |
| Docker static asset graph | All 13 emitted JS chunks parsed; 17 HTML/CSS/JS/static references resolved with appropriate content types; campaign deep links returned the SPA |
| `git diff --check` | Passed |

Browser checks used headless Edge's DevTools protocol and a temporary isolated
component harness. No Playwright, browser automation dependency, or embedded
database was added. The existing Dockerfile's separate build/runtime stages need
no changes for this migration.

The newly discovered `locationAtlasListing.test.ts` failure was an incomplete
fixture: its index rows included the Silverwood parent, but its `flatPages` and
derived `pageById` lookup omitted that parent. Production callers build the lookup
from the wiki tree; parent titles are intentionally resolved there. Adding the
missing parent to the fixture preserves the `Silverwood · Northern Reach`
expectation and application behavior. The complete suite, forced typecheck, and
production build pass after this one-line fixture correction. Test discovery
remains enabled for all 667 tests (43 additional Node tests and 14 Vitest tests
beyond the old configured runner's 610 tests).

## Remaining issues and validation limits

- The main local production chunk is approximately 5.38 MB (1.43 MB gzip), above
  Vite's 500 kB warning threshold. Thirty ineffective dynamic-import warnings
  concern modules that are also statically imported, including English locale
  JSON, wiki helpers, and mapScene. No warning was suppressed or artificial chunk
  boundary introduced. App routes are currently eagerly imported in `App.tsx`;
  the lazy-loading smoke check uses the isolated harness, not an existing lazy
  application route. Runtime plugin blob imports retain `@vite-ignore`.
- Authenticated editor save/load, campaign authorization, plugin execution, live
  map persistence, and end-to-end campaign navigation against a running backend
  were not verified. Browser component smoke checks do not establish those flows.
  Cross-browser checks beyond Edge were not performed.
- The workspace install prints an existing Prisma preinstall support message
  naming Node 20/22/24, although installation and the Node 26 Docker build complete.
  Dependency metadata queries print an npm warning about pnpm's `node-linker`
  setting. Dependency resolution also reports existing deprecations for
  react-grid-layout, @types/bcryptjs, and prebuild-install. These were not upgraded.
- Docker's existing backend import smoke check prints a root product-version
  fallback warning. It is outside the frontend migration and was left unchanged.

Migration references: [Vite 6 to 7](https://v7.vite.dev/guide/migration),
[Vite 7 to 8](https://vite.dev/guide/migration), and
[React plugin documentation](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react).
