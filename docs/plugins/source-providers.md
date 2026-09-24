# Source providers

Source references are core-authored citation semantics. Plugins may register a provider that searches, refreshes, and optionally opens external sources; providers never own editor UI or campaign authorization.

## Reference contract

`SourceIdentity` (`providerId` + `sourceId`) identifies a source. A complete `SourceReference` is one citation instance and also carries cached metadata plus an optional opaque locator. Instances are never deduplicated because the same source can be cited at different locations.

Wiki Markdown stores selected-text citations as `<span data-esiana-source="v1:BASE64URL_JSON">…</span>` and cursor citations as `<span data-esiana-source-atom="v1:BASE64URL_JSON"></span>`. The payload is UTF-8 JSON encoded as unpadded base64url. Broken marks degrade to their authored text; broken atoms are discarded without affecting adjacent prose.

## Plugin contract

A plugin declares the `sourceProvider` capability and `source:provider` permission, then calls `context.registerSourceProvider`. Its provider ID must equal the plugin ID. Providers implement `searchSources` and `resolveSource`; `resolveOpenTarget` is optional and currently returns only `{ type: "url", url }`.

Core authenticates the caller, authorizes campaign membership, checks that the provider is enabled, validates inputs, invokes the provider with a three-second timeout, normalizes output, and sanitizes open targets. Providers receive campaign and user IDs only after these checks. An `AbortSignal` is advisory; core also ignores stale client results.

Provider icons are presentation-only. They may be plugin asset URIs or policy-approved HTTP(S) images, never markup or components. Citations do not persist provider icons and fall back to the generic citation glyph when the provider is unavailable.

## Security and deferred work

Pasted external HTML cannot create citation marks through the editor paste path. Citation data never grants access: resolve and open operations always repeat campaign authorization. Payload size, depth, field, and collection limits are enforced.

OAuth, provider credential refresh, authenticated fetch helpers, and the Grimmory implementation are intentionally outside this foundation.
