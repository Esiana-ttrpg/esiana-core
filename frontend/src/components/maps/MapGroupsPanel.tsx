import { FolderOpen } from 'lucide-react';
import type { MapObjectGroupDto } from '@/types/maps';
import { createMapObjectGroup } from '@/lib/mapScene';

interface MapGroupsPanelProps {
  campaignHandle: string;
  assetId: string;
  groups: MapObjectGroupDto[];
  hiddenGroupIds: Set<string>;
  onToggleGroupFilter: (groupId: string) => void;
  onGroupsChanged: () => void | Promise<void>;
  className?: string;
}

/**
 * Editor-only organization — does not affect party presence (client filter only).
 */
export function MapGroupsPanel({
  campaignHandle,
  assetId,
  groups,
  hiddenGroupIds,
  onToggleGroupFilter,
  onGroupsChanged,
  className = '',
}: MapGroupsPanelProps) {
  const addGroup = async () => {
    const name = window.prompt('Group name (editor organize only)');
    if (!name?.trim()) return;
    await createMapObjectGroup(campaignHandle, assetId, { name: name.trim() });
    await onGroupsChanged();
  };

  return (
    <div
      className={`rounded-lg border border-dashed border-border/80 bg-surface/60 px-3 py-2 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
          <FolderOpen className="size-3.5" aria-hidden />
          Organize (editor)
        </span>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted/10"
          onClick={() => void addGroup()}
        >
          New group
        </button>
      </div>
      {groups.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {groups.map((group) => {
            const hidden = hiddenGroupIds.has(group.id);
            return (
              <button
                key={group.id}
                type="button"
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  hidden
                    ? 'border-border/50 bg-muted/5 text-muted line-through'
                    : 'border-border bg-background hover:bg-muted/10'
                }`}
                style={
                  group.color && !hidden
                    ? { borderColor: group.color, color: group.color }
                    : undefined
                }
                onClick={() => onToggleGroupFilter(group.id)}
                title="Hide or show on your editor view only (players unaffected)"
              >
                {group.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-muted">
          Groups help you filter the canvas while editing. They do not hide content from players.
        </p>
      )}
    </div>
  );
}
