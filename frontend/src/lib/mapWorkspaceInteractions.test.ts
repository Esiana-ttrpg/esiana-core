import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { MapPinDto, MapSceneObjectDto } from '@/types/maps';
import {
  applyMapPresentationPreset, canDiscardMapProperties, filterMapSceneObjects,
  handleMapPinClick, mapEscapeAction, mapFocusTargetIndex, mapLayerSelectionForIdentity,
  nextMapEditMode,
} from './mapWorkspaceInteractions';

const pin: MapPinDto = {
  id: 'pin', x: 10, y: 20, label: 'Aster', pinType: 'Location',
  targetPageId: 'page', targetAssetId: null, targetPageTitle: 'Aster', targetMapTitle: null,
};

test('pin selection precedes navigation; editing and legacy navigation remain available', () => {
  for (const targetPin of [pin, { ...pin, targetAssetId: 'map', targetPageId: null }]) {
    const actions: string[] = [];
    const options = {
      pin: targetPin, editMode: false,
      onSelect: () => actions.push('select'),
      onEditPin: (value: MapPinDto) => actions.push(`edit:${value.id}`),
      onNavigateMap: (id: string) => actions.push(`map:${id}`),
      onNavigateWiki: (id: string) => actions.push(`page:${id}`),
    };
    handleMapPinClick(options);
    assert.deepEqual(actions.splice(0), ['select']);
    handleMapPinClick({ ...options, editMode: true });
    assert.deepEqual(actions.splice(0), ['edit:pin']);
    handleMapPinClick({ ...options, onSelect: undefined });
    assert.deepEqual(actions.splice(0), [targetPin.targetAssetId ? 'map:map' : 'page:page']);
  }
});

test('dirty-property confirmation controls leaving edit mode; permission loss cannot be vetoed', () => {
  let prompts = 0;
  let accepted = false;
  const discard = () => canDiscardMapProperties(false, true, () => { prompts++; return accepted; });
  assert.equal(nextMapEditMode(false, true, discard), true);
  assert.equal(prompts, 0, 'entering edit mode does not discard anything');
  assert.equal(nextMapEditMode(true, true, discard), true);
  assert.equal(prompts, 1);
  accepted = true;
  assert.equal(nextMapEditMode(true, true, discard), false);
  assert.equal(prompts, 2);
  assert.equal(nextMapEditMode(true, false, discard), false);
  assert.equal(nextMapEditMode(false, false, discard), false);
  assert.equal(prompts, 2, 'permission loss never prompts to keep editing');
});

test('clean properties close without confirmation and saving properties cannot be discarded', () => {
  const unexpectedPrompt = () => { throw new Error('Unexpected confirmation'); };
  assert.equal(canDiscardMapProperties(false, false, unexpectedPrompt), true);
  assert.equal(canDiscardMapProperties(true, true, unexpectedPrompt), false);
  assert.equal(canDiscardMapProperties(true, false, unexpectedPrompt), false);
});

test('Escape delegates to dialogs and properties, then drawing, then fullscreen', () => {
  const state = { fullscreen: true, editMode: true, editorTool: 'drawCircle' as const, dialogOpen: false, propertiesOpen: false, persisting: false };
  assert.equal(mapEscapeAction({ ...state, dialogOpen: true }), 'delegate');
  assert.equal(mapEscapeAction({ ...state, propertiesOpen: true }), 'delegate');
  assert.equal(mapEscapeAction({ ...state, persisting: true }), 'busy');
  for (const editorTool of ['drawCircle', 'drawRegion', 'drawPath', 'placePin', 'placeLabel'] as const) {
    assert.equal(mapEscapeAction({ ...state, editorTool }), 'cancelDrawing');
    assert.equal(mapEscapeAction({ ...state, editorTool, fullscreen: false }), 'cancelDrawing');
  }
  assert.equal(mapEscapeAction({ ...state, editorTool: 'select' }), 'exitFullscreen');
  assert.equal(mapEscapeAction({ ...state, editorTool: 'select', fullscreen: false }), 'none');
  assert.equal(mapEscapeAction({ ...state, editMode: false }), 'exitFullscreen');
});

