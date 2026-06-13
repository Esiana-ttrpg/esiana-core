import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import {
  FACTION_MOMENTUM_STATES,
  FACTION_MOMENTUM_STATE_LABELS,
  type CampaignEra,
  type FactionEraTrajectory,
  type FactionMomentumState,
} from '@shared/factionMomentumMetadata';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { fetchCampaignMomentum } from '@/lib/progressionApi';
import type { OrganizationMetadataFields } from '@/lib/organizationMetadata';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface OrganizationEraTrajectoriesBlockProps {
  campaignHandle: string;
  draft: OrganizationMetadataFields;
  setDraft: Dispatch<SetStateAction<OrganizationMetadataFields>>;
  onPersist: (patch: Partial<OrganizationMetadataFields>) => void | Promise<void>;
}

function trajectoryForEra(
  trajectories: FactionEraTrajectory[],
  eraId: string,
): FactionEraTrajectory | undefined {
  return trajectories.find((t) => t.eraId === eraId);
}

function nextTrajectories(
  trajectories: FactionEraTrajectory[],
  eraId: string,
  patch: Partial<FactionEraTrajectory>,
): FactionEraTrajectory[] {
  const existing = trajectoryForEra(trajectories, eraId);
  const nextTrajectory: FactionEraTrajectory = existing
    ? { ...existing, ...patch }
    : {
        eraId,
        momentumState: (patch.momentumState ?? 'stable') as FactionMomentumState,
        pressure: patch.pressure ?? null,
        gmNote: patch.gmNote ?? null,
      };
  const without = trajectories.filter((t) => t.eraId !== eraId);
  return [...without, nextTrajectory];
}

export function OrganizationEraTrajectoriesBlock({
  campaignHandle,
  draft,
  setDraft,
  onPersist,
}: OrganizationEraTrajectoriesBlockProps) {
  const [eras, setEras] = useState<CampaignEra[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCampaignMomentum(campaignHandle)
      .then((payload) => {
        if (!cancelled) setEras(payload.state.eras);
      })
      .catch(() => {
        if (!cancelled) setEras([]);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  function updateTrajectory(
    eraId: string,
    patch: Partial<FactionEraTrajectory>,
    persist = false,
  ) {
    setDraft((prev) => {
      const eraTrajectories = nextTrajectories(prev.eraTrajectories, eraId, patch);
      if (persist) {
        void onPersist({ eraTrajectories });
      }
      return { ...prev, eraTrajectories };
    });
  }

  function persistCurrentTrajectories() {
    setDraft((prev) => {
      void onPersist({ eraTrajectories: prev.eraTrajectories });
      return prev;
    });
  }

  if (eras.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Load campaign eras from{' '}
        <Link
          to={campaignProgressionPath(campaignHandle, 'insights')}
          className="text-primary hover:underline"
        >
          Progression › Trajectories
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Era trajectories</p>
        <Link
          to={campaignProgressionPath(campaignHandle, 'insights')}
          className="text-xs text-primary hover:underline"
        >
          Manage eras
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-1 pr-2 font-medium">Era</th>
              <th className="pb-1 pr-2 font-medium">Trajectory</th>
              <th className="pb-1 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {eras.map((era) => {
              const trajectory = trajectoryForEra(draft.eraTrajectories, era.id);
              return (
                <tr key={era.id} className="border-t border-border/50">
                  <td className="py-2 pr-2 align-top text-foreground">
                    {era.name}
                    {era.isCurrent ? (
                      <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                        (current)
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <select
                      value={trajectory?.momentumState ?? ''}
                      onChange={(e) => {
                        const value = e.target.value as FactionMomentumState | '';
                        if (!value) return;
                        updateTrajectory(era.id, { momentumState: value }, true);
                      }}
                      className={fieldClass}
                    >
                      <option value="">—</option>
                      {FACTION_MOMENTUM_STATES.map((state) => (
                        <option key={state} value={state}>
                          {FACTION_MOMENTUM_STATE_LABELS[state]}
                        </option>
                      ))}
                    </select>
                    {showAdvanced ? (
                      <label className="mt-1 block text-[10px] text-muted-foreground">
                        Pressure (internal)
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={trajectory?.pressure ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateTrajectory(era.id, {
                              pressure: raw === '' ? null : Number(raw),
                            });
                          }}
                          onBlur={persistCurrentTrajectories}
                          className={`${fieldClass} mt-0.5`}
                        />
                      </label>
                    ) : null}
                  </td>
                  <td className="py-2 align-top">
                    <input
                      type="text"
                      value={trajectory?.gmNote ?? ''}
                      onChange={(e) =>
                        updateTrajectory(era.id, {
                          gmNote: e.target.value.trim() || null,
                        })
                      }
                      onBlur={persistCurrentTrajectories}
                      className={fieldClass}
                      placeholder="GM note"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-[10px] text-muted-foreground hover:text-foreground"
      >
        {showAdvanced ? 'Hide advanced' : 'Advanced pressure weighting'}
      </button>
    </div>
  );
}
