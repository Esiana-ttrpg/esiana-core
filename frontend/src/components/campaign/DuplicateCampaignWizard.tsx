import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import type { CampaignCloneOptions } from '@shared/campaignCloneOptions';
import {
  CAMPAIGN_CLONE_PRESETS,
  DEFAULT_CLONE_PRESET_ID,
  detectPresetFromOptions,
  resolvePresetToOptions,
  type ClonePresetId,
  type ClonePresetUsed,
} from '@shared/campaignClonePresets';
import { controlClasses } from '@/components/ui/formStyles';
import { duplicateCampaign } from '@/lib/campaigns';
import { campaignDashboardPath } from '@/lib/campaignPaths';
import type { UserProfileCampaign } from '@/types/user';
import type { CampaignDiscoverabilityValue } from '@/types/campaign';
import { CampaignDiscoverability } from '@shared/campaignPolicy/discoverability';
import { getCampaignNameHandleError } from '@shared/campaignHandle';

interface DuplicateCampaignWizardProps {
  open: boolean;
  source: UserProfileCampaign;
  onClose: () => void;
  onCreated?: () => void;
}

function CloneOptionsEditor({
  options,
  onChange,
  customizeOpen,
  onToggleCustomize,
}: {
  options: CampaignCloneOptions;
  onChange: (next: CampaignCloneOptions) => void;
  customizeOpen: boolean;
  onToggleCustomize: () => void;
}) {
  function patchSection<K extends keyof CampaignCloneOptions>(
    section: K,
    key: keyof CampaignCloneOptions[K],
    value: boolean,
  ) {
    onChange({
      ...options,
      [section]: { ...options[section], [key]: value },
    });
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onToggleCustomize}
        className="text-sm font-medium text-primary hover:text-primary-hover"
      >
        {customizeOpen ? 'Hide customization' : "Customize what's copied"}
      </button>

      {customizeOpen ? (
        <div className="max-h-[40vh] space-y-4 overflow-y-auto rounded-lg border border-border bg-surface/40 p-4">
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Campaign structure</legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  ['wikiPages', 'Wiki pages'],
                  ['folderStructure', 'Folder structure'],
                  ['sidebarLayout', 'Navigation / sidebar layout'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={options.structure[key]}
                    onChange={(e) => patchSection('structure', key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">
              Recruitment and table setup
            </legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  ['settings', 'Recruitment settings'],
                  ['tableStyleTags', 'Table style tags'],
                  ['safety', 'Safety settings'],
                  ['publicDocs', 'Public recruitment docs'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={options.recruitment[key]}
                    onChange={(e) => patchSection('recruitment', key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Scheduling</legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  ['calendarStructure', 'Calendar structure'],
                  ['sessionCadence', 'Session cadence'],
                  ['sessionEventsLogs', 'Session events / logs'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={options.scheduling[key]}
                    onChange={(e) => patchSection('scheduling', key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Gameplay</legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  ['characters', 'Characters'],
                  ['inventoryState', 'Inventory / state'],
                  ['mapsAssets', 'Maps / assets'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={options.gameplay[key]}
                    onChange={(e) => patchSection('gameplay', key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-muted/60">
                <input type="checkbox" disabled checked={false} />
                Dice history (not available yet)
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Community</legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  ['members', 'Members'],
                  ['joinRequests', 'Join requests'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={options.community[key]}
                    onChange={(e) => patchSection('community', key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-muted/60">
                <input type="checkbox" disabled checked={false} />
                Chat history (not available yet)
              </label>
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}

export function DuplicateCampaignWizard({
  open,
  source,
  onClose,
  onCreated,
}: DuplicateCampaignWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [discoverability, setDiscoverability] = useState<CampaignDiscoverabilityValue>(
    CampaignDiscoverability.PRIVATE,
  );
  const [presetId, setPresetId] = useState<ClonePresetId | 'custom'>(DEFAULT_CLONE_PRESET_ID);
  const [copyOptions, setCopyOptions] = useState<CampaignCloneOptions>(() =>
    resolvePresetToOptions(DEFAULT_CLONE_PRESET_ID),
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleHandleError = name.trim() ? getCampaignNameHandleError(name) : null;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(`${source.name} (Copy)`);
    setDiscoverability(CampaignDiscoverability.PRIVATE);
    setPresetId(DEFAULT_CLONE_PRESET_ID);
    setCopyOptions(resolvePresetToOptions(DEFAULT_CLONE_PRESET_ID));
    setCustomizeOpen(false);
    setError(null);
  }, [open, source.id, source.name]);

  const activePreset = useMemo(
    () => detectPresetFromOptions(copyOptions),
    [copyOptions],
  );

  useEffect(() => {
    if (activePreset !== 'custom') {
      setPresetId(activePreset);
    } else {
      setPresetId('custom');
    }
  }, [activePreset]);

  if (!open) return null;

  function selectPreset(id: ClonePresetId) {
    setPresetId(id);
    setCopyOptions(resolvePresetToOptions(id));
    setCustomizeOpen(false);
  }

  function handleOptionsChange(next: CampaignCloneOptions) {
    setCopyOptions(next);
    const detected = detectPresetFromOptions(next);
    setPresetId(detected);
    if (detected === 'custom') setCustomizeOpen(true);
  }

  async function handleSubmit() {
    if (titleHandleError) {
      setError(titleHandleError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const presetUsed: ClonePresetUsed =
        presetId === 'custom' ? 'custom' : presetId;
      const created = await duplicateCampaign(source.id, {
        name: name.trim(),
        discoverability,
        copy: copyOptions,
        presetUsed,
      });
      onCreated?.();
      onClose();
      navigate(campaignDashboardPath(created.handle));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate campaign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className={TYPE_DISPLAY_CLASS}>Duplicate Campaign</h2>
            <p className="text-sm text-muted">From {source.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <p className="mb-4 rounded border border-red-700 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  New campaign name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={controlClasses}
                />
                <p className="mt-1 text-xs text-muted">
                  The campaign URL is generated automatically from this name.
                </p>
                {titleHandleError ? (
                  <p className="mt-1 text-xs text-red-300">{titleHandleError}</p>
                ) : null}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Discoverability</p>
                <div className="space-y-2">
                  {(
                    [
                      {
                        value: CampaignDiscoverability.PRIVATE,
                        label: 'Private',
                      },
                      {
                        value: CampaignDiscoverability.UNLISTED,
                        label: 'Unlisted (anonymous codex via link)',
                      },
                      {
                        value: CampaignDiscoverability.PUBLIC,
                        label: 'Public (Global Hub)',
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                    >
                      <input
                        type="radio"
                        checked={discoverability === option.value}
                        onChange={() => setDiscoverability(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={!name.trim() || Boolean(titleHandleError)}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Copy preset</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CAMPAIGN_CLONE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset.id)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                        presetId === preset.id
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-surface text-muted hover:border-primary/50'
                      }`}
                    >
                      <span className="font-semibold">{preset.label}</span>
                      <p className="mt-1 text-xs text-muted">{preset.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>

              <CloneOptionsEditor
                options={copyOptions}
                onChange={handleOptionsChange}
                customizeOpen={customizeOpen}
                onToggleCustomize={() => setCustomizeOpen((v) => !v)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-muted hover:text-foreground"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step === 2 ? (
            <button
              type="button"
              disabled={busy || !name.trim() || Boolean(titleHandleError)}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create duplicate'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
