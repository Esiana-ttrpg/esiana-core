import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { MembershipRoles } from '@shared/campaignPolicy/membershipRoles';
import { MATRIX_SECTIONS } from '@shared/campaignPolicy/matrixCatalog';
import { docsLinks } from '@/lib/docsLinks';
import {
  matrixCellStatusLabel,
  matrixCellTone,
  matrixGlobalAdminHelp,
  matrixRowHelp,
  matrixRowSettingLink,
  matrixFeatureStatuses,
  roleHasOverride,
} from './matrixRowPresentation';

function rowFor(capability: string) {
  return MATRIX_SECTIONS.flatMap((section) => section.rows).find(
    (row) => row.capability === capability,
  );
}

describe('matrix row presentation', () => {
  it('deep-links to the required audio control and keeps docs in help', () => {
    const audio = rowFor(CampaignCapabilities.AUDIO_MANAGE);
    assert.ok(audio);
    const setting = matrixRowSettingLink(audio, 'matrix-review', false);
    assert.equal(setting?.href, '/campaigns/matrix-review/settings?tab=audio#campaign-audio');
    assert.equal(matrixRowHelp(audio)?.docsKey, 'sessionRecordingsPrivacy');
    assert.equal(docsLinks.sessionRecordingsPrivacy.includes('session-recordings-privacy'), true);
  });

  it('omits Access self-links and timeline pages without the required control', () => {
    const view = rowFor(CampaignCapabilities.CAMPAIGN_VIEW);
    const chronology = rowFor(CampaignCapabilities.CHRONOLOGY_EDIT);
    assert.ok(view);
    assert.ok(chronology);
    assert.equal(matrixRowSettingLink(view, 'matrix-review', false), null);
    assert.equal(matrixRowSettingLink(chronology, 'matrix-review', false), null);
    assert.match(matrixRowHelp(view)?.explanation ?? '', /toggle above this matrix/);
  });

  it('explains Global Admin restrictions instead of linking', () => {
    const transcribe = rowFor(CampaignCapabilities.AUDIO_TRANSCRIBE);
    assert.ok(transcribe);
    assert.equal(matrixRowSettingLink(transcribe, 'matrix-review', true), null);
    assert.match(matrixGlobalAdminHelp(transcribe, true) ?? '', /instance administrator/);
    const statuses = matrixFeatureStatuses(transcribe, {
      audioGlobalEnabled: false,
      audioSettings: {
        enabled: true,
        transcriptionEnabled: true,
        allowContributors: true,
        allowChapters: true,
        allowTranscripts: true,
        allowPov: false,
        defaultVisibility: 'campaign',
        defaultConnectionId: null,
        defaultModelId: null,
        maxStorageBytes: null,
        monthlyRequests: null,
        monthlyDurationMs: null,
      },
      hasTranscriptionProvider: false,
    });
    assert.ok(statuses.some((item) => item.tone === 'disabled-global'));
    assert.ok(statuses.some((item) => item.tone === 'missing-provider'));
  });

  it('labels inherited defaults and explicit overrides', () => {
    assert.equal(matrixCellStatusLabel(matrixCellTone({
      observerUnavailable: false,
      globallyDisabled: false,
      hasOverride: false,
    })), 'Default');
    assert.equal(matrixCellStatusLabel(matrixCellTone({
      observerUnavailable: false,
      globallyDisabled: false,
      hasOverride: true,
    })), 'Override');
    assert.equal(
      roleHasOverride(
        [{ role: MembershipRoles.PARTICIPANT, capability: CampaignCapabilities.QUEST_EDIT, effect: 'GRANT' }],
        MembershipRoles.PARTICIPANT,
        CampaignCapabilities.QUEST_EDIT,
      ),
      true,
    );
  });
});
