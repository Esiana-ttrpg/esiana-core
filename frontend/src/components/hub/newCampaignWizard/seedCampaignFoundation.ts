import { updateCampaignSettings } from '@/lib/campaigns';
import {
  buildCreateBlocks,
  buildCreateMetadata,
  createEmptyFormState,
} from '@/lib/createEntityConfig';
import {
  createThreadPage,
  createWikiPage,
  fetchWikiTreePayload,
  flattenWikiTree,
} from '@/lib/wiki';
import { resolveNarrativeThreadsRootId } from '@/lib/threadHubLayout';
import type { NewCampaignWizardPayload, ScheduleCadence } from './types';

function resolveFolderId(
  flatPages: ReturnType<typeof flattenWikiTree>,
  title: string,
): string | null {
  return flatPages.find((page) => page.title === title)?.id ?? null;
}

function hasFoundationWork(foundation: NewCampaignWizardPayload['foundation']): boolean {
  const partyRows = foundation.party.filter((row) => row.name.trim());
  const hasLocation =
    !foundation.locationSkipped &&
    foundation.startingLocation?.mode === 'new' &&
    Boolean(foundation.startingLocation.title?.trim());
  const hasTension =
    !foundation.tensionSkipped &&
    foundation.tension != null &&
    foundation.tension.title.trim().length > 0;
  return partyRows.length > 0 || hasLocation || hasTension;
}

function scheduleFrequencyLabel(cadence: ScheduleCadence): string {
  switch (cadence) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Biweekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom';
    default:
      return cadence;
  }
}

export async function applyWizardScheduleBestEffort(
  campaignId: string,
  schedule: NewCampaignWizardPayload['schedule'],
  schedulingSkipped: boolean,
): Promise<void> {
  if (schedulingSkipped || !schedule?.enabled || !schedule.cadence) return;

  try {
    await updateCampaignSettings(campaignId, {
      scheduleFrequency: scheduleFrequencyLabel(schedule.cadence),
    });
  } catch (error) {
    console.error('[new-campaign-wizard] schedule update failed (campaign still created)', error);
  }
}

export async function seedCampaignFoundationBestEffort(
  campaignHandle: string,
  foundation: NewCampaignWizardPayload['foundation'],
): Promise<void> {
  if (!hasFoundationWork(foundation)) return;

  try {
    const treePayload = await fetchWikiTreePayload(campaignHandle);
    const flatPages = flattenWikiTree(treePayload.tree);
    const charactersFolderId = resolveFolderId(flatPages, 'Characters');
    const organizationsFolderId = resolveFolderId(flatPages, 'Organizations');
    const locationsFolderId = resolveFolderId(flatPages, 'Locations');
    const threadsRootId = resolveNarrativeThreadsRootId(flatPages);

    if (
      !foundation.locationSkipped &&
      foundation.startingLocation?.mode === 'new' &&
      locationsFolderId
    ) {
      const locationTitle = foundation.startingLocation.title?.trim() ?? '';
      if (locationTitle) {
        const description = foundation.startingLocation.description?.trim() ?? '';
        const form = createEmptyFormState('Locations', locationTitle);
        await createWikiPage(campaignHandle, {
          title: locationTitle,
          parentId: locationsFolderId,
          metadata: buildCreateMetadata('Locations', form),
          blocks: buildCreateBlocks('Locations', description),
        });
      }
    }

    for (const row of foundation.party) {
      const name = row.name.trim();
      if (!name || !charactersFolderId) continue;

      const form = createEmptyFormState('Characters', name);
      form.characterRole = 'party-member';
      if (row.role?.trim()) {
        form.fieldValues.partyRole = row.role.trim();
      }
      const metadata = buildCreateMetadata('Characters', form);
      const blocks = buildCreateBlocks('Characters', row.hook?.trim() ?? '');

      await createWikiPage(campaignHandle, {
        title: name,
        parentId: charactersFolderId,
        metadata,
        blocks,
      });
    }

    if (foundation.tensionSkipped || !foundation.tension) return;

    const tension = foundation.tension;
    const tensionTitle = tension.title.trim();
    if (!tensionTitle || !threadsRootId) return;

    const description = tension.description?.trim() ?? '';
    let relatedPageId: string | null = null;

    if (tension.kind === 'character' && charactersFolderId) {
      const form = createEmptyFormState('Characters', tensionTitle);
      form.characterRole = 'villain';
      if (description) {
        form.fieldValues.primaryGoal = description;
      }
      const page = await createWikiPage(campaignHandle, {
        title: tensionTitle,
        parentId: charactersFolderId,
        metadata: buildCreateMetadata('Characters', form),
        blocks: buildCreateBlocks('Characters', description),
      });
      relatedPageId = page.id;
    } else if (tension.kind === 'organization' && organizationsFolderId) {
      const form = createEmptyFormState('Organizations', tensionTitle);
      const page = await createWikiPage(campaignHandle, {
        title: tensionTitle,
        parentId: organizationsFolderId,
        metadata: buildCreateMetadata('Organizations', form),
        blocks: buildCreateBlocks('Organizations', description),
      });
      relatedPageId = page.id;
    } else if (tension.kind === 'location' && locationsFolderId) {
      const form = createEmptyFormState('Locations', tensionTitle);
      const page = await createWikiPage(campaignHandle, {
        title: tensionTitle,
        parentId: locationsFolderId,
        metadata: buildCreateMetadata('Locations', form),
        blocks: buildCreateBlocks('Locations', description),
      });
      relatedPageId = page.id;
    } else if (tension.kind !== 'unknown') {
      console.error(
        '[new-campaign-wizard] tension entity create skipped (missing folder or kind)',
        tension.kind,
      );
      return;
    }

    await createThreadPage(campaignHandle, threadsRootId, {
      title: tensionTitle,
      threadKind: 'mystery',
      initialLifecycle: 'LOCKED',
      relatedPageIds: relatedPageId ? [relatedPageId] : [],
    });
  } catch (error) {
    console.error('[new-campaign-wizard] foundation seed failed (campaign still created)', error);
  }
}
