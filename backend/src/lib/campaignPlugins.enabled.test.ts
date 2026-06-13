import assert from 'node:assert/strict';
import test from 'node:test';
import { isCampaignPluginEnabled } from './campaignPlugins.js';
import { prisma } from './prisma.js';

test('isCampaignPluginEnabled returns false when no setting exists', async () => {
  const enabled = await isCampaignPluginEnabled('nonexistent-campaign-id', 'wiki-opds-feed');
  assert.equal(enabled, false);
});

test('isCampaignPluginEnabled reflects CampaignPluginSetting.isEnabled', async (t) => {
  const campaign = await prisma.campaign.findFirst({ select: { id: true } });
  if (!campaign) {
    t.skip('No campaign in test database');
    return;
  }

  await prisma.systemPlugin.upsert({
    where: { id: 'test-opds-plugin' },
    create: {
      id: 'test-opds-plugin',
      name: 'Test OPDS',
      scope: 'campaign',
      isEnabled: false,
      config: {},
    },
    update: {
      name: 'Test OPDS',
      scope: 'campaign',
    },
  });

  await prisma.campaignPluginSetting.upsert({
    where: {
      campaignId_pluginId: { campaignId: campaign.id, pluginId: 'test-opds-plugin' },
    },
    create: {
      campaignId: campaign.id,
      pluginId: 'test-opds-plugin',
      isEnabled: true,
      config: {},
    },
    update: { isEnabled: true },
  });

  t.after(async () => {
    await prisma.campaignPluginSetting.deleteMany({
      where: { campaignId: campaign.id, pluginId: 'test-opds-plugin' },
    });
    await prisma.systemPlugin.deleteMany({ where: { id: 'test-opds-plugin' } });
  });

  assert.equal(await isCampaignPluginEnabled(campaign.id, 'test-opds-plugin'), true);

  await prisma.campaignPluginSetting.update({
    where: {
      campaignId_pluginId: { campaignId: campaign.id, pluginId: 'test-opds-plugin' },
    },
    data: { isEnabled: false },
  });

  assert.equal(await isCampaignPluginEnabled(campaign.id, 'test-opds-plugin'), false);
});
