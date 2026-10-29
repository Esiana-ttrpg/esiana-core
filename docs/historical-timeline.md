# Historical Timeline

Chronology's Timeline displays one configured clock at a time. Its primary surface
is a historical canvas, with calendar-aware date ticks, era background regions,
duration bars, and milestones. Era labels occupy a separate strip, not event lanes.

Major and Minor events are enabled initially; Notices can be enabled in Navigation
& filters. Category and importance changes preserve the viewport. Each clock keeps
its viewport while the Timeline remains mounted. A new clock view centers on campaign
time at approximately an annual scale, falling back to loaded occurrences, an
applicable era, or the first supported year.

Drag horizontally, use horizontal trackpad scrolling or Shift+wheel, or use the
zoom controls. Ctrl/Cmd+wheel zooms around the pointer. Touch supports horizontal
panning and two-finger pinch zoom while retaining vertical scrolling. With the canvas
focused, arrow keys pan and plus/minus zoom. Event and cluster controls support
keyboard activation.

The layout has at most twelve event lanes. When overlapping events exceed that
budget, eleven lanes contain individual events and the final lane contains clusters.
Major events receive priority. Cluster choosers retain complete membership in stable
importance/date/identity order and support individual inspection or zooming to the
period. Labels and enlarged hit targets participate in packing to avoid collisions.

Timeline and Calendar share the responsive inspection container: an overlay on
desktop and a dismissible bottom sheet on mobile. The existing read-only details,
Lore Page actions, authorization, and shared editing dialog remain authoritative.
Editing uses the existing full-screen mobile dialog and its dirty-form guards.
Opening or closing Timeline inspection does not resize or reset the canvas.

## Data coverage and calendar limits

The existing campaign-scoped chronology endpoint returns capped recurrence results
and daily duration-continuation records. It reports a requested window but does not
apply that window to occurrence generation. Timeline consumes that existing bounded
response; panning does not request unlimited history or imply that unloaded regions
contain no events. A compact coverage notice remains visible and the fit action is
labeled **Fit to Loaded Events**, including when the server does not report truncation.
Expansion warnings remain available in the coverage notice's tooltip.

Daily continuations normalize to one interval per calendar, base event, and recurrence
index. The original representative occurrence identity is retained separately from
the full occurrence boundaries. Geometry uses date parts, day offsets, duration,
and the existing custom-calendar arithmetic; repeated epoch values in legacy
occurrence records do not determine recurrence positions. All labels, eras, and
cluster membership derive from the authorized API response.

Coordinates use calendar-local absolute days with bigint epoch arithmetic and
viewport-relative pixel conversion. The existing calendar engine supports years
starting at 1; Timeline does not add negative-year semantics. Calendar definitions,
models, recurrence generation, and public API contracts are unchanged.

## Validation

Run the frontend suite, frontend production build (including TypeScript), and i18n
validation. Focused geometry/layout coverage is in `historicalTimeline.test.ts`.
The existing optional `frontend/scripts/verify-chronology-ui.mjs` browser harness
covers Calendar and Timeline inspection, editing/dirty guards, clusters, focus,
viewport preservation, mobile sheets, touch navigation, and read-only permissions.
It uses existing optional browser tooling; no browser or visualization dependency
is added to the application.
