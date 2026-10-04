import { useMemo, useState } from 'react';
import {
  createFactionEraTrajectory,
  type CampaignEra,
  type FactionEraTrajectory,
} from '@shared/factionMomentumMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { updateOrganizationMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60';

interface CreateTrajectoryDialogProps {
  campaignHandle: string;
  eras: CampaignEra[];
  organizationPages: WikiTreeNode[];
  existingKeys: Set<string>;
  onCreated: (pageId: string, trajectories: FactionEraTrajectory[]) => void;
  onCancel: () => void;
}

function orgKey(pageId: string, eraId: string): string {
  return `${pageId}::${eraId}`;
}

export function CreateTrajectoryDialog({
  campaignHandle,
  eras,
  organizationPages,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = organizationPages;
    if (!q) return list.slice(0, 12);
    return list.filter((page) => page.title.toLowerCase().includes(q)).slice(0, 12);
  }, [organizationPages, query]);

  const selected = organizationPages.find((page) => page.id === pageId) ?? null;

  async function handleCreate() {
    if (!selected || !fromEraId || !direction.trim()) {
      setError('Choose an organization and enter a trajectory direction.');
      return;
    }
    if (existingKeys.has(orgKey(selected.id, fromEraId))) {
      setError('This organization already has a trajectory starting in that era.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const current = parseOrganizationMetadata(selected.metadata);
      const nextTrajectory = createFactionEraTrajectory({
        eraId: fromEraId,
        byEraId: byEraId || null,
        direction: direction.trim(),
        outcome: outcome.trim() || null,
      });
      const eraTrajectories = [
        ...current.eraTrajectories.filter((row) => row.eraId !== fromEraId),
        nextTrajectory,
      ];
      const result = await updateOrganizationMetadata(campaignHandle, selected.id, {
        eraTrajectories,
      });
      const saved = parseOrganizationMetadata(result.metadata);
      onCreated(selected.id, saved.eraTrajectories);
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
          New trajectory
        </h3>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Entity</span>
          <input
            type="search"
            value={selected ? selected.title : query}
            onChange={(e) => {
              setPageId('');
              setQuery(e.target.value);
            }}
            placeholder="Search organizations…"
            className={fieldClass}
            autoFocus
          />
          {!selected ? (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-surface/40">
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">No organizations found.</li>
              ) : (
                matches.map((page) => (
                  <li key={page.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setPageId(page.id);
                        setQuery(page.title);
                      }}
                    >
                      {page.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setPageId('');
                setQuery('');
              }}
            >
              Change organization
            </button>
          )}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Trajectory</span>
          <input
            type="text"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            placeholder="Militarizing"
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
            placeholder="Starts a war"
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
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { orgKey as trajectoryOrgEraKey };
