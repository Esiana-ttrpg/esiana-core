import { trajectoryKey } from '@shared/factionMomentumMetadata';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import {
  FACTION_MOMENTUM_STATES,
  FACTION_MOMENTUM_STATE_LABELS,
  createFactionEraTrajectory,
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

function upsertTrajectory(
  trajectories: FactionEraTrajectory[],
  fromEraId: string | null,
  patch: Partial<FactionEraTrajectory>,
): FactionEraTrajectory[] {
  const existing = trajectories.find((t) => trajectoryKey(t) === fromEraId);
  const nextEraId = patch.eraId !== undefined ? patch.eraId : existing ? existing.eraId : fromEraId;
  if (nextEraId != null && nextEraId !== existing?.eraId && trajectories.some((t) => t.eraId === nextEraId)) {
    return trajectories;
  }
  const nextTrajectory = createFactionEraTrajectory({
    ...(existing ?? { eraId: fromEraId }),
    ...patch,
    eraId: nextEraId,
  });
  const without = trajectories.filter((t) => trajectoryKey(t) !== fromEraId);
  return [...without, nextTrajectory];
}

function trajectoriesForPersistence(
  trajectories: FactionEraTrajectory[],
): FactionEraTrajectory[] {
  return trajectories.map((trajectory) => ({
    ...trajectory,
    direction: trajectory.direction?.trim() || null,
    gmNote: trajectory.gmNote?.trim() || null,
    outcome: trajectory.outcome?.trim() || null,
  }));
}

export function OrganizationEraTrajectoriesBlock({
  campaignHandle,
  draft,
  setDraft,
  onPersist,
}: OrganizationEraTrajectoriesBlockProps) {
  const [eras, setEras] = useState<CampaignEra[]>([]);
  const [showSignals, setShowSignals] = useState(false);

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
    fromEraId: string | null,
    patch: Partial<FactionEraTrajectory>,
    persist = false,
  ) {
    setDraft((prev) => {
      const eraTrajectories = upsertTrajectory(prev.eraTrajectories, fromEraId, patch);
      if (persist) {
        void onPersist({ eraTrajectories: trajectoriesForPersistence(eraTrajectories) });
      }
      return { ...prev, eraTrajectories };
    });
  }

  function persistCurrentTrajectories() {
    setDraft((prev) => {
      void onPersist({ eraTrajectories: trajectoriesForPersistence(prev.eraTrajectories) });
      return prev;
    });
  }

  function addTrajectory() {
    const currentEra = eras.find((era) => era.isCurrent) ?? eras[0];
    if (!currentEra) return;
    if (draft.eraTrajectories.some((t) => t.eraId === currentEra.id)) return;
    setDraft((prev) => {
      const eraTrajectories = upsertTrajectory(prev.eraTrajectories, currentEra.id, {
        direction: '',
        outcome: null,
        byEraId: null,
      });
      void onPersist({ eraTrajectories: trajectoriesForPersistence(eraTrajectories) });
      return { ...prev, eraTrajectories };
    });
  }

  function removeTrajectory(eraId: string | null) {
    setDraft((prev) => {
      const eraTrajectories = prev.eraTrajectories.filter((t) => trajectoryKey(t) !== eraId);
      void onPersist({ eraTrajectories: trajectoriesForPersistence(eraTrajectories) });
      return { ...prev, eraTrajectories };
    });
  }

  if (eras.length === 0 && draft.eraTrajectories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No campaign eras yet. Configure them in{' '}
        <Link
          to={`/campaigns/${campaignHandle}/chronology?view=eras`}
          className="text-primary hover:underline"
        >
          Chronology › Eras
        </Link>
        .
      </p>
    );
  }

  const trajectories = draft.eraTrajectories;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Trajectories</p>
        <Link
          to={campaignProgressionPath(campaignHandle, 'trajectories')}
          className="text-xs text-primary hover:underline"
        >
          Open Trajectories
        </Link>
      </div>

      {trajectories.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No trajectories on this organization yet. Trajectories are opt-in directions over time.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-1 pr-2 font-medium">Trajectory</th>
                <th className="pb-1 pr-2 font-medium">From</th>
                <th className="pb-1 pr-2 font-medium">Outcome</th>
                <th className="pb-1 pr-2 font-medium">By</th>
                <th className="pb-1 font-medium" aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {trajectories.map((trajectory) => (
                <tr key={trajectoryKey(trajectory)} className="border-t border-border/50 align-top">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={trajectory.direction ?? ''}
                      onChange={(e) =>
                        updateTrajectory(trajectoryKey(trajectory), {
                          direction: e.target.value,
                        })
                      }
                      onBlur={persistCurrentTrajectories}
                      className={fieldClass}
                      placeholder="Direction"
                    />
                    {showSignals ? (
                      <div className="mt-1 space-y-1">
                        <select
                          value={trajectory.momentumState}
                          onChange={(e) => {
                            updateTrajectory(
                              trajectoryKey(trajectory),
                              { momentumState: e.target.value as FactionMomentumState },
                              true,
                            );
                          }}
                          className={fieldClass}
                          aria-label="Development signal"
                        >
                          {FACTION_MOMENTUM_STATES.map((state) => (
                            <option key={state} value={state}>
                              {FACTION_MOMENTUM_STATE_LABELS[state]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={trajectory.pressure ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateTrajectory(trajectoryKey(trajectory), {
                              pressure: raw === '' ? null : Number(raw),
                            });
                          }}
                          onBlur={persistCurrentTrajectories}
                          className={fieldClass}
                          placeholder="Pressure"
                          aria-label="Pressure"
                        />
                        <input
                          type="text"
                          value={trajectory.gmNote ?? ''}
                          onChange={(e) =>
                            updateTrajectory(trajectoryKey(trajectory), {
                              gmNote: e.target.value,
                            })
                          }
                          onBlur={persistCurrentTrajectories}
                          className={fieldClass}
                          placeholder="GM note"
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={trajectory.eraId ?? ''}
                      onChange={(e) => {
                        updateTrajectory(trajectoryKey(trajectory), { eraId: e.target.value }, true);
                      }}
                      className={fieldClass}
                    >
                      {!trajectory.eraId && <option value="">{trajectory.eraSnapshot?.name ?? 'Era'} (deleted)</option>}
                      {eras.map((era) => (
                        <option key={era.id} value={era.id}>
                          {era.calendarName ? `${era.calendarName} · ` : ''}{era.name}{era.visibility === 'DM_ONLY' ? ' [DM]' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={trajectory.outcome ?? ''}
                      onChange={(e) =>
                        updateTrajectory(trajectoryKey(trajectory), {
                          outcome: e.target.value,
                        })
                      }
                      onBlur={persistCurrentTrajectories}
                      className={fieldClass}
                      placeholder="Outcome"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={trajectory.byEraId ?? ''}
                      onChange={(e) => {
                        updateTrajectory(
                          trajectoryKey(trajectory),
                          { byEraId: e.target.value || null },
                          true,
                        );
                      }}
                      className={fieldClass}
                    >
                      <option value="">{trajectory.byEraSnapshot ? `${trajectory.byEraSnapshot.name} (deleted)` : 'Open-ended'}</option>
                      {eras.filter(era => era.calendarId === eras.find(from => from.id === trajectory.eraId)?.calendarId).map((era) => (
                        <option key={era.id} value={era.id}>
                          {era.calendarName ? `${era.calendarName} · ` : ''}{era.name}{era.visibility === 'DM_ONLY' ? ' [DM]' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeTrajectory(trajectoryKey(trajectory))}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addTrajectory}
          className="text-xs text-primary hover:underline"
        >
          + Trajectory
        </button>
        <button
          type="button"
          onClick={() => setShowSignals((v) => !v)}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          {showSignals ? 'Hide development signal' : 'Development signal'}
        </button>
      </div>
    </div>
  );
}
