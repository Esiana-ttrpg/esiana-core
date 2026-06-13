import { useCallback, useEffect, useRef, useState } from 'react';
import { displayToNormalizedPoint, lineStringGeometry } from '@shared/mapPresence';
import {
  defaultSemanticRoleForLayer,
  inferMapLayerKind,
  MapLayerKind,
  mergeObjectStyleWithOverlay,
  OverlaySourceType,
  RibbonWidthUnit,
  type MapLayerKindValue,
} from '@shared/mapOverlayTypes';
import { createMapSceneObject } from '@/lib/mapScene';

export type PathDrawPhase = 'idle' | 'drawing' | 'persisting';

export interface UseMapPathDrawOptions {
  active: boolean;
  campaignHandle: string;
  assetId: string;
  width: number;
  height: number;
  defaultLayerId: string | null;
  defaultLayerName?: string | null;
  onPersisted: () => void | Promise<void>;
  onError: (message: string) => void;
}

export function useMapPathDraw({
  active,
  campaignHandle,
  assetId,
  width,
  height,
  defaultLayerId,
  defaultLayerName,
  onPersisted,
  onError,
}: UseMapPathDrawOptions) {
  const [phase, setPhase] = useState<PathDrawPhase>('idle');
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
      if (event.code === 'Space') setSpaceHeld(false);
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
    if (phase !== 'drawing' || vertices.length < 2) return;
    setPhase('persisting');
    try {
      const points = vertices.map(([x, y]) =>
        displayToNormalizedPoint(x, y, width, height),
      );
      const layerKind: MapLayerKindValue = defaultLayerName
        ? inferMapLayerKind({ name: defaultLayerName })
        : MapLayerKind.TRAVEL_ROUTE;
      const semanticRole = defaultSemanticRoleForLayer(layerKind, 'path');
      const style = mergeObjectStyleWithOverlay(
        { strokeColor: '#6366f1', strokeWeight: 3 },
        {
          layerKind,
          semanticRole,
          sourceType: OverlaySourceType.MANUAL,
          flowKind: layerKind === MapLayerKind.TRADE_ROUTE ? 'trade' : 'travel',
          flowDirection: layerKind === MapLayerKind.TRADE_ROUTE ? 'bidirectional' : 'forward',
          geoPath: { segmentCosts: Array.from({ length: points.length - 1 }, () => ({})) },
          ribbon: {
            baseWidth: 0.018,
            widthUnit: RibbonWidthUnit.NORMALIZED_MAP_SPACE,
            opacity: 0.5,
          },
        },
      );
      await createMapSceneObject(campaignHandle, assetId, {
        kind: 'path',
        layerId: defaultLayerId,
        geometry: lineStringGeometry(points),
        style,
        revelation: 'REVEALED',
      });
      setPhase('idle');
      setVertices([]);
      setCursorDisplay(null);
      await onPersisted();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save path');
      setPhase('drawing');
    }
  }, [
    phase,
    vertices,
    width,
    height,
    defaultLayerName,
    campaignHandle,
    assetId,
    defaultLayerId,
    onPersisted,
    onError,
  ]);

  const tryFinishOnDoubleClick = useCallback(() => {
    if (vertices.length >= 2) void finish();
  }, [vertices.length, finish]);

  const previewPositions = useCallback((): [number, number][] => {
    const pts: [number, number][] = vertices.map(([x, y]) => [y, x]);
    if (cursorDisplay && phase === 'drawing') {
      pts.push([cursorDisplay[1], cursorDisplay[0]]);
    }
    return pts;
  }, [vertices, cursorDisplay, phase]);

  return {
    phase,
    spaceHeld,
    vertices,
    previewPositions,
    addVertex,
    updateCursor,
    clearCursor,
    tryFinishOnDoubleClick,
    finish,
    cancel,
    canFinish: vertices.length >= 2,
    isPersisting: phase === 'persisting',
  };
}
