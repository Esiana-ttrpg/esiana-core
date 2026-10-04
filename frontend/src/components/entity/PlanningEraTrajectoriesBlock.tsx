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
  fromEraId: string,
  patch: Partial<EraTrajectory>,
): EraTrajectory[] {
  const existing = trajectories.find((t) => t.eraId === fromEraId);
  const nextEraId = patch.eraId ?? existing?.eraId ?? fromEraId;
  if (nextEraId !== fromEraId && trajectories.some((t) => t.eraId === nextEraId)) {
    return trajectories;
  }
  const nextTrajectory = createEraTrajectory({
    ...(existing ?? { eraId: fromEraId }),
    ...patch,
    eraId: nextEraId,
  });
  const without = trajectories.filter((t) => t.eraId !== fromEraId);
  return [...without, nextTrajectory];
}

/**
 * Lightweight trajectory editor for Characters / Locations — planning fields only.
 * Same underlying eraTrajectories objects as Progression › Trajectories.
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

  function updateTrajectory(fromEraId: string, patch: Partial<EraTrajectory>, persist = false) {
    setDraft((prev) => {
      const eraTrajectories = upsertTrajectory(prev.eraTrajectories, fromEraId, patch);
      if (persist) {
        void onPersist({ eraTrajectories } as Partial<T>);
      }
      return { ...prev, eraTrajectories };
    });
  }

  function persistCurrentTrajectories() {
    setDraft((prev) => {
      void onPersist({ eraTrajectories: prev.eraTrajectories } as Partial<T>);
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
      void onPersist({ eraTrajectories } as Partial<T>);
      return { ...prev, eraTrajectories };
    });
  }

  function removeTrajectory(eraId: string) {
    setDraft((prev) => {
      const eraTrajectories = prev.eraTrajectories.filter((t) => t.eraId !== eraId);
      void onPersist({ eraTrajectories } as Partial<T>);
      return { ...prev, eraTrajectories };
    });
  }

  if (eras.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No campaign eras yet. Configure them in{' '}
        <Link
          to={campaignProgressionPath(campaignHandle, 'trajectories')}
          className="text-primary hover:underline"
        >
          Progression › Trajectories
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
              {trajectories.map((trajectory) => (
                <tr key={trajectory.eraId} className="border-t border-border/50 align-top">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={trajectory.direction ?? ''}
                      onChange={(e) =>
                        updateTrajectory(trajectory.eraId, {
                          direction: e.target.value.trim() || null,
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
                        updateTrajectory(trajectory.eraId, {
                          gmNote: e.target.value.trim() || null,
                        })
                      }
                      onBlur={persistCurrentTrajectories}
                      className={`${fieldClass} mt-1`}
                      placeholder="GM note"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={trajectory.eraId}
                      onChange={(e) => {
                        updateTrajectory(trajectory.eraId, { eraId: e.target.value }, true);
                      }}
                      className={fieldClass}
                    >
                      {eras.map((era) => (
                        <option key={era.id} value={era.id}>
                          {era.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={trajectory.outcome ?? ''}
                      onChange={(e) =>
                        updateTrajectory(trajectory.eraId, {
                          outcome: e.target.value.trim() || null,
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
                          trajectory.eraId,
                          { byEraId: e.target.value || null },
                          true,
                        );
                      }}
                      className={fieldClass}
                    >
                      <option value="">Open-ended</option>
                      {eras.map((era) => (
                        <option key={era.id} value={era.id}>
                          {era.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeTrajectory(trajectory.eraId)}
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
