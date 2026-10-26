import type { MapEditorTool, MapPinDto, MapPresentationPresetDto, MapSceneObjectDto } from '@/types/maps';

export function handleMapPinClick(options: {
  pin: MapPinDto;
  editMode: boolean;
  onEditPin?: (pin: MapPinDto) => void;
  onSelect?: () => void;
  onNavigateMap?: (id: string) => void;
  onNavigateWiki?: (id: string) => void;
}) {
  const { pin, editMode, onEditPin, onSelect, onNavigateMap, onNavigateWiki } = options;
  if (editMode && onEditPin) onEditPin(pin);
  else if (onSelect) onSelect();
  else if (pin.targetAssetId && onNavigateMap) onNavigateMap(pin.targetAssetId);
  else if (pin.targetPageId && onNavigateWiki) onNavigateWiki(pin.targetPageId);
}

export function canDiscardMapProperties(busy: boolean, dirty: boolean, confirm: () => boolean) {
  return !busy && (!dirty || confirm());
}

export function nextMapEditMode(editMode: boolean, canEdit: boolean, discard: () => boolean) {
  if (!canEdit) return false;
  return editMode && !discard() ? editMode : !editMode;
}

export function mapEscapeAction(state: {
  fullscreen: boolean;
  editMode: boolean;
  editorTool: MapEditorTool;
  dialogOpen: boolean;
  propertiesOpen: boolean;
  persisting: boolean;
}) {
  if (state.dialogOpen || state.propertiesOpen) return 'delegate';
  if (state.persisting) return 'busy';
  if (state.editMode && state.editorTool !== 'select') return 'cancelDrawing';
  return state.fullscreen ? 'exitFullscreen' : 'none';
}

/** Null lets the browser advance focus normally; -1 focuses the empty container. */
export function mapFocusTargetIndex(index: number, count: number, reverse: boolean): number | null {
  if (!count) return -1;
  if (reverse ? index <= 0 : index < 0 || index === count - 1) return reverse ? count - 1 : 0;
  return null;
}

export function applyMapPresentationPreset(
  preset: MapPresentationPresetDto,
  onEpochChange: (epoch: string) => void,
  onLayerChange: (ids: Set<string>) => void,
) {
  onEpochChange(preset.anchorEpochMinute);
  if (preset.enabledLayerIds.length > 0) onLayerChange(new Set(preset.enabledLayerIds));
}

export function mapLayerSelectionForIdentity(
  selection: { identity: string; ids: Set<string> | null }, identity: string,
) {
  return selection.identity === identity ? selection.ids : null;
}

/** Presentation filters only: objects must already come from an authorized scene response. */
export function filterMapSceneObjects(objects: MapSceneObjectDto[], options: {
  resolvedContext: string | null;
  currentContext: string;
  enabledLayerIds: Set<string>;
  canEdit: boolean;
  hiddenGroupIds: Set<string>;
  hiddenAnnotationKinds: Set<string>;
  hiddenTypes: ReadonlySet<string>;
}) {
  if (options.resolvedContext !== options.currentContext) return [];
  return objects.filter(object =>
    (!object.layerId || options.enabledLayerIds.has(object.layerId)) &&
    (!options.canEdit || !object.groupId || !options.hiddenGroupIds.has(object.groupId)) &&
    !options.hiddenAnnotationKinds.has(object.kind) &&
    (object.kind !== 'pin' || !options.hiddenTypes.has(object.pinType ?? '')));
}
