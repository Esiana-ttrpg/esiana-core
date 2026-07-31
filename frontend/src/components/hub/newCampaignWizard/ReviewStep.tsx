import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { ChevronRight, Globe, Lock } from 'lucide-react';
import { getGameSystemLabel } from '@/components/campaign/GameSystemSelect';
import { getCampaignThemeLabel } from '@/components/campaign/CampaignThemeMultiSelect';
import { CampaignDiscoverability } from '@shared/campaignPolicy/discoverability';
import type { NewCampaignWizardPayload, WizardStepId } from './types';
import { isBlankCampaignSource } from './types';

interface ReviewStepProps {
  payload: NewCampaignWizardPayload;
  setPayload: Dispatch<SetStateAction<NewCampaignWizardPayload>>;
  onNavigate: (stepId: WizardStepId) => void;
  defaultsAvailable: {
    tableExpectations: boolean;
    safetyGuidelines: boolean;
    sessionZero: boolean;
    houseRules: boolean;
    recruitmentPreferences: boolean;
  };
  hasUnmappedFolders: boolean;
}

function SummarySection({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-background/50 p-4 text-left transition-colors hover:border-primary/40 hover:bg-elevated/50"
    >
      <p className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
        {title}
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </p>
      <div className="mt-3 space-y-1.5 text-sm text-muted">{children}</div>
    </button>
  );
}

function formatCampaignSource(payload: NewCampaignWizardPayload): string {
  const { imports } = payload;
  if (imports.campaignSource === 'contentPack' && imports.contentPack) {
    return `Content pack: ${imports.contentPack.packId}`;
  }
  if (imports.campaignSource === 'sampleData' && imports.sampleDataProfile) {
    return `Sample data: ${imports.sampleDataProfile.profileId}`;
  }
  if (imports.campaignSource === 'blank') {
    return 'Blank campaign';
  }
  return imports.campaignSource;
}

function partySummary(payload: NewCampaignWizardPayload): string {
  const named = payload.foundation.party.filter((row) => row.name.trim());
  if (payload.foundation.partySkipped && named.length === 0) {
    return 'Not created';
  }
  if (named.length === 0) {
    return 'Not created';
  }
  return `${named.length} character${named.length === 1 ? '' : 's'} ready to create`;
}

function tensionSummary(payload: NewCampaignWizardPayload): string {
  if (payload.foundation.tensionSkipped || !payload.foundation.tension?.title.trim()) {
    return 'Not created';
  }
  return payload.foundation.tension.title.trim();
}

