import { MAP_PIN_TYPE_VALUES, type MapLayerDto, type MapPinType } from '@/types/maps';
import { inferMapLayerKind, layerKindBadgeLabel } from '@shared/mapOverlayTypes';
import { Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';

interface MapVisibilityBarProps {
  layers: MapLayerDto[];
  enabledLayerIds: Set<string>;
  hiddenPinTypes: Set<MapPinType>;
  onToggleLayer: (layerId: string) => void;
  onTogglePinType: (pinType: MapPinType) => void;
  onEnableAllLayers?: () => void;
  onDisableAllLayers?: () => void;
  editMode?: boolean;
  onUpdateLayer?: (layerId: string, updates: { name?: string; sortOrder?: number }) => Promise<void>;
  onDeleteLayer?: (layerId: string) => Promise<void>;
  onAddPoliticalBordersLayer?: () => Promise<void>;
  onAddMigrationFlowsLayer?: () => Promise<void>;
  onAddTradeRoutesLayer?: () => Promise<void>;
  onAddTravelRoutesLayer?: () => Promise<void>;
  onAddWeatherClimateLayer?: () => Promise<void>;
  onAddVisibilityZonesLayer?: () => Promise<void>;
  knowledgeFogEnabled?: boolean;
  onToggleKnowledgeFog?: () => void;
  showKnowledgeFogToggle?: boolean;
}

export function MapVisibilityBar({
  layers,
  enabledLayerIds,
  hiddenPinTypes,
  onToggleLayer,
  onTogglePinType,
  onEnableAllLayers,
  onDisableAllLayers,
  editMode = false,
  onUpdateLayer,
  onDeleteLayer,
  onAddPoliticalBordersLayer,
  onAddMigrationFlowsLayer,
  onAddTradeRoutesLayer,
  onAddTravelRoutesLayer,
  onAddWeatherClimateLayer,
  onAddVisibilityZonesLayer,
  knowledgeFogEnabled = true,
  onToggleKnowledgeFog,
  showKnowledgeFogToggle = false,
}: MapVisibilityBarProps) {
  const hasLayers = layers.length > 0;
  const hasPins = MAP_PIN_TYPE_VALUES.length > 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const startEdit = (layer: MapLayerDto) => {
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const saveEdit = async (layerId: string) => {
    if (!editingName.trim()) return;
    try {
      await onUpdateLayer?.(layerId, { name: editingName.trim() });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update layer:', err);
    }
  };

  const confirmDelete = async (layerId: string) => {
    setDeleting(layerId);
  };

  const executeDelete = async (layerId: string) => {
    try {
      await onDeleteLayer?.(layerId);
      setDeleting(null);
    } catch (err) {
      console.error('Failed to delete layer:', err);
    }
  };

  const moveLayer = async (layer: MapLayerDto, direction: -1 | 1) => {
    const index = layers.findIndex((entry) => entry.id === layer.id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= layers.length) return;
    const other = layers[nextIndex];
    try {
      await onUpdateLayer?.(layer.id, { sortOrder: other.sortOrder });
      await onUpdateLayer?.(other.id, { sortOrder: layer.sortOrder });
    } catch (err) {
      console.error('Failed to reorder layers:', err);
    }
  };

  if (!hasLayers && !hasPins) return null;

  return (
    <section
      className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
      aria-label="Map display filters"
    >
      {hasLayers ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0 font-medium text-muted">Layers</span>
          {editMode ? (
            <>
              {onAddPoliticalBordersLayer ? (
                <button
                  type="button"
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-100 hover:bg-amber-500/20"
                  onClick={() => void onAddPoliticalBordersLayer()}
                >
                  + Political borders
                </button>
              ) : null}
              {onAddMigrationFlowsLayer ? (
                <button
                  type="button"
                  className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-100 hover:bg-rose-500/20"
                  onClick={() => void onAddMigrationFlowsLayer()}
                >
                  + Migration flows
                </button>
              ) : null}
              {onAddTradeRoutesLayer ? (
                <button
                  type="button"
                  className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-100 hover:bg-emerald-500/20"
                  onClick={() => void onAddTradeRoutesLayer()}
                >
                  + Trade routes
                </button>
              ) : null}
              {onAddTravelRoutesLayer ? (
                <button
                  type="button"
                  className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-100 hover:bg-indigo-500/20"
                  onClick={() => void onAddTravelRoutesLayer()}
                >
                  + Travel routes
                </button>
              ) : null}
              {onAddWeatherClimateLayer ? (
                <button
                  type="button"
                  className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-100 hover:bg-sky-500/20"
                  onClick={() => void onAddWeatherClimateLayer()}
                >
                  + Weather & climate
                </button>
              ) : null}
              {onAddVisibilityZonesLayer ? (
                <button
                  type="button"
                  className="rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-500/20"
                  onClick={() => void onAddVisibilityZonesLayer()}
                >
                  + Visibility zones
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted/10"
                onClick={onEnableAllLayers}
              >
                Show all
              </button>
              <button
                type="button"
                className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted/10"
                onClick={onDisableAllLayers}
              >
                Hide all
              </button>
            </>
          ) : null}
          {layers.map((layer) => {
            const on = enabledLayerIds.has(layer.id);
            const isEditing = editingId === layer.id;
            const isDeleting = deleting === layer.id;

            if (isEditing) {
              return (
                <div key={layer.id} className="flex gap-1 items-center">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs w-24"
                    placeholder="Layer name"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void saveEdit(layer.id)}
                    className="rounded-full border border-border bg-accent text-accent-foreground px-2 py-0.5 text-xs hover:bg-accent/90"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted/10"
                  >
                    Cancel
                  </button>
                </div>
              );
            }

            if (isDeleting) {
              return (
                <div key={layer.id} className="flex gap-1 items-center">
                  <span className="text-xs text-destructive px-2">Delete {layer.name}?</span>
                  <button
                    type="button"
                    onClick={() => void executeDelete(layer.id)}
                    className="rounded-full border border-destructive/50 bg-destructive/10 text-destructive px-2 py-0.5 text-xs hover:bg-destructive/20"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(null)}
                    className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted/10"
                  >
                    Cancel
                  </button>
                </div>
              );
            }

            const kindBadge = layerKindBadgeLabel(
              inferMapLayerKind({ name: layer.name }),
            );

            return (
              <div
                key={layer.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors group ${
                  on
                    ? 'border-border bg-muted/15 text-foreground'
                    : 'border-transparent bg-transparent text-muted line-through opacity-60'
                }`}
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: layer.color ?? '#6366f1' }}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => onToggleLayer(layer.id)}
                  aria-pressed={on}
                  className="hover:underline"
                >
                  {layer.name}
                </button>
                {kindBadge ? (
                  <span className="rounded bg-amber-500/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-100">
                    {kindBadge}
                  </span>
                ) : null}
                {editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void moveLayer(layer, -1)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded px-1 text-[10px] hover:bg-muted/20"
                      title="Move layer up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveLayer(layer, 1)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded px-1 text-[10px] hover:bg-muted/20"
                      title="Move layer down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(layer)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted/20 rounded"
                      title="Rename layer"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(layer.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/20 text-destructive rounded"
                      title="Delete layer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {hasPins ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0 font-medium text-muted">Pins</span>
          {MAP_PIN_TYPE_VALUES.map((pinType) => {
            const visible = !hiddenPinTypes.has(pinType);
            return (
              <button
                key={pinType}
                type="button"
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  visible
                    ? 'border-border bg-muted/15 text-foreground'
                    : 'border-transparent text-muted line-through opacity-60'
                }`}
                onClick={() => onTogglePinType(pinType)}
                aria-pressed={visible}
              >
                {pinType}
              </button>
            );
          })}
        </div>
      ) : null}

      {showKnowledgeFogToggle && onToggleKnowledgeFog ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0 font-medium text-muted">Knowledge fog</span>
          <button
            type="button"
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              knowledgeFogEnabled
                ? 'border-border bg-muted/15 text-foreground'
                : 'border-transparent text-muted line-through opacity-60'
            }`}
            onClick={onToggleKnowledgeFog}
            aria-pressed={knowledgeFogEnabled}
          >
            {knowledgeFogEnabled ? 'On' : 'Off'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
