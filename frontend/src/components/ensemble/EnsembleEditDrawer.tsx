import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { ENSEMBLE_SPOTLIGHT_RANDOM, type EnsembleConfig } from '@/lib/ensembleConfig';
import type { PartyMemberProjection } from '@/lib/buildPartyProjection';

import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';

interface EnsembleEditDrawerProps {
  open: boolean;
  campaignHandle: string;
  config: EnsembleConfig;
  rosterForSpotlight: PartyMemberProjection[];
  saving: boolean;
  onClose: () => void;
  onSave: (config: EnsembleConfig) => void;
}

const fieldClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

export function EnsembleEditDrawer({
  open,
  campaignHandle,
  config,
  rosterForSpotlight,
  saving,
  onClose,
  onSave,
}: EnsembleEditDrawerProps) {
  const [draft, setDraft] = useState<EnsembleConfig>(config);

  useEffect(() => {
    if (open) setDraft(config);
  }, [open, config]);

  if (!open) return null;

  function update(patch: Partial<EnsembleConfig>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        aria-label="Close party settings"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Party settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Party name
            </span>
            <input
              className={fieldClass}
              value={draft.name ?? ''}
              placeholder="The Ashen Company"
              onChange={(e) => update({ name: e.target.value || null })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Tagline
            </span>
            <textarea
              className={`${fieldClass} min-h-[72px] resize-y`}
              value={draft.summary ?? ''}
              placeholder="Five exiles bound by the Black Oath."
              onChange={(e) => update({ summary: e.target.value || null })}
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Party banner
            </span>
            <ImportImageUrlField
              campaignHandle={campaignHandle}
              value={draft.bannerImageUrl ?? ''}
              uploadType="generic"
              inputClassName={fieldClass}
              onChange={(referenceUrl) =>
                update({ bannerImageUrl: referenceUrl.trim() || null })
              }
            />
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Party arc
            </span>
            <input
              className={fieldClass}
              value={draft.activeArc ?? ''}
              onChange={(e) => update({ activeArc: e.target.value || null })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Themes (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.themes.join(', ')}
              onChange={(e) =>
                update({
                  themes: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Known for (one per line)
            </span>
            <textarea
              className={`${fieldClass} min-h-[80px] resize-y`}
              value={draft.knownFor.join('\n')}
              onChange={(e) =>
                update({
                  knownFor: e.target.value
                    .split('\n')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Spotlight</p>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Featured member</span>
              <select
                className={fieldClass}
                value={draft.spotlightCharacterId ?? ''}
                onChange={(e) => {
                  const next = e.target.value;
                  update({
                    spotlightCharacterId:
                      next === ''
                        ? null
                        : next === ENSEMBLE_SPOTLIGHT_RANDOM
                          ? ENSEMBLE_SPOTLIGHT_RANDOM
                          : next,
                  });
                }}
              >
                <option value="">No spotlight</option>
                <option value={ENSEMBLE_SPOTLIGHT_RANDOM}>Random party member</option>
                {rosterForSpotlight.map((member) => (
                  <option key={member.characterId} value={member.characterId}>
                    {member.identity.displayName || member.cardIdentityLine}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Featured quote</span>
              <textarea
                className={`${fieldClass} min-h-[60px] resize-y`}
                value={draft.spotlightQuote ?? ''}
                onChange={(e) => update({ spotlightQuote: e.target.value || null })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Right now…</span>
              <textarea
                className={`${fieldClass} min-h-[60px] resize-y`}
                value={draft.spotlightNote ?? ''}
                onChange={(e) => update({ spotlightNote: e.target.value || null })}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Featured quest page IDs (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.featuredQuestIds.join(', ')}
              onChange={(e) =>
                update({
                  featuredQuestIds: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Tension notes (one per line)
            </span>
            <textarea
              className={`${fieldClass} min-h-[80px] resize-y`}
              value={draft.tensionNotes.join('\n')}
              onChange={(e) =>
                update({
                  tensionNotes: e.target.value
                    .split('\n')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Campaign landing page
            </span>
            <select
              className={fieldClass}
              value={draft.landingSurface ?? ''}
              onChange={(e) =>
                update({
                  landingSurface:
                    e.target.value === 'party' || e.target.value === 'dashboard'
                      ? e.target.value
                      : null,
                })
              }
            >
              <option value="">Default (dashboard)</option>
              <option value="party">Party cast screen</option>
              <option value="dashboard">Operations dashboard</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(draft)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </aside>
    </div>
  );
}