export function ReviewStep({
  payload,
  setPayload,
  onNavigate,
  defaultsAvailable,
  hasUnmappedFolders,
}: ReviewStepProps) {
  const isBlank = isBlankCampaignSource(payload.imports.campaignSource);
  const visibilityLabel =
    payload.access.discoverability === CampaignDiscoverability.PUBLIC ? 'Public' : 'Private';

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Campaign creation summary</h3>
        <p className="mt-1 text-sm text-muted">
          Review your choices. Select a section to jump back and edit.
        </p>
      </div>

      <div className="space-y-3">
        <SummarySection title="Campaign" onClick={() => onNavigate('identity')}>
          <p>
            <span className="text-foreground">Title:</span> {payload.identity.title || '—'}
          </p>
          <p>
            <span className="text-foreground">Game system:</span>{' '}
            {getGameSystemLabel(
              payload.identity.gameSystem,
              payload.identity.customGameSystemName,
            )}
          </p>
          <p>
            <span className="text-foreground">Themes:</span>{' '}
            {payload.identity.genreThemes.length > 0
              ? payload.identity.genreThemes.map(getCampaignThemeLabel).join(', ')
              : 'None'}
          </p>
          <p>
            <span className="text-foreground">Description:</span>{' '}
            {payload.identity.description.trim() || '—'}
          </p>
        </SummarySection>

        <SummarySection title="Source" onClick={() => onNavigate('source')}>
          <p>{formatCampaignSource(payload)}</p>
          {payload.imports.folderMappings.length > 0 ? (
            <p>{payload.imports.folderMappings.length} import folders mapped</p>
          ) : null}
          {payload.imports.markdownZipFile || payload.imports.backupZipFile ? (
            <p>Import file attached</p>
          ) : null}
        </SummarySection>

        {isBlank ? (
          <SummarySection title="World foundation" onClick={() => onNavigate('party')}>
            <p>
              <span className="text-foreground">Party:</span> {partySummary(payload)}
            </p>
            <p>
              <span className="text-foreground">First source of tension:</span>{' '}
              {tensionSummary(payload)}
            </p>
            {payload.foundation.tension?.kind === 'location' &&
            payload.foundation.tension.title.trim() ? (
              <p>
                <span className="text-foreground">Starting location:</span>{' '}
                {payload.foundation.tension.title.trim()}
              </p>
            ) : null}
          </SummarySection>
        ) : null}

        <SummarySection title="Settings" onClick={() => onNavigate('source')}>
          <p>
            Calendar:{' '}
            {payload.imports.calendarConfigFile ? 'Configuration attached' : 'Not attached'}
          </p>
        </SummarySection>

        <div className="rounded-xl border border-border bg-background/50 p-4">
          <p className="text-sm font-semibold text-foreground">Access</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setPayload((current) => ({
                  ...current,
                  access: { discoverability: CampaignDiscoverability.PRIVATE },
                }))
              }
              className={`rounded-xl border p-4 text-left transition-colors ${
                payload.access.discoverability === CampaignDiscoverability.PRIVATE
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border hover:border-border'
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="size-4 text-primary" />
                Private
              </p>
              <p className="mt-2 text-xs text-muted">
                Not listed on the Global Hub. Invite players after creation to grant membership
                access.
              </p>
            </button>
            <button
              type="button"
              onClick={() =>
                setPayload((current) => ({
                  ...current,
                  access: { discoverability: CampaignDiscoverability.PUBLIC },
                }))
              }
              className={`rounded-xl border p-4 text-left transition-colors ${
                payload.access.discoverability === CampaignDiscoverability.PUBLIC
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border hover:border-border'
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Globe className="size-4 text-primary" />
                Public
              </p>
              <p className="mt-2 text-xs text-muted">
                Listed on the Global Hub for public discovery. Party membership is still managed
                separately.
              </p>
            </button>
          </div>
          <div className="mt-4 space-y-1 text-sm text-muted">
            <p>
              <span className="text-foreground">Visibility:</span> {visibilityLabel}
            </p>
            <p>
              <span className="text-foreground">Members:</span> You (GM) — invite others after
              creation
            </p>
            {payload.access.discoverability === CampaignDiscoverability.PRIVATE ? (
              <p className="text-xs">
                After creation, use the invite link to add players. That link grants membership
                only and is not anonymous codex access.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {(defaultsAvailable.tableExpectations ||
        defaultsAvailable.houseRules ||
        defaultsAvailable.sessionZero ||
        defaultsAvailable.safetyGuidelines ||
        defaultsAvailable.recruitmentPreferences) && (
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <p className="text-sm font-semibold text-foreground">Import defaults</p>
          <p className="mt-1 text-xs text-muted">
            Copy saved templates from Campaign Defaults into this campaign.
          </p>
          <ul className="mt-3 space-y-2">
            {defaultsAvailable.tableExpectations ? (
              <li>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={payload.importDefaults.tableExpectations}
                    onChange={(e) =>
                      setPayload((current) => ({
                        ...current,
                        importDefaults: {
                          ...current.importDefaults,
                          tableExpectations: e.target.checked,
                        },
                      }))
                    }
                    className="size-4 rounded border-border"
                  />
                  Table expectations
                </label>
              </li>
            ) : null}
            {defaultsAvailable.safetyGuidelines ? (
              <li>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={payload.importDefaults.safetyGuidelines}
                    onChange={(e) =>
                      setPayload((current) => ({
                        ...current,
                        importDefaults: {
                          ...current.importDefaults,
                          safetyGuidelines: e.target.checked,
                        },
                      }))
                    }
                    className="size-4 rounded border-border"
                  />
                  Safety guidelines
                </label>
              </li>
            ) : null}
            {defaultsAvailable.sessionZero ? (
              <li>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={payload.importDefaults.sessionZero}
                    onChange={(e) =>
                      setPayload((current) => ({
                        ...current,
                        importDefaults: {
                          ...current.importDefaults,
                          sessionZero: e.target.checked,
                        },
                      }))
                    }
                    className="size-4 rounded border-border"
                  />
                  Session zero
                </label>
              </li>
            ) : null}
            {defaultsAvailable.houseRules ? (
              <li>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={payload.importDefaults.houseRules}
                    onChange={(e) =>
                      setPayload((current) => ({
                        ...current,
                        importDefaults: {
                          ...current.importDefaults,
                          houseRules: e.target.checked,
                        },
                      }))
                    }
                    className="size-4 rounded border-border"
                  />
                  House rules
                </label>
              </li>
            ) : null}
            {defaultsAvailable.recruitmentPreferences ? (
              <li>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={payload.importDefaults.recruitmentPreferences}
                    onChange={(e) =>
                      setPayload((current) => ({
                        ...current,
                        importDefaults: {
                          ...current.importDefaults,
                          recruitmentPreferences: e.target.checked,
                        },
                      }))
                    }
                    className="size-4 rounded border-border"
                  />
                  Recruitment preferences
                </label>
              </li>
            ) : null}
          </ul>
        </div>
      )}

      {hasUnmappedFolders ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          Some imported folders are still unmapped. Return to Source and assign every folder to
          continue.
        </p>
      ) : null}
    </section>
  );
}
