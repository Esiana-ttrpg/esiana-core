import { useMemo, useState } from 'react';
import {
  createEraTrajectory,
  createFactionEraTrajectory,
  type CampaignEra,
  type EraTrajectory,
} from '@shared/factionMomentumMetadata';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import {
  updateCharacterMetadata,
  updateLocationMetadata,
  updateOrganizationMetadata,
} from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';
import type { TrajectorySubjectCategory } from '@shared/developmentProvider';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

export type TrajectorySubjectOption = {
  page: WikiTreeNode;
  category: TrajectorySubjectCategory;
  statusLabel?: string;
};

interface CreateTrajectoryDialogProps {
  campaignHandle: string;
  eras: CampaignEra[];
  subjects: TrajectorySubjectOption[];
  existingKeys: Set<string>;
  onCreated: (pageId: string, trajectories: EraTrajectory[], category: TrajectorySubjectCategory) => void;
  onCancel: () => void;
}

function subjectKey(pageId: string, eraId: string): string {
  return `${pageId}::${eraId}`;
}

const CATEGORY_LABEL: Record<TrajectorySubjectCategory, string> = {
  organizations: 'Organizations',
  characters: 'Characters',
  locations: 'Locations',
};

const CATEGORY_ORDER: TrajectorySubjectCategory[] = [
  'organizations',
  'characters',
  'locations',
];

export function CreateTrajectoryDialog({
  campaignHandle,
  eras,
  subjects,
  existingKeys,
  onCreated,
  onCancel,
}: CreateTrajectoryDialogProps) {
  const defaultEraId = eras.find((era) => era.isCurrent)?.id ?? eras[0]?.id ?? '';
  const [query, setQuery] = useState('');
  const [pageId, setPageId] = useState('');
  const [direction, setDirection] = useState('');
  const [fromEraId, setFromEraId] = useState(defaultEraId);
  const [outcome, setOutcome] = useState('');
  const [byEraId, setByEraId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleSubjects = useMemo(() => {
    if (includeInactive) return subjects;
    return subjects.filter((subject) => {
      if (subject.category !== 'characters') return true;
      const status = subject.statusLabel?.toUpperCase();
      return status !== 'DECEASED' && status !== 'EXILED';
    });
  }, [subjects, includeInactive]);

  const groupedMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? visibleSubjects.filter((s) => s.page.title.toLowerCase().includes(q))
      : visibleSubjects;
    const groups: Record<TrajectorySubjectCategory, TrajectorySubjectOption[]> = {
      organizations: [],
      characters: [],
      locations: [],
    };
    for (const subject of filtered) {
      if (groups[subject.category].length >= 8) continue;
      groups[subject.category].push(subject);
    }
    return groups;
  }, [visibleSubjects, query]);

  const selected = subjects.find((s) => s.page.id === pageId) ?? null;
  const hasAnyMatch = CATEGORY_ORDER.some((cat) => groupedMatches[cat].length > 0);

  async function handleCreate() {
    if (!selected || !fromEraId || !direction.trim()) {
      setError('Choose who or what is changing and enter a trajectory direction.');
      return;
    }
    if (existingKeys.has(subjectKey(selected.page.id, fromEraId))) {
      setError('This entity already has a trajectory starting in that era.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const planning = {
        eraId: fromEraId,
        byEraId: byEraId || null,
        direction: direction.trim(),
        outcome: outcome.trim() || null,
      };

      if (selected.category === 'organizations') {
        const current = parseOrganizationMetadata(selected.page.metadata);
        const nextTrajectory = createFactionEraTrajectory(planning);
        const eraTrajectories = [
          ...current.eraTrajectories.filter((row) => row.eraId !== fromEraId),
          nextTrajectory,
        ];
        const result = await updateOrganizationMetadata(campaignHandle, selected.page.id, {
          eraTrajectories,
        });
        const saved = parseOrganizationMetadata(result.metadata);
        onCreated(selected.page.id, saved.eraTrajectories, 'organizations');
      } else if (selected.category === 'characters') {
        const current = parseCharacterMetadata(selected.page.metadata);
        const nextTrajectory = createEraTrajectory(planning);
        const eraTrajectories = [
          ...current.eraTrajectories.filter((row) => row.eraId !== fromEraId),
          nextTrajectory,
        ];
        const result = await updateCharacterMetadata(campaignHandle, selected.page.id, {
          eraTrajectories,
        });
        const saved = parseCharacterMetadata(result.metadata);
        onCreated(selected.page.id, saved.eraTrajectories, 'characters');
      } else {
        const current = parseLocationMetadata(selected.page.metadata);
        const nextTrajectory = createEraTrajectory(planning);
        const eraTrajectories = [
          ...current.eraTrajectories.filter((row) => row.eraId !== fromEraId),
          nextTrajectory,
        ];
        const result = await updateLocationMetadata(campaignHandle, selected.page.id, {
          eraTrajectories,
        });
        const saved = parseLocationMetadata(result.metadata);
        onCreated(selected.page.id, saved.eraTrajectories, 'locations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trajectory');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 py-16"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-trajectory-title"
    >
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-border bg-background p-4 shadow-lg">
        <h3 id="create-trajectory-title" className="text-base font-semibold text-foreground">
          Add trajectory
        </h3>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Who or what is changing?</span>
          <input
            type="search"
            value={selected ? selected.page.title : query}
            onChange={(e) => {
              setPageId('');
              setQuery(e.target.value);
            }}
            placeholder="Search characters, locations, organizations…"
            className={fieldClass}
            autoFocus
          />
          {!selected ? (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-surface/40 p-1">
              {!hasAnyMatch ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No matching entities.</p>
              ) : (
                CATEGORY_ORDER.map((category) => {
                  const list = groupedMatches[category];
                  if (list.length === 0) return null;
                  return (
                    <div key={category}>
                      <p className="px-3 pt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {CATEGORY_LABEL[category]}
                      </p>
                      <ul>
                        {list.map((subject) => (
                          <li key={subject.page.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setPageId(subject.page.id);
                                setQuery(subject.page.title);
                              }}
                            >
                              <span>{subject.page.title}</span>
                              {subject.statusLabel ? (
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {subject.statusLabel === 'ALIVE'
                                    ? 'Active'
                                    : subject.statusLabel.charAt(0) +
                                      subject.statusLabel.slice(1).toLowerCase()}
                                </span>
                              ) : (
                                <span className="text-[0.65rem] text-muted-foreground">
                                  {CATEGORY_LABEL[category].slice(0, -1)}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setPageId('');
                setQuery('');
              }}
            >
              Change entity
            </button>
          )}
        </label>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-border"
          />
          Include inactive/deceased
        </label>

        <div className="border-t border-border/50 pt-3" />

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Trajectory</span>
          <input
            type="text"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="Declining"
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">From</span>
          <select
            value={fromEraId}
            onChange={(e) => setFromEraId(e.target.value)}
            className={fieldClass}
          >
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
                {era.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Target / Outcome</span>
          <input
            type="text"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Severe famine"
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">By</span>
          <select
            value={byEraId}
            onChange={(e) => setByEraId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Open-ended</option>
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add trajectory'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { subjectKey as trajectoryOrgEraKey };
