/**
 * GeoJSON geometry helpers for map scene objects (normalized [0,1] coordinate space).
 * x = longitude axis, y = latitude axis in Leaflet CRS.Simple (lng → x pixel, lat → y pixel).
 */
export type NormalizedPoint = [number, number];
export declare function parsePointGeometry(geometry: unknown): NormalizedPoint | null;
export declare function parsePolygonGeometry(geometry: unknown): NormalizedPoint[][] | null;
export declare function parseLineStringGeometry(geometry: unknown): NormalizedPoint[] | null;
/** Normalized ring → Leaflet lat/lng pairs [y, x] in display pixel space. */
export declare function normalizedRingToDisplay(ring: NormalizedPoint[], width: number, height: number): [number, number][];
export declare function normalizedLineToDisplay(points: NormalizedPoint[], width: number, height: number): [number, number][];
export declare function displayPointToLatLng(x: number, y: number): [number, number];
export declare function polygonGeometry(ring: NormalizedPoint[]): {
    type: 'Polygon';
    coordinates: NormalizedPoint[][];
};
export declare function lineStringGeometry(points: NormalizedPoint[]): {
    type: 'LineString';
    coordinates: NormalizedPoint[];
};
/**
 * Derive a corridor polygon from a LineString spine and ribbon width in normalized map space.
 * Width is a fraction of the map unit (e.g. 0.02 ≈ 2% of map extent).
 */
export declare function deriveRibbonPolygon(spine: NormalizedPoint[], baseWidth: number, widthVariance?: number): NormalizedPoint[];
/** Graham scan convex hull for weather band polygons (normalized space). */
export declare function convexHull(points: NormalizedPoint[]): NormalizedPoint[];
export declare function convexHullPolygon(points: NormalizedPoint[]): {
    type: 'Polygon';
    coordinates: NormalizedPoint[][];
} | null;
/** Layer 4 render hint — never persisted on MapSceneObject. */
export type FlowFieldSample = {
    nx: number;
    ny: number;
    direction: number;
    magnitude: number;
};
export declare function computeFlowFieldSamples(spine: NormalizedPoint[], flowDirection: 'forward' | 'reverse' | 'bidirectional', sampleCount?: number): FlowFieldSample[];
//# sourceMappingURL=mapGeometry.d.ts.map