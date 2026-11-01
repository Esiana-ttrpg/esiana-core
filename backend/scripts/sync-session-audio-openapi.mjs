import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
const target = fileURLToPath(new URL('../openapi/openapi.yaml', import.meta.url));
const string = { type: 'string' }, integer = { type: 'integer', minimum: 0 }, boolean = { type: 'boolean' };
const bytes = { type: 'string', pattern: '^\\d+$', description: 'Decimal byte count; avoids 32-bit database and JSON integer overflow.' };
const nullableString = { type: ['string', 'null'] };
const array = (items) => ({ type: 'array', items });
const object = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const recording = object({ id: string, title: string, visibility: { enum: ['campaign', 'staff', 'uploader_and_managers'] },
  status: { enum: ['uploading', 'ready', 'archived'] }, revision: integer, durationMs: integer, isPrimary: boolean,
  files: array(object({ id: string, assetId: string, name: string, order: integer, offsetMs: integer, durationMs: integer, sizeBytes: bytes, format: string, mimeType: string })),
  chapters: array(object({ id: string, title: string, description: nullableString, startMs: integer, fileId: string, fileStartMs: integer, wikiPageId: nullableString })) });
const chapter = object({ title: string, description: nullableString, startMs: integer, wikiPageId: nullableString }, ['title', 'startMs']);
const segment = object({ startMs: { type: ['integer', 'null'], minimum: 0 }, endMs: { type: ['integer', 'null'], minimum: 0 }, text: string, speaker: nullableString }, ['startMs', 'endMs', 'text']);
const globalSettings = object({ enabled: boolean, transcriptionEnabled: boolean, maxFileBytes: bytes, maxSessionBytes: bytes,
  maxCampaignBytes: bytes, maxGlobalBytes: { ...bytes, type: ['string', 'null'] }, maxTranscriptBytes: integer,
  uploadConcurrency: integer, allowedFormats: array({ enum: ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac'] }) });
const campaignSettings = object({ enabled: boolean, transcriptionEnabled: boolean,
  allowPov: boolean, defaultVisibility: recording.properties.visibility,
  defaultConnectionId: nullableString, defaultModelId: nullableString, maxStorageBytes: { ...bytes, type: ['string', 'null'] },
  monthlyRequests: { type: ['integer', 'null'], minimum: 0 }, monthlyDurationMs: { type: ['string', 'null'], pattern: '^\\d+$' } });
const provider = object({ name: string, protocol: { enum: ['whisper_cpp', 'openai_transcription'] }, endpoint: { type: 'string', format: 'uri' },
  credential: { type: 'string', writeOnly: true }, enabled: boolean, allowPrivateNetwork: boolean, capabilities: array(string),
  operatorLabel: nullableString, billingLabel: nullableString, concurrency: integer, timeoutSeconds: integer, maxRequestBytes: bytes, formats: array(string), monthlyRequests: { type: ['integer', 'null'], minimum: 0 }, monthlyDurationMs: { type: ['string', 'null'], pattern: '^\\d+$' } });
const paths = {};
function operation(path, method, summary, input, output = { type: 'object' }, status = '200', description = '') {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({ name: match[1], in: 'path', required: true, schema: string }));
  const error = { description: 'Denied by campaign/content/provider policy, invalid input, or revision conflict.', content: { 'application/json': { schema: object({ error: string }) } } };
  const value = { tags: [path.includes('/admin/') ? 'Administration' : 'Wiki'], summary, description: description ||
    'Requires authenticated campaign membership and the relevant audio capability. Global provider administration does not confer content access. Times are integer milliseconds.',
    security: [{ cookieAuth: [] }, { bearerAuth: [] }], parameters, responses: { [status]: { description: 'Success', ...(status === '204' ? {} : { content: { 'application/json': { schema: output } } }) }, '403': error, '404': error, '409': error } };
  if (input) value.requestBody = { required: true, content: { 'application/json': { schema: input } } };
  (paths[path] ??= {})[method] = value; return value;
}
const base = '/api/campaigns/{campaignHandle}/audio';
operation(`${base}/settings`, 'get', 'Read effective campaign audio configuration');
operation(`${base}/settings`, 'patch', 'Update campaign audio configuration', campaignSettings);
operation(`${base}/providers`, 'get', 'List permitted provider names, capabilities, and models', null, array(object({ id: string, name: string, capabilities: array(string) })));
operation(`${base}/usage`, 'get', 'Read campaign processing usage');
operation(`${base}/sessions/{timelineId}/recordings`, 'get', 'List visible session recordings', null, array(recording));
operation(`${base}/sessions/{timelineId}/recordings`, 'post', 'Create a session recording', object({ title: string, visibility: recording.properties.visibility, consentAcknowledged: { const: true, description: 'Uploader confirms participants were informed and permission was obtained to upload and share this recording.' } }, ['title', 'consentAcknowledged']), recording, '201');
const rec = `${base}/recordings/{recordingId}`;
operation(rec, 'get', 'Read an authorized recording', null, recording);
operation(rec, 'patch', 'Update recording metadata', object({ expectedRevision: integer, title: string, visibility: recording.properties.visibility, isPrimary: boolean, status: { enum: ['ready', 'archived'] } }, ['expectedRevision']), recording);
operation(rec, 'delete', 'Delete recording metadata while retaining physical media', null, null, '204');
operation(`${rec}/chapters`, 'post', 'Create a chapter from a playback or segment position', chapter, chapter, '201');
operation(`${rec}/chapters/{chapterId}`, 'patch', 'Edit a timestamped chapter', chapter);
operation(`${rec}/chapters/{chapterId}`, 'delete', 'Delete a chapter', null, null, '204');
operation(`${rec}/timeline/preview`, 'post', 'Preview file order and affected annotations', object({ fileIds: array(string) }, ['fileIds']));
operation(`${rec}/timeline/commit`, 'post', 'Commit reviewed file order and annotation resolutions', object({ expectedRevision: integer, fileIds: array(string), resolutions: { type: 'object', additionalProperties: { anyOf: [{ type: 'null' }, object({ fileId: string, startMs: integer, endMs: integer }, ['fileId', 'startMs'])] } } }, ['expectedRevision', 'fileIds', 'resolutions']));
const transcript = operation(`${rec}/transcript`, 'get', 'Read a permitted published transcript or editor revision');
transcript.parameters.push({ name: 'revisionId', in: 'query', schema: string });
operation(`${rec}/transcript/revisions`, 'post', 'Save a manual or imported transcript draft', object({ expectedRevision: integer, language: nullableString, segments: array(segment), text: string, baseRevisionId: string, sourceJobId: string, format: { enum: ['txt', 'srt', 'vtt', 'json'] } }, ['expectedRevision']), object({ id: string, segments: array(segment) }), '201');
operation(`${rec}/transcript/publish`, 'post', 'Publish a revision with renewed provider authorization when applicable', object({ expectedRevision: integer, revisionId: string }, ['expectedRevision', 'revisionId']));
operation(`${rec}/transcription`, 'post', 'Request permitted timestamped transcription', object({ connectionId: string, modelId: nullableString }), undefined, '202');
operation(`${rec}/jobs`, 'get', 'Read content-neutral transcription status');
operation(`${rec}/jobs/{jobId}/result`, 'get', 'Review retained provider output under transcript content permissions');
operation(`${rec}/jobs/{jobId}/cancel`, 'post', 'Cancel transcription without deleting campaign content', object({}));
operation(`${rec}/jobs/{jobId}/retry`, 'post', 'Retry an interrupted or failed transcription', object({}));
const uploads = '/api/campaigns/{campaignHandle}/asset-uploads';
operation(uploads, 'post', 'Reserve quota and begin a resumable audio or backup upload', object({ purpose: { enum: ['session_audio', 'campaign_backup'], default: 'session_audio' }, recordingId: string, name: string, sizeBytes: bytes }, ['name', 'sizeBytes']), undefined, '201');
operation(`${uploads}/{uploadId}`, 'get', 'Read authoritative upload status and offset');
const append = operation(`${uploads}/{uploadId}`, 'patch', 'Append at most 8 MiB at the authoritative byte offset');
append.parameters.push({ name: 'Upload-Offset', in: 'header', required: true, schema: bytes });
append.requestBody = { required: true, content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } };
operation(`${uploads}/{uploadId}/finalize`, 'post', 'Validate and idempotently finalize uploaded media or backup archive', object({}));
operation(`${uploads}/{uploadId}`, 'delete', 'Cancel an unfinished upload and release its reservation', null, null, '204');
operation('/api/admin/audio', 'get', 'Read global audio governance settings', null, globalSettings);
operation('/api/admin/audio', 'patch', 'Update global audio governance settings', globalSettings, globalSettings);
operation('/api/admin/audio/storage', 'get', 'Inspect content-neutral physical audio usage and upload health');
operation('/api/admin/audio/storage/assets/{assetId}', 'delete', 'Explicitly purge an unreferenced physical audio asset', null, null, '204');
operation('/api/admin/audio/storage/recordings/{recordingId}', 'delete', 'Administratively remove a recording without reading its content', null, null, '204');
operation('/api/admin/providers', 'get', 'List global processing connections with masked credentials');
operation('/api/admin/providers', 'post', 'Create a global processing connection', provider, undefined, '201');
operation('/api/admin/providers/{connectionId}', 'patch', 'Update global endpoint, policy, and encrypted credential', provider);
operation('/api/admin/providers/{connectionId}/test', 'post', 'Test endpoint reachability without sending campaign audio');
operation('/api/admin/providers/{connectionId}/models/{modelKey}', 'put', 'Declare a model and its explicit capabilities', object({ name: string, enabled: boolean, capabilities: array(string) }, ['name', 'enabled', 'capabilities']));
operation('/api/admin/providers/policies/all', 'get', 'List campaign provider access policies');
operation('/api/admin/providers/policies/bulk', 'put', 'Explicitly grant or revoke selected campaigns', object({ campaignIds: array(string), connectionId: string,
  feature: { const: 'session_audio' }, capability: { const: 'audio.transcribe' }, enabled: boolean, modelIds: array(string),
  monthlyRequests: campaignSettings.properties.monthlyRequests, monthlyDurationMs: campaignSettings.properties.monthlyDurationMs },
  ['campaignIds', 'connectionId', 'feature', 'capability', 'enabled', 'modelIds', 'monthlyRequests', 'monthlyDurationMs']));
const usage = operation('/api/admin/providers/usage/all', 'get', 'Read campaign-attributed processing metrics without content');
operation('/api/admin/providers/usage/summary', 'get', 'Aggregate all campaign processing consumption without content');
operation('/api/admin/providers/usage/{jobId}/cancel', 'post', 'Cancel an operational job without accessing campaign content');
usage.parameters.push({ name: 'month', in: 'query', schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' } });
const retryHeader = { name: 'Idempotency-Key', in: 'header', required: false,
  schema: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9._:-]+$' },
  description: 'Persist and reuse this key when retrying creation. Scoped to campaign, authenticated user, and operation for 72 hours. An identical normalized request returns the original resource without reserving storage twice. Changed input returns 409; a deleted resource returns 410.' };
for (const path of [`${base}/sessions/{timelineId}/recordings`, uploads]) {
  paths[path].post.parameters.push(retryHeader);
  paths[path].post.responses['410'] = { description: 'The resource created with this retry key was deleted.' };
}
const curl = (path, method, source) => {
  const op = paths[path][method];
  op.description += '\n\nExternal clients authenticate with an ordinary campaign member’s scoped API token. Read operations require campaign:read; mutations require campaign:write. Token scopes never replace campaign membership, session disclosure, operation permissions, storage quotas, or upload ownership.\n\n```bash\n' + source + '\n```';
  op['x-codeSamples'] = [{ lang: 'Shell', label: 'curl', source }];
};
curl(`${base}/sessions/{timelineId}/recordings`, 'post', `curl --fail-with-body -X POST "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/sessions/$SESSION_ID/recordings" \\
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \\
  -H "Idempotency-Key: $RECORDING_CREATE_KEY" --data '{"title":"Session recording","consentAcknowledged":true}'`);
curl(`${base}/sessions/{timelineId}/recordings`, 'get', `curl --fail-with-body "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/sessions/$SESSION_ID/recordings" \\
  -H "Authorization: Bearer $ESIANA_TOKEN"`);
curl(uploads, 'post', `curl --fail-with-body -X POST "$ESIANA_URL/api/campaigns/$CAMPAIGN/asset-uploads" \\
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \\
  -H "Idempotency-Key: $FILE_CREATE_KEY" \\
  --data "$(jq -nc --arg id "$RECORDING_ID" --arg name "$FILE_NAME" --arg bytes "$FILE_BYTES" '{purpose:"session_audio",recordingId:$id,name:$name,sizeBytes:$bytes}')"`);
curl(`${uploads}/{uploadId}`, 'get', `curl --fail-with-body "$ESIANA_URL/api/campaigns/$CAMPAIGN/asset-uploads/$UPLOAD_ID" \\
  -H "Authorization: Bearer $ESIANA_TOKEN"`);
curl(`${uploads}/{uploadId}`, 'patch', `# chunk.bin contains at most 8 MiB, starting at the saved Upload-Offset.
curl --fail-with-body -X PATCH "$ESIANA_URL/api/campaigns/$CAMPAIGN/asset-uploads/$UPLOAD_ID" \\
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/octet-stream' \\
  -H "Upload-Offset: $OFFSET_BYTES" --data-binary @chunk.bin`);
curl(`${uploads}/{uploadId}/finalize`, 'post', `curl --fail-with-body -X POST "$ESIANA_URL/api/campaigns/$CAMPAIGN/asset-uploads/$UPLOAD_ID/finalize" \\
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' --data '{}'`);
paths[`${uploads}/{uploadId}/finalize`].post.description += '\n\nFinalization is inherently idempotent by upload ID: retries after completion return the same file/asset. A concurrent finalization can return 409 upload_busy; check progress and retry. No new idempotency key is needed. All authorization checks still run.';
curl(`${rec}/chapters`, 'post', `curl --fail-with-body -X POST "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/recordings/$RECORDING_ID/chapters" \\
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \\
  --data '{"title":"The letter","startMs":100}'`);
curl(`${rec}/transcript/revisions`, 'post', `curl --fail-with-body -X POST "$ESIANA_URL/api/campaigns/$CAMPAIGN/audio/recordings/$RECORDING_ID/transcript/revisions" \\
  -H "Authorization: Bearer $ESIANA_TOKEN" -H 'Content-Type: application/json' \\
  --data '{"expectedRevision":0,"segments":[{"startMs":0,"endMs":500,"text":"Neris discovers a letter.","speaker":"Neris"}]}'`);
const start = '  # BEGIN GENERATED SESSION AUDIO API';
const end = '  # END GENERATED SESSION AUDIO API';
let document = fs.readFileSync(target, 'utf8');
const prior = document.indexOf(start);
if (prior >= 0) document = document.slice(0, prior) + document.slice(document.indexOf(end, prior) + end.length).replace(/^\r?\n/, '');
const block = `${start}\n${YAML.stringify(paths, { lineWidth: 120, aliasDuplicateObjects: false }).trimEnd().split('\n').map((line) => line.trimEnd() ? `  ${line.trimEnd()}` : '').join('\n')}\n${end}\n`;
document = document.replace(/paths:\r?\n/, (line) => line + block);
fs.writeFileSync(target, document);
