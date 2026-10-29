import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { CampaignWorkspace } from '../../../../shared/campaignWorkspaceRoutes.js';
import { prisma } from '../prisma.js';
import { transformPortfolioToCampaign } from './transform.js';

test('portfolio import recovers provenance without reusing deleted or foreign campaign pages', async (t) => {
  const stamp = randomUUID();
  const user = await prisma.user.create({
    data: { email: `portfolio-${stamp}@example.test`, passwordHash: 'test' },
  });
  const campaigns: string[] = [];
  t.after(async () => {
    await prisma.campaign.deleteMany({ where: { id: { in: campaigns } } });
    await prisma.user.delete({ where: { id: user.id } });
  });
  for (const suffix of ['target', 'foreign', 'nonmember']) {
    const campaign = await prisma.campaign.create({
      data: { name: `Discovery ${suffix}`, handle: `portfolio-${stamp}-${suffix}`, campaignOwnerUserId: user.id },
    });
    campaigns.push(campaign.id);
  }
  const [campaignId, foreignId, nonmemberId] = campaigns;
  await prisma.campaignMember.create({ data: { campaignId, userId: user.id, role: 'GAMEMASTER' } });
  const character = await prisma.portfolioCharacter.create({ data: { userId: user.id, name: 'Mira' } });
  const metadata = { importedFromPortfolioCharacterId: character.id };
  const base = { title: 'Mira', visibility: 'PARTY', workspace: CampaignWorkspace.CHARACTERS, metadata };
  const foreign = await prisma.wikiPage.create({ data: { ...base, campaignId: foreignId } });
  const deleted = await prisma.wikiPage.create({ data: { ...base, campaignId, deletedAt: new Date() } });
  // A different import marker in the correct workspace must also be ignored.
  await prisma.wikiPage.create({ data: { ...base, campaignId, metadata: { importedFromPortfolioCharacterId: 'other-character' } } });
  const input = { userId: user.id, portfolioCharacterId: character.id, campaignId };
  await assert.rejects(transformPortfolioToCampaign({ ...input, campaignId: nonmemberId }), { status: 403 });
  const imported = await transformPortfolioToCampaign(input);
  assert.notEqual(imported.campaignCharacterPageId, foreign.id);
  assert.notEqual(imported.campaignCharacterPageId, deleted.id);
  const pageCount = await prisma.wikiPage.count({ where: { campaignId } });
  // Simulate an import that committed its page but failed to persist provenance.
  await prisma.portfolioCharacterAdventure.delete({ where: { id: imported.adventureId } });
  const recovered = await transformPortfolioToCampaign(input);
  assert.equal(recovered.campaignCharacterPageId, imported.campaignCharacterPageId);
  assert.equal(await prisma.wikiPage.count({ where: { campaignId } }), pageCount);
  const retried = await transformPortfolioToCampaign(input);
  assert.equal(retried.adventureId, recovered.adventureId);
});
