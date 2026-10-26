/** Undefined/null means defaults; an explicit empty list means no layers. */
export function parseMapLayerIds(value: unknown): string[] | undefined {
  return typeof value === 'string' ? value.split(',').map(id => id.trim()).filter(Boolean) : undefined;
}

export function resolveMapLayerIds(ids: readonly string[] | null | undefined, layers: readonly { id: string; defaultEnabled: boolean }[]): Set<string> {
  return new Set(ids ?? layers.filter(layer => layer.defaultEnabled).map(layer => layer.id));
}
