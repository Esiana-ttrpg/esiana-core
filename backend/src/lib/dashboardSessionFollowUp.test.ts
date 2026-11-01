import assert from 'node:assert/strict';
import test, { beforeEach, mock } from 'node:test';
import type { CampaignContext } from '../types/api.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';

let pages: unknown[] = [];
let recordings: unknown[] = [];
let presence: unknown[] = [];
let enabled = true;
const recordingLookup = mock.fn(async (_query: unknown) => recordings);
const noteLookup = mock.fn(async (_query: unknown) => pages);
const members = ['me', 'sable', 'secret'].map((userId, index) => ({ userId, role: CampaignMemberRoles.PARTICIPANT,
  user: { email: `${userId}@example.com`, displayName: userId === 'sable' ? 'Sable' : userId },
  identityPage: index === 1 ? { id: 'hidden-character', title: 'Secret character identity', visibility: WikiVisibility.DM_ONLY } : null,
}));
(globalThis as unknown as { prisma: unknown }).prisma = {
  campaignSessionTimeline: { findFirst: async () => ({ wikiPage: { visibility: WikiVisibility.PARTY, metadata: { sessionGroupId: 'group' } } }) },
  wikiPage: { findMany: noteLookup },
  campaignMember: { findMany: async () => members },
  audioSettings: { findUnique: async () => ({ enabled, transcriptionEnabled: true }) },
  campaignAudioSettings: { findUnique: async () => ({ enabled, transcriptionEnabled: true }) },
  contentPresenceState: { findMany: async ({ where }: { where: { subEntityId?: unknown; OR?: unknown[] } }) =>
    presence.filter(row => where.subEntityId === null
      ? (row as { subEntityId: unknown }).subEntityId == null
      : (row as { subEntityId: unknown }).subEntityId != null) },
  sessionRecording: { findMany: recordingLookup },
};
const { buildDashboardSessionFollowUp } = await import('./dashboardSessionFollowUp.js');
const ctx = {
  campaignId: 'campaign-a', campaignHandle: 'glasswater', role: CampaignMemberRoles.PARTICIPANT,
  isMember: true, capabilities: new Set([C.WIKI_VIEW_PARTY]),
} as unknown as CampaignContext;
const session = { timelinePointId: 'session-3', title: 'Previous Session', sequenceOrder: 3, plannedStartAt: null, playedAt: null, snippet: null };
const page = (id: string, author: string, text: string, visibility: string = WikiVisibility.PARTY) => ({
  id, title: 'Notes', visibility, metadata: { isSessionAuthor: true, sessionGroupId: 'group', timelinePointId: 'session-3', sessionNoteAuthorId: author },
  blocks: [{ id: `${id}-body`, type: 'text-tiptap', content: { markdown: text } }], createdAt: new Date(), updatedAt: new Date(),
});
const recording = (visibility = 'campaign', status = 'ready', job?: string) => ({
  id: 'recording-1', visibility, status, uploadedByUserId: 'secret',
  files: [{ durationMs: 120000, asset: { url: '/uploads/session.mp3' } }],
  transcript: null, jobs: job ? [{ status: job }] : [],
});

beforeEach(() => { pages = []; recordings = []; presence = []; enabled = true; recordingLookup.mock.resetCalls(); noteLookup.mock.resetCalls(); });

test('empty author placeholders do not count as contributions; adding notes opens the own-note workflow', async () => {
  pages = [page('mine', 'me', ''), page('shared', 'sable', 'We discovered the atlas.'), page('private', 'secret', 'Secret prose', WikiVisibility.DM_ONLY)];
  const result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.equal(result.myNotes.state, 'not_added');
  assert.equal(result.myNotes.canEdit, true);
  assert.equal(result.myNotes.href, '/campaigns/glasswater/notes/session-3?notes=mine&edit=1');
  assert.deepEqual(result.contributors.map(item => item.label), ['Sable']);
  assert.ok(!JSON.stringify(result).includes('Secret'));
  assert.ok(!JSON.stringify(result).includes('hidden-character'));
  const query = noteLookup.mock.calls[0].arguments[0] as { where: { campaignId: string; deletedAt: null; OR: unknown[] } };
  assert.equal(query.where.campaignId, 'campaign-a');
  assert.equal(query.where.deletedAt, null);
  assert.equal(query.where.OR.length, 2);
});

