import { useCallback, useEffect, useRef, useState } from 'react';
import { displayToNormalizedPoint, polygonGeometry } from '@shared/mapPresence';
import {
  defaultSemanticRoleForLayer,
  inferMapLayerKind,
  MapLayerKind,
  mergeObjectStyleWithOverlay,
  type MapLayerKindValue,
} from '@shared/mapOverlayTypes';
import { createMapSceneObject } from '@/lib/mapScene';
import { circleGeometry } from '@shared/mapCircle';

export type RegionDrawPhase = 'idle' | 'drawing' | 'persisting';

export interface UseMapRegionDrawOptions {
  circle?: boolean;
  active: boolean;
  campaignHandle: string;
  assetId: string;
  width: number;
  height: number;
  defaultLayerId: string | null;
  defaultLayerName?: string | null;
  /** When true, region is a knowledge fog mask zone (requires targetPageId set later). */
  isVisibilityZone?: boolean;
  onPersisted: () => void | Promise<void>;
  onError: (message: string) => void;
}

export function useMapRegionDraw({
  circle = false,
  active,
  campaignHandle,
  assetId,
  width,
  height,
  defaultLayerId,
  defaultLayerName,
  isVisibilityZone = false,
  onPersisted,
  onError,
}: UseMapRegionDrawOptions) {
  const [phase, setPhase] = useState<RegionDrawPhase>('idle');
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [cursorDisplay, setCursorDisplay] = useState<[number, number] | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const lastClickRef = useRef(0);
  const autoFinishAttempted = useRef(false);

  useEffect(() => {
    lastClickRef.current = 0;
    autoFinishAttempted.current = false;
    setSpaceHeld(false);
    if (!active) {
      setPhase('idle');
      setVertices([]);
      setCursorDisplay(null);
      return;
    }
    setPhase('drawing');
    setVertices([]);
    setCursorDisplay(null);
  }, [active, circle, campaignHandle, assetId]);

  const cancel = useCallback(() => {
    setPhase('idle');
    setVertices([]);
    setCursorDisplay(null);
  }, []);

  useEffect(() => {
    if (phase !== 'drawing') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input, textarea, select, button, summary, [contenteditable="true"]')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase, cancel]);

  const addVertex = useCallback(
    (x: number, y: number) => {
      if (phase !== 'drawing' || spaceHeld) return;
      const now = Date.now();
      if (now - lastClickRef.current < 300) return;
      lastClickRef.current = now;
      if (x < 0 || y < 0 || x > width || y > height) return;
      setVertices((current) => circle && current.length >= 2 ? current : [...current, [x, y]]);
    },
    [phase, spaceHeld, circle, width, height],
  );

  const updateCursor = useCallback(
    (x: number, y: number, insideMap: boolean) => {
      if (phase !== 'drawing') return;
      if (insideMap) setCursorDisplay([x, y]);
    },
    [phase],
  );

  const clearCursor = useCallback(() => {
    if (phase === 'drawing') setCursorDisplay(null);
  }, [phase]);

  const finish = useCallback(async () => {
    if (phase !== 'drawing' || vertices.length < (circle ? 2 : 3)) return;
    const geometry = circle ? circleGeometry(vertices[0], vertices[1], width, height) : polygonGeometry(vertices.map(([x, y]) => displayToNormalizedPoint(x, y, width, height)));
    if (!geometry) { setVertices([]); setCursorDisplay(null); return; }
    setPhase('persisting');
    try {
      const layerKind: MapLayerKindValue = defaultLayerName
        ? inferMapLayerKind({ name: defaultLayerName })
        : MapLayerKind.STANDARD;
      const semanticRole = defaultSemanticRoleForLayer(layerKind, 'region');
      const baseStyle = {
        fillOpacity: isVisibilityZone ? 0.08 : layerKind === MapLayerKind.POLITICAL_BORDER ? 0.15 : 0.25,
        strokeWeight: 2,
        ...(isVisibilityZone ? { isVisibilityZone: true } : {}),
      };
      await createMapSceneObject(campaignHandle, assetId, {
        kind: 'region',
        geometry,
        layerId: defaultLayerId,
        revelation: 'REVEALED',
        style: mergeObjectStyleWithOverlay(baseStyle, { layerKind, semanticRole }),
      });
      setVertices([]);
      setCursorDisplay(null);
      setPhase('idle');
      await onPersisted();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save region');
      setPhase('drawing');
    }
  }, [
    phase,
    circle,
    vertices,
    width,
    height,
    campaignHandle,
    assetId,
    defaultLayerId,
    defaultLayerName,
    isVisibilityZone,
    onPersisted,
    onError,
  ]);

  useEffect(() => {
    if (circle && vertices.length === 2 && phase === 'drawing' && !autoFinishAttempted.current) {
      autoFinishAttempted.current = true;
      void finish();
    }
  }, [circle, vertices.length, phase, finish]);

  const tryFinishOnDoubleClick = useCallback(() => {
    if (vertices.length >= 3) {
      void finish();
    }
  }, [vertices.length, finish]);

  const previewPositions = useCallback((): [number, number][] => {
    const pts: [number, number][] = vertices.map(([x, y]) => [y, x]);
    if (cursorDisplay && vertices.length > 0) {
      pts.push([cursorDisplay[1], cursorDisplay[0]]);
    }
    return pts;
  }, [vertices, cursorDisplay]);

  const closedPreviewPositions = useCallback((): [number, number][] | null => {
    if (circle && vertices.length && cursorDisplay) {
      return circleGeometry(vertices[0], vertices[1] ?? cursorDisplay, width, height)?.coordinates[0].map(([x, y]) => [y * height, x * width]) ?? null;
    }
    if (vertices.length < 3) return null;
    const ring = vertices.map(([x, y]) => [y, x] as [number, number]);
    return [...ring, ring[0]];
  }, [vertices, circle, cursorDisplay, width, height]);

  return {
    phase,
    vertices,
    spaceHeld,
    canFinish: phase === 'drawing' && vertices.length >= (circle ? 2 : 3),
    isDrawing: phase === 'drawing',
    isPersisting: phase === 'persisting',
    addVertex,
    updateCursor,
    clearCursor,
    cancel,
    finish,
    tryFinishOnDoubleClick,
    previewPositions,
    closedPreviewPositions,
  };
}
