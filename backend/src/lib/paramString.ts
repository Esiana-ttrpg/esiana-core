/** Normalize Express `req.params` / `req.query` string values. */
export function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return typeof value === 'string' ? value.trim() : '';
}
