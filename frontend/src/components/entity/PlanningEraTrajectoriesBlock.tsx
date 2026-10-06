import { trajectoryKey } from '@shared/factionMomentumMetadata';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import {
  createEraTrajectory,
  type CampaignEra,
  type EraTrajectory,
} from '@shared/factionMomentumMetadata';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { fetchCampaignMomentum } from '@/lib/progressionApi';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

type TrajectoriesDraft = { eraTrajectories: EraTrajectory[] };

interface PlanningEraTrajectoriesBlockProps<T extends TrajectoriesDraft> {
  campaignHandle: string;
  draft: T;
  setDraft: Dispatch<SetStateAction<T>>;
  onPersist: (patch: Partial<T>) => void | Promise<void>;
  emptyHint?: string;
}

function upsertTrajectory(
  trajectories: EraTrajectory[],
  trajectoryIndex: number,
  patch: Partial<EraTrajectory>,
): EraTrajectory[] {
  const existing = trajectoryIndex >= 0 ? trajectories[trajectoryIndex] : undefined;
  const nextEraId = patch.eraId !== undefined ? patch.eraId : existing?.eraId ?? null;
  if (nextEraId != null && nextEraId !== existing?.eraId && trajectories.some((t) => t.eraId === nextEraId)) {
    return trajectories;
  }
  const nextTrajectory = createEraTrajectory({
    ...(existing ?? { eraId: null }),
    ...patch,
    eraId: nextEraId,
  });
  if (trajectoryIndex < 0) return [...trajectories, nextTrajectory];
  return trajectories.map((trajectory, index) => index === trajectoryIndex ? nextTrajectory : trajectory);
}

function trajectoriesForPersistence(trajectories: EraTrajectory[]): EraTrajectory[] {
  return trajectories.map((trajectory) => ({
    ...trajectory,
    direction: trajectory.direction?.trim() || null,
    gmNote: trajectory.gmNote?.trim() || null,
    outcome: trajectory.outcome?.trim() || null,
  }));
}

/**
 * Lightweight trajectory editor for Characters / Locations — planning fields only.
 * Same underlying eraTrajectories objects as Chronology › Eras.
 */
export function PlanningEraTrajectoriesBlock<T extends TrajectoriesDraft>({
  campaignHandle,
  draft,
  setDraft,
  onPersist,
  emptyHint = 'No trajectories yet. Trajectories are opt-in directions over time.',
}: PlanningEraTrajectoriesBlockProps<T>) {
  const [eras, setEras] = useState<CampaignEra[]>([]);

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

  function updateTrajectory(trajectoryIndex: number, patch: Partial<EraTrajectory>, persist = false) {
    setDraft((prev) => {
      const eraTrajectories = upsertTrajectory(prev.eraTrajectories, trajectoryIndex, patch);
      if (persist) {
        void onPersist({ eraTrajectories: trajectoriesForPersistence(eraTrajectories) } as Partial<T>);
      }
      return { ...prev, eraTrajectories };
    });
  }

  function persistCurrentTrajectories() {
    setDraft((prev) => {
      void onPersist({
        eraTrajectories: trajectoriesForPersistence(prev.eraTrajectories),
      } as Partial<T>);
      return prev;
    });
  }

  function addTrajectory() {
    const currentEra = eras.find((era) => era.isCurrent) ?? eras[0];
    if (!currentEra) return;
    if (draft.eraTrajectories.some((t) => t.eraId === currentEra.id)) return;
    setDraft((prev) => {
      const eraTrajectories = upsertTrajectory(prev.eraTrajectories, -1, {
        eraId: currentEra.id,
        direction: '',
        outcome: null,
        byEraId: null,
      });
      void onPersist({ eraTrajectories: trajectoriesForPersistence(eraTrajectories) } as Partial<T>);
      return { ...prev, eraTrajectories };
    });
  }

  function removeTrajectory(trajectoryIndex: number) {
    setDraft((prev) => {
      const eraTrajectories = prev.eraTrajectories.filter((_trajectory, candidate) => candidate !== trajectoryIndex);
      void onPersist({ eraTrajectories: trajectoriesForPersistence(eraTrajectories) } as Partial<T>);
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
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
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
              {trajectories.map((trajectory, trajectoryIndex) => (
                <tr key={`${trajectoryKey(trajectory)}:${trajectoryIndex}`} className="border-t border-border/50 align-top">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={trajectory.direction ?? ''}
                      onChange={(e) =>
                        updateTrajectory(trajectoryIndex, {
                          direction: e.target.value,
                        })
                      }
                      onBlur={persistCurrentTrajectories}
                      className={fieldClass}
                      placeholder="Direction"
                    />
                    <input
                      type="text"
                      value={trajectory.gmNote ?? ''}
                      onChange={(e) =>
                        updateTrajectory(trajectoryIndex, {
                          gmNote: e.target.value,
                        })
                      }
                      onBlur={persistCurrentTrajectories}
                      className={`${fieldClass} mt-1`}
                      placeholder="GM note"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={trajectory.eraId ?? ''}
                      onChange={(e) => {
                        updateTrajectory(trajectoryIndex, { eraId: e.target.value }, true);
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
                        updateTrajectory(trajectoryIndex, {
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
                          trajectoryIndex,
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
                      onClick={() => removeTrajectory(trajectoryIndex)}
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

      <button
        type="button"
        onClick={addTrajectory}
        className="text-xs text-primary hover:underline"
      >
        + Trajectory
      </button>
    </div>
  );
}
