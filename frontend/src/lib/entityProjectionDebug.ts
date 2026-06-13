/** Pure helper — no side effects. */
export function isProjectionDebugEnabled(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
  isDMUser: boolean,
): boolean {
  if (!isDMUser) return false;
  const flag = searchParams.get('debugRelations');
  return flag === '1' || flag === 'true';
}
