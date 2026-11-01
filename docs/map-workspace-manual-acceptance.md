# Map workspace acceptance checks

Automated checks use the existing frontend Node/tsx unit and React server-rendered
component tests, plus the backend map presence/visibility tests. They cover
geometry, layer serialization and filtering, preset application, permission
transitions, discard decisions, Escape priority, focus-wrap decisions, linked-pin
actions, and toolbar states. They do not simulate a browser or Leaflet layout.

Run `pnpm --filter @esiana/frontend test`. For backend map rules, run
`pnpm --filter @esiana/backend exec tsx --test src/lib/mapPresence.test.ts src/lib/mapPinVisibility.test.ts src/lib/mapLayer3ViewerLenses.test.ts src/lib/mapOverlayProjection.test.ts`.
These checks require no browser binaries, new test packages, or embedded database.

## Manual browser checks

Use a disposable campaign with editor and reader accounts, a rectangular map,
multiple layers, grouped pins linked to pages and maps, annotations, and hidden
or future objects. Include an empty map and a second map with different default
layers. Verify at desktop, 390px and 320px portrait, and a short landscape size.

- Enter fullscreen: artwork fills the canvas area; legend starts collapsed.
  Entering edit mode must not open it. Title, chronology, exit, lower-left zoom,
  and bottom dock remain readable over bright and dark artwork. Check light and
  dark themes, long titles, safe areas, and reduced-motion settings.
- Expand the legend: height follows content, long lists scroll internally, and
  empty areas of the overlay do not block the map or exit control. Search,
  layer/group toggles, and annotation filters affect only permitted content.
- Pan and zoom, start an area/path/circle, then enter and exit fullscreen. Zoom,
  center, vertices, active tool, and property drafts survive without resetting
  Leaflet. Complete each drawing; circles remain round and within image bounds.
- Place pins and text. A selected linked pin previews first; its explicit link
  opens the target. Verify drag-to-move and normal-page/embedded-map behavior.
- Change properties, cancel a discard prompt, and confirm a discard prompt.
  Refusal retains editing and the draft. Ending edit mode cancels drawing but
  retains selection of still-visible saved objects. Exiting fullscreen alone
  does not end editing. Simulate a failed save: show the error and retain drafts.
- Press Escape through a nested dialog, drawing/placement, properties, and
  fullscreen in order. Each keypress performs only one action. Tab/Shift+Tab stay
  in the applicable workspace/dialog; exit restores focus. Verify button
  activation with Space and Enter, and touch placement/panning.
- Select an object on narrow screens: properties collapse the legend and fit
  above the dock. No controls overlap zoom or exit, overflow the viewport, or
  become unreachable with the software keyboard open.
- Hide all layers, apply an empty preset, and switch maps. Hide-all stays empty;
  the empty preset changes epoch without changing layers; the new map uses its
  own defaults. Repeat rapid map switches while requests are delayed.
- As a reader, confirm editing tools and organization groups are absent. Revoke
  editor permission while a draft is open and refresh campaign state: editing
  disappears without a prompt that can retain access. Hidden/future content
  must not leak through search, selection, or stale responses.

Record the browser, viewport, account role, and result when performing these
checks. Browser automation remains a future project-wide testing decision;
this feature introduces no end-to-end test runner or browser dependency.
