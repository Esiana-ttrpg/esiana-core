import type { AppearanceMode } from '@/lib/entitySurfaceProfile';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { ancestryPageShell } from './ancestryShell';
import { bestiaryPageShell } from './bestiaryShell';
import { characterPageShell } from './characterShell';
import { createGenericWikiPageShell } from './genericWikiShell';
import { organizationPageShell } from './organizationShell';
import { familyPageShell } from './familyShell';
import { questPageShell } from './questShell';
import { locationPageShell } from './locationShell';
import type { EntityPageShell } from './types';

const DEDICATED_SHELLS: Partial<Record<SurfaceProfileKey, EntityPageShell>> = {
  character: characterPageShell,
  bestiary: bestiaryPageShell,
  ancestry: ancestryPageShell,
  organization: organizationPageShell,
  family: familyPageShell,
  quest: questPageShell,
  location: locationPageShell,
};

export function resolveEntityPageShell(
  surfaceKey: SurfaceProfileKey,
  appearanceMode: AppearanceMode = 'none',
): EntityPageShell {
  return DEDICATED_SHELLS[surfaceKey] ?? createGenericWikiPageShell(appearanceMode);
}

export function hasDedicatedPageShell(surfaceKey: SurfaceProfileKey): boolean {
  return surfaceKey in DEDICATED_SHELLS;
}

export function registerEntityPageShell(
  key: SurfaceProfileKey,
  shell: EntityPageShell,
): void {
  DEDICATED_SHELLS[key] = shell;
}
