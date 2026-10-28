# Session audio and processing providers

See [Recording privacy and consent](https://github.com/Esiana-ttrpg/docs/blob/main/features/session-recordings-privacy.md) for participant acknowledgement, visibility, transcription, clones, backups, and deletion. New recording creation requires `consentAcknowledged: true` through both the UI and external API. The server stores its timestamp with the uploader; adding files to that recording does not repeat the acknowledgement. Legacy recordings remain unacknowledged unless originally recorded with consent metadata.

Session recordings attach to existing Session Notes sessions. Recording uploads are enabled by default globally and for campaigns; explicit disabled settings remain respected. Automated transcription remains disabled until configured and permitted. Notes, attendance, recaps, manual transcripts, and chapters remain independent of transcription services.

## Enable recordings

1. Apply the normal database migrations and regenerate the Prisma client before starting the updated backend. The migration supports the existing PostgreSQL and SQLite deployment tooling.
2. In Administration → Audio, review formats, file/session/campaign limits, and optional global storage limits. Administrators may disable new uploads.
3. In Campaign Settings → Audio, choose visibility and configure contributions, or opt out of recording uploads. The campaign permission matrix separately governs chapter editing, transcript editing/publication, and transcription requests.
4. Open a session and choose Add Recording, then add one or more audio files. Select a previous file again after a browser reload to resume its pending upload.

Defaults are 1 GiB/file, 5 GiB/session, 10 GiB/campaign, two concurrent uploads/user, and 10 MiB/transcript import. Disabling new uploads preserves access to existing recordings.

## Review a session

The player presents one logical timeline across ordered files. Chapters, Transcript, and Files stay in the main column; existing note perspectives and references remain available.

- Add chapter at current position opens the chapter editor with playback time already captured.
- Create chapter here on a timestamped transcript segment opens the same editor.
- Import UTF-8 text, SRT, WebVTT, or native JSON arrays containing `startMs`, `endMs`, `text`, and optional `speaker`. Use `null` for both timestamps on untimed text.
- Transcript saves create immutable revisions. Publication is explicit. Transcripts never automatically rewrite wiki notes.
- File changes remap file-local anchors. Removing or replacing files requires explicit reassignment or removal of affected annotations. Upload a replacement before detaching the original.

## Configure shared providers

Administration → Providers owns global connections, encrypted credentials, model declarations, access grants, and processing usage. Campaign managers see permitted names, capabilities, models, availability, and campaign usage. They cannot supply endpoints or credentials.

The first capability is `audio.transcribe`, with two protocol profiles:

| Profile | Endpoint | Output |
| --- | --- | --- |
| whisper.cpp HTTP | Full operator-configured inference URL, commonly `/inference` | Timestamped JSON/verbose JSON |
| OpenAI-compatible transcription | Full operator-configured URL, commonly `/v1/audio/transcriptions` | `verbose_json` with segment timestamps |

Declare capabilities and accepted formats explicitly. An OpenAI-compatible chat endpoint does not imply transcription support. Configure and grant models where required; whisper.cpp may use its server-loaded default model.

Credentials require the existing `AUTH_SECRETS_KEY` configuration and are stored encrypted. Local/private endpoints require explicit administrator approval. Requests are DNS-pinned and do not follow redirects. Connection testing sends no campaign audio and reports reachability separately from operation compatibility.

Link-local destinations remain blocked even with private-network approval, including IPv4-mapped IPv6 addresses and IPv6 literals. Transcript revision uploads check recording visibility and editing permissions before parsing JSON; the parser uses the configured transcript byte limit.

New campaigns have no provider access. Grant selected campaigns explicitly, then enable transcription and choose permitted defaults in Campaign Settings → Audio. Storage limits and processing limits are separate. Processing supports instance-connection and campaign request/audio-duration ceilings per UTC calendar month; campaigns may tighten their allowances.

Only an authorized user request submits audio. Files are sent individually, without automatic conversion or arbitrary encoded-file splitting. Provider limits can therefore be lower than recording upload limits. Generated results arrive as native transcript drafts. Segment ends that exceed the measured file duration are clamped to that duration; segments starting at or beyond the file's end are rejected.

## Jobs, usage, and revocation

A transcription-specific runner operates inside the existing backend. It persists jobs and per-file results, limits concurrency per connection, and reconciles interrupted work after restart. No worker service, model weights, GPU runtime, FFmpeg, or Redis is bundled.

Transient explicit rejections may retry twice within processing limits. Ambiguous failures and restart interruptions require explicit retry. Reservations crossing a UTC month boundary require a fresh request. Cancellation aborts local requests and suppresses publication; a provider may continue remote computation.

Usage distinguishes quota reservations, submitted requests, and completed audio duration. Completed audio duration describes successfully transcribed source media, not provider CPU/GPU time. Tokens and costs remain unknown unless reported; there is no billing system.

Global administrators can inspect campaign resource totals, sanitized failures, and operational job identifiers, and cancel processing. Provider administration does not grant access to recordings, transcripts, drafts, or raw provider responses. Ordinary campaign exports require campaign content authorization. The site-admin system-database and full-campaign backup endpoints are explicit disaster-recovery exceptions: a `SYSTEM_ADMIN` can export private content without campaign membership, and every request records the actor and backup scope in the system diagnostic log. This override does not apply to content or asset routes.

Revoking a provider grant denies new requests, prevents queued work from starting, and aborts running requests where possible. Existing recordings, published transcripts, manual edits, revisions, and completed draft results remain. Publishing a retained provider draft requires restored provider authorization and ordinary transcript-publication permission.

## Storage and preservation

Filesystem storage supports protected byte ranges. Other storage drivers must declare ranged streaming support and implement ranged reads, metadata lookup, and protected stream delivery before they can host audio. Protected audio never uses public storage redirects.

Abandoned uploads expire after 72 hours. Interrupted finalization records its pending storage pointer for recovery. Finalized audio is never automatically compressed or deleted. Detaching a file or deleting a recording retains its physical asset; unreferenced assets continue counting toward storage until explicitly purged.

Administration → Storage reports recording storage, campaign ownership, largest files, transcript storage, and pending/failed uploads without exposing private content. Physical purge rejects referenced assets.

Campaign backups include a separate `sovereign/audio.json` manifest and streamed media, while retaining legacy backup support. Restore preserves transcript revisions and annotations and clears provider defaults. Missing media produces protected missing-media placeholders. Recording clones are opt-in, require session history/wiki pages, copy destination-owned media, and never grant provider access.

ZIP extraction uses unique temporary directories under `UPLOADS_DIR/.backup-staging`, keeping large restores on the configured mounted storage. Closing the staged archive or failing extraction removes its temporary directory.

Recording clones check source formats and protected streaming access before creating the destination campaign. If a later audio copy fails, cleanup removes the incomplete campaign and its copied objects while preserving source media. Missing clone prerequisites return a client error (`400`).

Recordings and backup archives share `/api/campaigns/{campaignHandle}/asset-uploads`, persistent upload sessions, resumable chunks, and cleanup. Backup uploads remain available when session audio is disabled and require campaign settings plus asset-upload permission. Their size ceiling is the instance campaign-audio allowance plus 512 MiB for other backup material. The existing multipart restore API remains supported for older clients.

Restore consumes a completed backup upload ID once. Moving its ZIP into restore staging atomically retires the original asset record and marks the upload `consumed`; replay returns `409 backup_upload_consumed`. A failed handoff restores the original file and upload state where possible. A consumed upload cannot be finalized again (`410`) or cancelled.

## Validation

Run `pnpm --filter @esiana/backend test:audio` for disposable SQLite migration, HTTP authorization/upload, transcript, provider, preservation, rate-limit, and OpenAPI tests. The fixture never uses the developer database. Both HTTP profiles use mocked providers.

Actual codec playback, mobile/keyboard interaction, and multi-gigabyte upload behavior additionally require browser verification on the deployment's supported browsers and reverse proxy.

## External clients and curl

Browser and external clients use the same authenticated APIs. Create a scoped API token from a dedicated campaign member account with `campaign:read` and `campaign:write`. No system administrator token or provider credential is required. Scopes restrict API operations; they do not grant campaign permissions.

The account must have campaign membership, access to the parent session, and `assets.upload`. Campaign managers with `audio.manage` can manage recordings; other contributors additionally require the campaign's contributor setting and may upload into recordings owned by their account. Each upload session belongs to its initiating account, including across token renewals. Another account cannot resume, finalize, or cancel it. Chapter/transcript contributions require their respective matrix grants and campaign contribution settings.

| Operation | Endpoint suffix under `/api/campaigns/{campaignHandle}` | Token scope |
| --- | --- | --- |
| List/select recordings | `GET /audio/sessions/{timelineId}/recordings` | `campaign:read` |
| Create recording | `POST /audio/sessions/{timelineId}/recordings` | `campaign:write` |
| Begin file upload | `POST /asset-uploads` | `campaign:write` |
| Read saved upload progress | `GET /asset-uploads/{uploadId}` | `campaign:read` |
| Append at saved offset | `PATCH /asset-uploads/{uploadId}` | `campaign:write` |
| Finalize file | `POST /asset-uploads/{uploadId}/finalize` | `campaign:write` |
| Cancel unfinished file | `DELETE /asset-uploads/{uploadId}` | `campaign:write` |
| Create chapter | `POST /audio/recordings/{recordingId}/chapters` | `campaign:write` |
| Read transcript/revision | `GET /audio/recordings/{recordingId}/transcript` | `campaign:read` |
| Save transcript draft | `POST /audio/recordings/{recordingId}/transcript/revisions` | `campaign:write` |

Recording/upload creation accepts an optional `Idempotency-Key` header. Persist a separate key per intended operation and reuse it after connection failures. Keys contain 1–200 letters, digits, `.`, `_`, `:`, or `-`; they are scoped to campaign, authenticated account, and operation for 72 hours. Matching requests return the original resource and do not reserve storage again. Changed input returns `409 idempotency_key_conflict`; deletion of the original resource returns `410` within that retention window. After 72 hours, select a known recording ID or start a new operation with a new key.

Finalization is inherently idempotent by upload ID and returns the same file/asset after completion. A concurrent finalization may return `409 upload_busy`; check progress and retry. Chunk uploads use authoritative byte offsets instead: after a lost reply, read progress before sending more bytes. A stale `Upload-Offset` returns `409`; it never appends duplicate bytes. Creation replay and finalization still enforce current permissions. Membership/session-access revocation prevents continued uploads.

The following example uses Bash, curl, jq, and GNU coreutils. Set the instance URL, token, campaign handle, and existing session timeline ID. Keep the creation keys unchanged when rerunning an interrupted operation.

```bash
export ESIANA_URL='https://esiana.example.com'
export ESIANA_TOKEN='your-scoped-member-token'
CAMPAIGN='florence'
SESSION_ID='existing-session-timeline-id'
RECORDING_CREATE_KEY='recorder-session-2026-10-27'

# Or list existing recordings and set RECORDING_ID to one you may manage/upload into.
curl --fail-with-body "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/sessions/$SESSION_ID/recordings" \
  -H "Authorization: Bearer $ESIANA_TOKEN"

RECORDING_ID=$(curl --fail-with-body -X POST \
  "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/sessions/$SESSION_ID/recordings" \
  -H "Authorization: Bearer $ESIANA_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $RECORDING_CREATE_KEY" \
  --data '{"title":"Session recording","consentAcknowledged":true}' | jq -er '.id')

upload_part() (
  set -e
  file=$1
  creation_key=$2
  bytes=$(wc -c < "$file" | tr -d '[:space:]')
  name=$(basename "$file")
  base="$ESIANA_URL/api/campaigns/$CAMPAIGN/asset-uploads"
  body=$(jq -nc --arg id "$RECORDING_ID" --arg name "$name" --arg bytes "$bytes" \
    '{purpose:"session_audio",recordingId:$id,name:$name,sizeBytes:$bytes}')
  id=$(curl --fail-with-body -X POST "$base" \
    -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \
    -H "Idempotency-Key: $creation_key" --data "$body" | jq -er '.id')
  offset=$(curl --fail-with-body "$base/$id" \
    -H "Authorization: Bearer $ESIANA_TOKEN" | jq -er '.offsetBytes')
  chunk=$(mktemp)
  trap 'rm -f "$chunk"' EXIT
  while [ "$offset" -lt "$bytes" ]; do
    dd if="$file" of="$chunk" bs=8388608 iflag=skip_bytes,count_bytes \
      skip="$offset" count=8388608 status=none
    offset=$(curl --fail-with-body -X PATCH "$base/$id" \
      -H "Authorization: Bearer $ESIANA_TOKEN" \
      -H 'Content-Type: application/octet-stream' -H "Upload-Offset: $offset" \
      --data-binary "@$chunk" | jq -er '.offsetBytes')
  done
  curl --fail-with-body -X POST "$base/$id/finalize" \
    -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' --data '{}'
)

# One logical recording, two ordered files. Use a distinct stable key for each file.
upload_part 'part-one.mp3' 'recorder-session-2026-10-27-file-1'
upload_part 'part-two.mp3' 'recorder-session-2026-10-27-file-2'
```

If an upload returns `409 upload_busy`, wait and rerun the same operation/key. If a chunk's reply is lost or its offset is stale, rerunning the function reads the saved offset before resuming. `413` indicates a file/storage limit; expired upload sessions return `410`. Do not blindly retry annotation creation, which is a distinct editing operation.

An authorized editor may add chapters and timestamped transcript drafts without any transcription provider. Positions are integer milliseconds on the logical recording timeline and must fit its duration:

```bash
curl --fail-with-body -X POST \
  "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/recordings/$RECORDING_ID/chapters" \
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \
  --data '{"title":"The letter","startMs":100}'

# Read the transcript first; use its revision counter as expectedRevision (0 when absent).
curl --fail-with-body \
  "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/recordings/$RECORDING_ID/transcript" \
  -H "Authorization: Bearer $ESIANA_TOKEN"

curl --fail-with-body -X POST \
  "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/recordings/$RECORDING_ID/transcript/revisions" \
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \
  --data '{"expectedRevision":0,"segments":[{"startMs":0,"endMs":500,"text":"Neris discovers a letter.","speaker":"Neris"}]}'
```

Saving creates a draft revision; publishing remains a separate permission-checked operation. Concurrent edits return `409 transcript_revision_conflict`. The interactive OpenAPI documentation includes the same authenticated curl request examples and retry-header contract.
