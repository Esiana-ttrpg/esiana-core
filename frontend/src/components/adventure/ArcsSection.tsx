import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ArcHierarchyProjection } from '@/lib/arcMetadata';
import { ArcHierarchyTree } from '@/components/adventure/ArcHierarchyTree';
import { CreateArcModal } from '@/components/arc/CreateArcModal';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { useWiki } from '@/contexts/WikiContext';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

interface ArcsSectionProps {
  campaignHandle: string;
  categoryPageId: string;
  arcHierarchy?: ArcHierarchyProjection | null;
  actLanes?: Array<{ id: string; label: string; actIndex?: number }>;
  embedded?: boolean;
  onHeaderActionsChange?: (actions: ReactNode | null) => void;
}

export function ArcsSection({
  campaignHandle,
  categoryPageId,
  arcHierarchy,
  actLanes = [],
  embedded = false,
  onHeaderActionsChange,
}: ArcsSectionProps) {
  const navigate = useNavigate();
  const { flatPages, refresh } = useWiki();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const openCreate = useCallback(() => setIsCreateOpen(true), []);

  const headerToolbar = useMemo(
    () => (
      <CategoryIndexToolbar
        createLabel="New campaign arc"
        onCreate={openCreate}
      />
    ),
    [openCreate],
  );

  useEffect(() => {
    if (!embedded || !onHeaderActionsChange) return;
    onHeaderActionsChange(headerToolbar);
    return () => onHeaderActionsChange(null);
  }, [embedded, onHeaderActionsChange, headerToolbar]);

  async function handlePageCreated(page: WikiTreeNode) {
    setIsCreateOpen(false);
    await refresh();
    navigate(campaignCategoryChildPath(campaignHandle, page.id, undefined, flatPages));
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold">Arcs</h2>
          <p className="text-sm text-muted-foreground">
            Campaign arcs → questlines → quests → objectives, with scene associations
          </p>
        </div>
      ) : null}
      {actLanes.length > 0 ? (
        <div className="rounded border border-dashed border-border p-3">
          <p className="mb-2 ${META_SECTION_LABEL_CLASS}-foreground">
            Storyboard act lanes
          </p>
          <ul className="flex flex-wrap gap-2">
            {actLanes.map((lane) => (
              <li
                key={lane.id}
                className="rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {lane.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {arcHierarchy ? (
        <ArcHierarchyTree campaignHandle={campaignHandle} projection={arcHierarchy} />
      ) : (
        <p className="text-sm text-muted-foreground">Loading arc hierarchy…</p>
      )}

      <CreateArcModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePageCreated}
        campaignHandle={campaignHandle}
        parentId={categoryPageId}
      />
    </div>
  );
}
