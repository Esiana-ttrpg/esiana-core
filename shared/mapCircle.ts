import { polygonGeometry, type NormalizedPoint } from './mapGeometry.js';

/** Construct in image pixels, then normalize. One radius preserves roundness. */
export function circleGeometry(center: NormalizedPoint, edge: NormalizedPoint, width: number, height: number) {
  const [x, y] = center;
  if (![x, y, ...edge, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || x < 0 || y < 0 || x > width || y > height) return null;
  const radius = Math.min(Math.hypot(edge[0] - x, edge[1] - y), x, width - x, y, height - y);
  if (radius <= 0) return null;
  return polygonGeometry(Array.from({ length: 64 }, (_, i): NormalizedPoint => {
    const angle = i * Math.PI * 2 / 64;
    return [(x + Math.cos(angle) * radius) / width, (y + Math.sin(angle) * radius) / height];
  }));
}
