# Session Notes: action and permission audit

Source audit for the Session Notes workspace migration. This records existing behavior, not browser or authorization acceptance.

## Navigation and controls

`SessionNotesView` keeps Notes, Attendance and Recaps as separate tabs. The Notes toolbar is present once the index has loaded; Refine provides a local text search when notes exist. Existing notebook headings and uncategorized notes form the session-note grouping and must remain intact.

| Action | Current entry points | Current UI eligibility and behavior to preserve |
| --- | --- | --- |
| New page | Labeled toolbar action, plus button, plus menu, and empty-state action | Campaign members; opens the existing session-note dialog when a timeline session exists. |
| Upload page | Separate toolbar button | Campaign members; existing upload dialog accepts `.txt`, `.docx`, and `.md`. The upload route also requires campaign membership. |
| New session | Plus menu; empty state when no sessions exist | GM or Writer role; opens the existing session creation dialog. |
| Schedule next session | Plus menu | GM or Writer role; opens the existing scheduling modal. |
| New heading/group | Plus menu | GM or Writer role **and** the index response's `canManage` flag. The server independently checks notebook-management permission. |
| Organize | Separate toolbar button | Same `canManage` condition; enables selection, bulk movement and deletion. Leaving organize mode clears its selection. Keep it separate from creation. |

The proposed migration should use the existing `CategoryIndexToolbar` creation-menu slot, supplying only the actions allowed by these existing conditions. Retain the existing dialogs, server checks, group management, local search, tabs and empty states. Upload must be available from the consolidated menu, and the create control must remain available when the notes list is empty. The empty-state first-session shortcut can remain contextual rather than becoming a second toolbar creation menu.

## Empty-state issue

When there are no timeline sessions, a member without the GM/Writer role sees “Write Session Note,” but `handleEmptyStateCreate` has no action for that case. The migration should give this state a working, permission-appropriate path and explain any session prerequisite, rather than leave a dead button. Verify the dialog and backend behavior before deciding whether creating a note is possible without a session.

## Verification for the migration

- Exercise manager, Writer, ordinary member and non-member states, including the server-provided management flag; do not infer server permission solely from a menu item.
- Check each menu item opens its existing flow and that creation, scheduling, upload, grouping and Organize still work in populated and empty campaigns.
- Check Notes, Attendance and Recaps navigation; Refine and grouped/uncategorized results; menu dismissal, keyboard access and narrow layouts.
- Preserve existing error and loading handling and test the no-session ordinary-member path.
