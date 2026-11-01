import { Circle, MousePointer2, MapPin, Pencil, Pentagon, Route, Type } from 'lucide-react';
import type { MapEditorTool } from '@/types/maps';
interface MapEditorToolbarProps {
  canEdit?: boolean;
  editMode: boolean; ghostMode: boolean; editorTool?: MapEditorTool;
  onEditorToolChange?: (tool: MapEditorTool) => void;
  onToggleEditMode: () => void; onToggleGhostMode: () => void;
  onAddLayer?: () => void; onAddPoliticalBordersLayer?: () => void;
  onCancelDraw?: () => void; onFinishDraw?: () => void;
  canFinishDraw?: boolean; isPersistingDraw?: boolean; className?: string;
}
const tools = [
  ['select', 'Select / Pan', MousePointer2], ['placePin', 'Pin', MapPin],
  ['placeLabel', 'Text', Type], ['drawRegion', 'Area', Pentagon],
  ['drawCircle', 'Circle', Circle], ['drawPath', 'Path', Route],
] as const;
export function MapEditorToolbar(props: MapEditorToolbarProps) {
  if (props.canEdit === false) return null;
  const drawing = ['drawRegion', 'drawPath', 'drawCircle'].includes(props.editorTool ?? 'select');
  return <div className={`map-edit-dock map-float ${props.className ?? ''}`} role="toolbar" aria-label="Map editing tools">
    {!props.editMode ? <button type="button" onClick={props.onToggleEditMode}><Pencil size={18} />Edit map</button> : <>
      {props.onEditorToolChange ? <div className="map-tool-row" role="group" aria-label="Edit tools">
        {tools.map(([tool, label, Icon]) => <button type="button" key={tool} title={label} aria-label={label} aria-pressed={props.editorTool === tool} disabled={props.isPersistingDraw} onClick={() => props.onEditorToolChange?.(tool)}><Icon size={18} /><span>{label === 'Select / Pan' ? 'Select' : label}</span></button>)}
      </div> : null}
      {drawing ? <div className="flex items-center justify-center gap-2 text-xs"><button type="button" disabled={props.isPersistingDraw} onClick={props.onCancelDraw}>Cancel</button>{props.editorTool !== 'drawCircle' || props.canFinishDraw ? <button type="button" disabled={!props.canFinishDraw || props.isPersistingDraw} onClick={props.onFinishDraw}>{props.isPersistingDraw ? 'Saving…' : 'Finish'}</button> : <span>{props.isPersistingDraw ? 'Saving…' : 'Choose center, then radius'}</span>}</div> : null}
      <div className="flex items-center justify-center gap-2">
        <details><summary className="cursor-pointer px-2 text-xs">Options</summary><div className="flex flex-wrap gap-1">
          <button type="button" aria-pressed={props.ghostMode} onClick={props.onToggleGhostMode}>Ghost mode</button>
          {props.onAddLayer ? <button type="button" onClick={props.onAddLayer}>Add layer</button> : null}
          {props.onAddPoliticalBordersLayer ? <button type="button" onClick={props.onAddPoliticalBordersLayer}>Political borders</button> : null}
        </div></details>
        <button type="button" disabled={props.isPersistingDraw} onClick={props.onToggleEditMode}>Done editing</button>
      </div>
    </>}
  </div>;
}
