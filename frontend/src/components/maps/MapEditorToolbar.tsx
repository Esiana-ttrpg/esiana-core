import { Ghost, Layers, MapPin, Pencil, Pentagon, Route, Type } from 'lucide-react';
import type { MapEditorTool } from '@/types/maps';

interface MapEditorToolbarProps {
  editMode: boolean;
  ghostMode: boolean;
  editorTool?: MapEditorTool;
  onEditorToolChange?: (tool: MapEditorTool) => void;
  onToggleEditMode: () => void;
  onToggleGhostMode: () => void;
  onAddLayer?: () => void;
  onAddPoliticalBordersLayer?: () => void;
  onCancelDraw?: () => void;
  onFinishDraw?: () => void;
  canFinishDraw?: boolean;
  isPersistingDraw?: boolean;
  className?: string;
}

const TOOL_BUTTON =
  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs';

export function MapEditorToolbar({
  editMode,
  ghostMode,
  editorTool = 'select',
  onEditorToolChange,
  onToggleEditMode,
  onToggleGhostMode,
  onAddLayer,
  onAddPoliticalBordersLayer,
  onCancelDraw,
  onFinishDraw,
  canFinishDraw = false,
  isPersistingDraw = false,
  className = '',
}: MapEditorToolbarProps) {
  const setTool = (tool: MapEditorTool) => onEditorToolChange?.(tool);

  return (
    <div
      className={`pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-surface/95 px-2 py-1.5 text-sm shadow-md backdrop-blur ${className}`}
      role="toolbar"
      aria-label="Map editing tools"
    >
      {!editMode ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-medium hover:bg-muted/10"
          onClick={onToggleEditMode}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit map
        </button>
      ) : (
        <>
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground"
            onClick={onToggleEditMode}
          >
            Done editing
          </button>
          <span className="hidden h-5 w-px bg-border sm:inline" aria-hidden />
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Edit tools">
            <button
              type="button"
              className={`${TOOL_BUTTON} ${editorTool === 'select' ? 'border-accent bg-accent/15' : 'border-border hover:bg-muted/10'}`}
              onClick={() => setTool('select')}
              title="Select and move"
            >
              <MapPin className="size-3" aria-hidden />
              Select
            </button>
            <button
              type="button"
              className={`${TOOL_BUTTON} ${editorTool === 'drawRegion' ? 'border-accent bg-accent/15' : 'border-border hover:bg-muted/10'}`}
              onClick={() => setTool('drawRegion')}
              title="Draw polygon region"
            >
              <Pentagon className="size-3" aria-hidden />
              Region
            </button>
            <button
              type="button"
              className={`${TOOL_BUTTON} ${editorTool === 'drawPath' ? 'border-accent bg-accent/15' : 'border-border hover:bg-muted/10'}`}
              onClick={() => setTool('drawPath')}
              title="Draw path spine (manual override)"
            >
              <Route className="size-3" aria-hidden />
              Path
            </button>
            <button
              type="button"
              className={`${TOOL_BUTTON} ${editorTool === 'placeLabel' ? 'border-accent bg-accent/15' : 'border-border hover:bg-muted/10'}`}
              onClick={() => setTool('placeLabel')}
              title="Place text label"
            >
              <Type className="size-3" aria-hidden />
              Label
            </button>
          </div>
          {editorTool === 'drawRegion' || editorTool === 'drawPath' ? (
            <>
              <button
                type="button"
                className={`${TOOL_BUTTON} border-border hover:bg-muted/10`}
                onClick={onCancelDraw}
                disabled={isPersistingDraw}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${TOOL_BUTTON} border-amber-500/50 bg-amber-500/10`}
                onClick={onFinishDraw}
                disabled={!canFinishDraw || isPersistingDraw}
              >
                {isPersistingDraw ? 'Saving…' : 'Finish'}
              </button>
              <span className="text-[10px] text-muted">Space+drag to pan · Esc cancel</span>
            </>
          ) : null}
          <span className="hidden h-5 w-px bg-border sm:inline" aria-hidden />
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
              ghostMode
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                : 'border-border hover:bg-muted/10'
            }`}
            onClick={onToggleGhostMode}
            title="Show hidden or future objects for editing (players never see this)"
          >
            <Ghost className="size-3.5" aria-hidden />
            Ghost mode
          </button>
          {onAddPoliticalBordersLayer ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs hover:bg-amber-500/20"
              onClick={onAddPoliticalBordersLayer}
              title="Create a Political borders layer for temporal sovereignty overlays"
            >
              <Pentagon className="size-3.5" aria-hidden />
              Political borders
            </button>
          ) : null}
          {onAddLayer ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs hover:bg-muted/10"
              onClick={onAddLayer}
            >
              <Layers className="size-3.5" aria-hidden />
              Add layer
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
