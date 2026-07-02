import { useOptionalWiki } from '@/contexts/WikiContext';

/**
 * Elevated narrative view (ghost mode, staff surfaces).
 * Optional prop override supports legacy `isDMUser` prop drilling during migration.
 */
export function useElevatedNarrativeView(propOverride?: boolean): boolean {
  const wiki = useOptionalWiki();
  if (propOverride !== undefined) return propOverride;
  return wiki?.hasElevatedView ?? false;
}