test('private and unrevealed own notes are unavailable rather than reported as missing', async () => {
  pages = [page('mine', 'me', 'Secret', WikiVisibility.DM_ONLY)];
  let result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.deepEqual(result.myNotes, { state: 'unavailable', href: null, canEdit: false });
  assert.equal(result.contributors.length, 0);
  pages = [page('mine', 'me', 'Unrevealed')];
  presence = [{ entityId: 'mine', entityType: 'wiki_page', subEntityId: null, state: 'HIDDEN' }];
  result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.equal(result.myNotes.state, 'unavailable');
  assert.equal(result.contributors.length, 0);
});

test('hidden note bodies cannot inflate contributions', async () => {
  const shared = page('shared', 'sable', 'Hidden text');
  pages = [shared];
  presence = [{ entityType: 'wiki_block', entityId: 'shared', subEntityId: 'shared-body', state: 'HIDDEN' }];
  const result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.equal(result.contributors.length, 0);
  shared.blocks.push({ id: 'visible-body', type: 'text-tiptap', content: { markdown: 'A visible contribution' } });
  assert.equal((await buildDashboardSessionFollowUp(ctx, 'me', session)).contributors.length, 1);
});

test('disabled audio omits all recording and transcript status without looking up media', async () => {
  enabled = false;
  const result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.equal(result.media, null);
  assert.equal(recordingLookup.mock.callCount(), 0);
});

test('revoking party visibility denies follow-up content even for a normally privileged role', async () => {
  const denied = { ...ctx, role: CampaignMemberRoles.GAMEMASTER, capabilities: new Set<never>() };
  const result = await buildDashboardSessionFollowUp(denied, 'me', session);
  assert.deepEqual(result.myNotes, { state: 'unavailable', href: null, canEdit: false });
  assert.equal(result.contributors.length, 0);
  assert.equal(result.media, null);
  assert.equal(noteLookup.mock.callCount(), 0);
});

test('private recordings and their processing state do not leak', async () => {
  recordings = [recording('staff', 'ready', 'running'), recording('uploader_and_managers', 'ready', 'queued')];
  const result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.deepEqual(result.media?.audio, { available: false, href: null, durationMs: null });
  assert.deepEqual(result.media?.transcript, { state: 'unavailable', href: null });
});

test('published transcripts and playable audio have direct protected workflow links', async () => {
  recordings = [{ ...recording(), transcript: { publishedRevisionId: 'published', revisions: [{ id: 'published' }] } }];
  const result = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.equal(result.media?.audio.durationMs, 120000);
  assert.equal(result.media?.audio.available, true);
  assert.equal(result.media?.transcript.state, 'ready');
  assert.match(result.media?.transcript.href ?? '', /\/all\?recording=recording-1&audioTab=transcript#session-recording$/);
});

test('processing, failures, and unpublished drafts respect recording and transcript access', async () => {
  for (const [status, expected] of [['queued', 'queued'], ['running', 'processing']] as const) {
    recordings = [recording('campaign', 'ready', status)];
    assert.equal((await buildDashboardSessionFollowUp(ctx, 'me', session)).media?.transcript.state, expected);
  }
  recordings = [{ ...recording('campaign', 'ready', 'failed'), transcript: { publishedRevisionId: null, revisions: [{ id: 'draft' }] } }];
  const reader = await buildDashboardSessionFollowUp(ctx, 'me', session);
  assert.notEqual(reader.media?.transcript.state, 'ready');
  assert.equal(reader.media?.transcript.href, null);
  const editor = { ...ctx, capabilities: new Set([...ctx.capabilities, C.AUDIO_TRANSCRIPT_EDIT]) };
  assert.equal((await buildDashboardSessionFollowUp(editor, 'me', session)).media?.transcript.state, 'ready');
  recordings = [recording('campaign', 'ready', 'failed')];
  assert.equal((await buildDashboardSessionFollowUp(editor, 'me', session)).media?.transcript.state, 'failed');
});
