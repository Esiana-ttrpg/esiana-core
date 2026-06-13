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

export type RegionDrawPhase = 'idle' | 'drawing' | 'persisting';

export interface UseMapRegionDrawOptions {
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

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      setVertices([]);
      setCursorDisplay(null);
      return;
    }
    setPhase('drawing');
    setVertices([]);
    setCursorDisplay(null);
  }, [active]);

  const cancel = useCallback(() => {
    setPhase('idle');
    setVertices([]);
    setCursorDisplay(null);
  }, []);

  useEffect(() => {
    if (phase !== 'drawing') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        cancel();
      }
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
      setVertices((current) => [...current, [x, y]]);
    },
    [phase, spaceHeld],
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
    if (phase !== 'drawing' || vertices.length < 3) return;
    setPhase('persisting');
    try {
      const ring = vertices.map(([x, y]) =>
        displayToNormalizedPoint(x, y, width, height),
      );
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
        geometry: polygonGeometry(ring),
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
      setPhase('idle');
      setVertices([]);
      setCursorDisplay(null);
    }
  }, [
    phase,
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
    if (vertices.length < 3) return null;
    const ring = vertices.map(([x, y]) => [y, x] as [number, number]);
    return [...ring, ring[0]];
  }, [vertices]);

  return {
    phase,
    vertices,
    spaceHeld,
    canFinish: phase === 'drawing' && vertices.length >= 3,
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
