import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from './prisma.js';
import { audioContext } from './audioCore.js';
import { fetchLastDashboardSession } from './buildDashboardSessions.js';
import { buildDashboardSessionFollowUp } from './dashboardSessionFollowUp.js';

test('dashboard follow-up uses actual completed sessions and scoped, visible author pages',
  { skip: process.env.SESSION_AUDIO_TEST_DATABASE !== '1' }, async () => {
    const owner = await prisma.user.create({ data: { email: 'dashboard-followup-owner@example.invalid', displayName: 'Mira' } });
    const player = await prisma.user.create({ data: { email: 'dashboard-followup-player@example.invalid', displayName: 'Sable' } });
    const campaign = await prisma.campaign.create({ data: {
      name: 'Glasswater', handle: 'dashboard-followup-glasswater', campaignOwnerUserId: owner.id,
      members: { create: [{ userId: owner.id, role: 'GAMEMASTER' }, { userId: player.id, role: 'PARTICIPANT' }] },
    } });
    const other = await prisma.campaign.create({ data: { name: 'Other campaign', handle: 'dashboard-followup-other', campaignOwnerUserId: owner.id } });
    try {
      const anchor = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'The missing atlas', visibility: 'Party', templateType: 'SESSION_NOTE' } });
      const timeline = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: anchor.id, authorId: owner.id, sequenceOrder: 3 } });
      await prisma.wikiPage.update({ where: { id: anchor.id }, data: { metadata: { isSessionAnchor: true, sessionGroupId: 'atlas-group' } } });
      await prisma.campaignSessionSchedule.create({ data: { timelinePointId: timeline.id, status: 'COMPLETED', plannedStartAt: new Date('2026-01-03T19:00:00Z') } });
      const body = (text: string) => [{ id: 'session-note-body', type: 'text-tiptap', content: { markdown: text } }];
      const note = (author: string) => ({ isSessionAuthor: true, sessionGroupId: 'atlas-group', timelinePointId: timeline.id, sessionNoteAuthorId: author });
      await prisma.wikiPage.createMany({ data: [
        { campaignId: campaign.id, title: 'My empty note', templateType: 'SESSION_NOTE', visibility: 'Party', metadata: note(player.id), blocks: body('') },
        { campaignId: campaign.id, title: 'Shared notes', templateType: 'SESSION_NOTE', visibility: 'Party', metadata: note(owner.id), blocks: body('We found the atlas.') },
        { campaignId: campaign.id, title: 'Private notes', templateType: 'SESSION_NOTE', visibility: 'DM_Only', metadata: note('secret-author'), blocks: body('Secret revelation') },
        { campaignId: campaign.id, title: 'Deleted notes', templateType: 'SESSION_NOTE', visibility: 'Party', metadata: note('deleted-author'), blocks: body('Deleted'), deletedAt: new Date() },
        { campaignId: other.id, title: 'Other campaign notes', templateType: 'SESSION_NOTE', visibility: 'Public', metadata: note('foreign-author'), blocks: body('Foreign campaign') },
      ] });
      // A newer placeholder must not displace the actual completed session.
      const futureAnchor = await prisma.wikiPage.create({ data: { campaignId: campaign.id, title: 'Next session', visibility: 'Party' } });
      const future = await prisma.campaignSessionTimeline.create({ data: { campaignId: campaign.id, wikiPageId: futureAnchor.id, authorId: owner.id, sequenceOrder: 4 } });
      await prisma.campaignSessionSchedule.create({ data: { timelinePointId: future.id, status: 'PUBLISHED', plannedStartAt: new Date('2030-01-03T19:00:00Z') } });
      await prisma.campaignAudioSettings.create({ data: { campaignId: campaign.id, enabled: false } });
      const ctx = await audioContext(campaign.id, player.id);
      const last = await fetchLastDashboardSession(campaign.id, ctx.role);
      assert.equal(last?.timelinePointId, timeline.id);
      const result = await buildDashboardSessionFollowUp(ctx, player.id, last!);
      assert.equal(result.myNotes.state, 'not_added');
      assert.equal(result.myNotes.canEdit, true);
      assert.match(result.myNotes.href ?? '', /notes=mine&edit=1$/);
      assert.deepEqual(result.contributors.map(item => item.userId), [owner.id]);
      assert.equal(result.media, null);
      const serialized = JSON.stringify(result);
      for (const secret of ['Secret revelation', 'secret-author', 'deleted-author', 'foreign-author']) assert.ok(!serialized.includes(secret));
    } finally {
      await prisma.campaign.deleteMany({ where: { id: { in: [campaign.id, other.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [owner.id, player.id] } } });
      await prisma.$disconnect();
    }
  });
