/**
 * GeoJSON geometry helpers for map scene objects (normalized [0,1] coordinate space).
 * x = longitude axis, y = latitude axis in Leaflet CRS.Simple (lng → x pixel, lat → y pixel).
 */

export type NormalizedPoint = [number, number];

export function parsePointGeometry(geometry: unknown): NormalizedPoint | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { type?: string; coordinates?: unknown };
  if (g.type !== 'Point' || !Array.isArray(g.coordinates)) return null;
  const [x, y] = g.coordinates;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return [x, y];
}

export function parsePolygonGeometry(geometry: unknown): NormalizedPoint[][] | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { type?: string; coordinates?: unknown };
  if (g.type !== 'Polygon' || !Array.isArray(g.coordinates)) return null;
  const rings = g.coordinates as unknown[];
  if (rings.length === 0) return null;
  const outer = rings[0];
  if (!Array.isArray(outer)) return null;
  const ring: NormalizedPoint[] = [];
  for (const coord of outer) {
    if (!Array.isArray(coord) || coord.length < 2) return null;
    const [x, y] = coord;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    ring.push([x, y]);
  }
  return ring.length >= 3 ? [ring] : null;
}

export function parseLineStringGeometry(geometry: unknown): NormalizedPoint[] | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { type?: string; coordinates?: unknown };
  if (g.type !== 'LineString' || !Array.isArray(g.coordinates)) return null;
  const points: NormalizedPoint[] = [];
  for (const coord of g.coordinates) {
    if (!Array.isArray(coord) || coord.length < 2) return null;
    const [x, y] = coord;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    points.push([x, y]);
  }
  return points.length >= 2 ? points : null;
}

/** Normalized ring → Leaflet lat/lng pairs [y, x] in display pixel space. */
export function normalizedRingToDisplay(
  ring: NormalizedPoint[],
  width: number,
  height: number,
): [number, number][] {
  return ring.map(([nx, ny]) => [ny * height, nx * width]);
}

export function normalizedLineToDisplay(
  points: NormalizedPoint[],
  width: number,
  height: number,
): [number, number][] {
  return points.map(([nx, ny]) => [ny * height, nx * width]);
}

export function displayPointToLatLng(
  x: number,
  y: number,
): [number, number] {
  return [y, x];
}

export function polygonGeometry(
  ring: NormalizedPoint[],
): { type: 'Polygon'; coordinates: NormalizedPoint[][] } {
  const closed =
    ring.length > 0 &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ? [...ring, ring[0]]
      : ring;
  return { type: 'Polygon', coordinates: [closed] };
}

export function lineStringGeometry(
  points: NormalizedPoint[],
): { type: 'LineString'; coordinates: NormalizedPoint[] } {
  return { type: 'LineString', coordinates: points };
}

/** Offset a point perpendicular to segment direction by normalized map-space distance. */
function offsetPoint(
  point: NormalizedPoint,
  direction: NormalizedPoint,
  distance: number,
  side: 1 | -1,
): NormalizedPoint {
  const len = Math.hypot(direction[0], direction[1]) || 1;
  const nx = (-direction[1] / len) * side;
  const ny = (direction[0] / len) * side;
  return [point[0] + nx * distance, point[1] + ny * distance];
}

/**
 * Derive a corridor polygon from a LineString spine and ribbon width in normalized map space.
 * Width is a fraction of the map unit (e.g. 0.02 ≈ 2% of map extent).
 */
export function deriveRibbonPolygon(
  spine: NormalizedPoint[],
  baseWidth: number,
  widthVariance = 0,
): NormalizedPoint[] {
  if (spine.length < 2 || baseWidth <= 0) return [];

  const left: NormalizedPoint[] = [];
  const right: NormalizedPoint[] = [];

  for (let i = 0; i < spine.length; i += 1) {
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(spine.length - 1, i + 1)];
    const dir: NormalizedPoint = [next[0] - prev[0], next[1] - prev[1]];
    const t = spine.length <= 1 ? 0 : i / (spine.length - 1);
    const halfWidth = baseWidth / 2 + widthVariance * Math.sin(t * Math.PI);
    left.push(offsetPoint(spine[i], dir, halfWidth, 1));
    right.push(offsetPoint(spine[i], dir, halfWidth, -1));
  }

  const ring = [...left, ...right.reverse()];
  if (ring.length < 3) return [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }
  return ring;
}

/** Graham scan convex hull for weather band polygons (normalized space). */
export function convexHull(points: NormalizedPoint[]): NormalizedPoint[] {
  if (points.length < 3) return points.length ? [...points] : [];
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const cross = (o: NormalizedPoint, a: NormalizedPoint, b: NormalizedPoint) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: NormalizedPoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: NormalizedPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export function convexHullPolygon(
  points: NormalizedPoint[],
): { type: 'Polygon'; coordinates: NormalizedPoint[][] } | null {
  const hull = convexHull(points);
  if (hull.length < 3) return null;
  return polygonGeometry(hull);
}

/** Layer 4 render hint — never persisted on MapSceneObject. */
export type FlowFieldSample = {
  nx: number;
  ny: number;
  direction: number;
  magnitude: number;
};

export function computeFlowFieldSamples(
  spine: NormalizedPoint[],
  flowDirection: 'forward' | 'reverse' | 'bidirectional',
  sampleCount = 8,
): FlowFieldSample[] {
  if (spine.length < 2) return [];
  const samples: FlowFieldSample[] = [];
  const steps = Math.max(2, sampleCount);

  for (let s = 0; s <= steps; s += 1) {
    const t = s / steps;
    const idx = Math.min(spine.length - 2, Math.floor(t * (spine.length - 1)));
    const a = spine[idx];
    const b = spine[idx + 1];
    const nx = a[0] + (b[0] - a[0]) * (t * (spine.length - 1) - idx);
    const ny = a[1] + (b[1] - a[1]) * (t * (spine.length - 1) - idx);
    let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (flowDirection === 'reverse') angle += Math.PI;
    samples.push({
      nx,
      ny,
      direction: angle,
      magnitude: flowDirection === 'bidirectional' ? 0.6 : 1,
    });
  }

  return samples;
}
