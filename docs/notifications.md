# Notifications (Phase 8)

Esiana v0.9.0 ships an in-app notification system with optional SMTP email delivery.

## Channels

- **In-app** — stored in the `Notification` table; surfaced via the header bell and `/notifications`.
- **Email** — sent through configured SMTP when the user enables email for a notification type and the instance has valid SMTP settings.

## User preferences

Account Settings → **Notifications** lets each user toggle in-app and email delivery per event type and set a global mute-until timestamp.

## Admin settings

Admin → General Settings:

- **SMTP** — host, port, credentials, from address; includes a “Send test email to me” button.
- **Notifications** — bell badge poll interval (30–300 seconds, default 60). Polling pauses while the browser tab is hidden.

## Notification types

| Type | Typical recipient |
|------|-------------------|
| `JOIN_REQUEST_ACCEPTED` / `DENIED` | Applicant |
| `JOIN_REQUEST_RECEIVED` | DM / Co-DM |
| `ROLE_CHANGED` | Affected member |
| `OWNERSHIP_TRANSFER_*` | Offer target, initiator, or full roster |
| `MEMBER_DEPARTED` | DM / Co-DM |
| `SESSION_PUBLISHED` / `CHANGED` / `CANCELLED` / `REMINDER_24H` | Party members |
| `RSVP_UPDATED` | DM / Co-DM (debounced digest) |
| `EXPORT_READY` / `EXPORT_FAILED` | Requesting user |
| `IMPORT_COMPLETE` / `IMPORT_FAILED` | Wizard creator |

## Session scheduling & RSVP

Per-session OOC schedules live on `CampaignSessionSchedule` (linked to session timeline points). DMs publish schedules from session notes; players RSVP from the dashboard Session Clock widget or session pages.

## Ownership transfer

Primary DMs initiate a transfer to a Co-DM; the target must accept on `/c/:slug/transfer-ownership` before roles swap.

## Async export

Campaign Settings → Data & backup → **Export in background** queues a ZIP job and notifies the requester when the staging asset is ready (3-day TTL).
