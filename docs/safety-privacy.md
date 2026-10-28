# Safety & Privacy requests

Safety & Privacy lives in User Settings and Campaign Settings. It is a private request conversation, not a moderation or disciplinary system.

Campaign members have the safety.submit capability by default. Campaign owners have safety.manage; other roles need an explicit campaign capability grant. Global administrators receive no request-content access. Reviewers are disclosed before submission, and the API rejects submission when that recipient list changes. Granting reviewer access exposes existing requests too.

Personal request endpoints use session authentication and remain available after membership ends. Eligibility is retained when a member leaves or is removed. Existing attendance, recording uploads and prior requests also establish eligibility. The migration retains current memberships; it cannot reconstruct departures for which no historical evidence exists.

Recording discovery uses current session and recording visibility checks. The existing attendance system records ATTENDING and LATE rather than confirmed voice presence; these statuses and recording uploads are discovery associations only. Attendance never gates requests. Related references are opaque participant-supplied text and confer no content access.

Messages are separate from status events. Resolving and declining require an outcome, and requesters may reopen either state. Mutations use revision checks for status conflicts. Request views track each viewer's last seen revision for unread counts. Notifications use the existing service with neutral wording, no description or message excerpts, unique recipients, and actor exclusion.

Requests never edit recordings, transcripts or wiki content. Campaign administrators use the existing content management tools and record the result in the request.

## Retention

There is no application endpoint for deleting a request. Campaign foreign keys restrict deletion while requests exist; campaign deletion returns 409 before deleting files. Archiving remains available. Requester, author and actor identifiers survive account removal as historical provenance; deleted accounts are shown with a neutral participant label. Retention periods and eventual erasure are deliberately not implemented in this initial feature.

Requests are excluded from ordinary campaign exports, activity feeds, search and plugin projections. Confidentiality applies within application permissions; requests are identified and infrastructure operators may retain access. There is no independent escalation channel.

## Validation

Run pnpm --filter @esiana/backend test:safety-privacy. The runner applies all migrations to an isolated SQLite database, runs HTTP authorization and lifecycle tests plus capability, notification privacy, recording visibility, OpenAPI and rate-limit checks, then restores the PostgreSQL Prisma client. It does not migrate the development database.