test('focus wraps at both boundaries, including focus outside the workspace and no controls', () => {
  assert.equal(mapFocusTargetIndex(2, 3, false), 0);
  assert.equal(mapFocusTargetIndex(0, 3, true), 2);
  assert.equal(mapFocusTargetIndex(-1, 3, false), 0);
  assert.equal(mapFocusTargetIndex(-1, 3, true), 2);
  assert.equal(mapFocusTargetIndex(1, 3, false), null);
  assert.equal(mapFocusTargetIndex(1, 3, true), null);
  assert.equal(mapFocusTargetIndex(-1, 0, false), -1);
});

test('empty presets change epoch without changing layers; populated presets replace layers', () => {
  let epoch = '0';
  let ids = new Set(['places']);
  const original = ids;
  const preset = { id: 'past', label: 'Earlier', anchorEpochMinute: '100', enabledLayerIds: [] as string[], sortOrder: 0 };
  applyMapPresentationPreset(preset, value => { epoch = value; }, value => { ids = value; });
  assert.equal(epoch, '100');
  assert.equal(ids, original);
  applyMapPresentationPreset({ ...preset, enabledLayerIds: ['routes'] }, value => { epoch = value; }, value => { ids = value; });
  assert.deepEqual([...ids], ['routes']);
});

test('map and campaign changes discard old layer IDs; explicit empty selection stays explicit', () => {
  const selection = { identity: 'campaign:first', ids: new Set(['old']) };
  assert.equal(mapLayerSelectionForIdentity(selection, 'campaign:first'), selection.ids);
  assert.equal(mapLayerSelectionForIdentity(selection, 'campaign:second'), null);
  assert.equal(mapLayerSelectionForIdentity(selection, 'other:first'), null);
  const empty = { ...selection, ids: new Set<string>() };
  assert.equal(mapLayerSelectionForIdentity(empty, empty.identity), empty.ids);
});

const object = (id: string, overrides: Partial<MapSceneObjectDto> = {}): MapSceneObjectDto => ({
  id, kind: 'region', layerId: null, groupId: null, label: id, pinType: null,
  visibility: 'PUBLIC', revelation: 'REVEALED', geometry: null, style: null,
  sortOrder: 0, mapPinId: null, x: 0, y: 0, targetPageId: null, targetAssetId: null,
  targetPageTitle: null, targetMapTitle: null, visibleFromEpochMinute: null,
  visibleUntilEpochMinute: null, ...overrides,
});
const filters = () => ({
  resolvedContext: 'campaign:map:editor:present', currentContext: 'campaign:map:editor:present',
  enabledLayerIds: new Set(['places']), canEdit: true, hiddenGroupIds: new Set<string>(),
  hiddenAnnotationKinds: new Set<string>(), hiddenTypes: new Set<string>(),
});

test('presentation filters compose across layers, groups, annotation kinds and pin types', () => {
  const objects = [object('unlayered'), object('place', { layerId: 'places' }),
    object('route', { layerId: 'routes', kind: 'path' }), object('text', { kind: 'label' }),
    object('grouped', { groupId: 'private-organization' }), object('pin', { kind: 'pin', pinType: 'Quest' })];
  const options = { ...filters(), hiddenGroupIds: new Set(['private-organization']), hiddenAnnotationKinds: new Set(['label']), hiddenTypes: new Set(['Quest']) };
  assert.deepEqual(filterMapSceneObjects(objects, options).map(o => o.id), ['unlayered', 'place']);
  assert.deepEqual(filterMapSceneObjects(objects, { ...options, enabledLayerIds: new Set() }).map(o => o.id), ['unlayered']);
  assert.deepEqual(filterMapSceneObjects(objects, { ...options, canEdit: false }).map(o => o.id), ['unlayered', 'place', 'grouped']);
  assert.equal(objects.length, 6, 'presentation filters do not mutate canonical objects');
});

test('stale scene contexts cannot expose objects after permission, epoch, or map changes', () => {
  const objects = [object('known')];
  for (const currentContext of ['campaign:map:reader:present', 'campaign:map:editor:past', 'campaign:other:editor:present']) {
    assert.deepEqual(filterMapSceneObjects(objects, { ...filters(), currentContext }), []);
  }
  assert.deepEqual(filterMapSceneObjects(objects, { ...filters(), resolvedContext: null }), []);
  assert.deepEqual(filterMapSceneObjects([], filters()), [], 'filters cannot invent objects excluded by the server');
});
