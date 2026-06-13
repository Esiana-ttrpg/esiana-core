import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { ancestryPageShell } from './ancestryShell';
import { bestiaryPageShell } from './bestiaryShell';
import { characterPageShell } from './characterShell';
import { organizationPageShell } from './organizationShell';
import type { EntityPageShell } from './types';

const SHELLS: Partial<Record<SurfaceProfileKey, EntityPageShell>> = {
  character: characterPageShell,
  bestiary: bestiaryPageShell,
  ancestry: ancestryPageShell,
  organization: organizationPageShell,
};

export function resolveEntityPageShell(
  surfaceKey: SurfaceProfileKey,
): EntityPageShell | null {
  return SHELLS[surfaceKey] ?? null;
}

export function hasEntityPageShell(surfaceKey: SurfaceProfileKey): boolean {
  return surfaceKey in SHELLS;
}

export function registerEntityPageShell(
  key: SurfaceProfileKey,
  shell: EntityPageShell,
): void {
  SHELLS[key] = shell;
}
