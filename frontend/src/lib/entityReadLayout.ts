import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';

export function isEntityReaderFirst(
  surfaceProfileKey: SurfaceProfileKey,
  isDMUser: boolean,
): boolean {
  return (
    !isDMUser &&
    (surfaceProfileKey === 'organization' || surfaceProfileKey === 'family')
  );
}
