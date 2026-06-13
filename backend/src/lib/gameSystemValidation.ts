import {
  DEFAULT_GAME_SYSTEM_SLUG,
  getGameSystemLabel,
  isValidGameSystemSlug,
  normalizeGameSystemSlug,
} from './gameSystems.js';

export interface GameSystemFields {
  gameSystem?: string | null;
  customGameSystemName?: string | null;
}

export interface NormalizedGameSystemFields {
  gameSystem: string | null;
  customGameSystemName: string | null;
}

export function validateGameSystemFields(
  fields: GameSystemFields,
  options?: { required?: boolean },
): { ok: true; value: NormalizedGameSystemFields } | { ok: false; error: string } {
  const rawSlug =
    fields.gameSystem === undefined || fields.gameSystem === null || fields.gameSystem === ''
      ? options?.required
        ? DEFAULT_GAME_SYSTEM_SLUG
        : null
      : normalizeGameSystemSlug(fields.gameSystem);

  if (rawSlug !== null && !isValidGameSystemSlug(rawSlug)) {
    return {
      ok: false,
      error: 'Invalid game system slug. Choose a value from the game system directory.',
    };
  }

  const customName = fields.customGameSystemName?.trim() || null;

  if (rawSlug === 'other' && !customName) {
    return {
      ok: false,
      error: 'customGameSystemName is required when gameSystem is other.',
    };
  }

  if (rawSlug !== 'other' && customName) {
    return {
      ok: false,
      error: 'customGameSystemName may only be set when gameSystem is other.',
    };
  }

  return {
    ok: true,
    value: {
      gameSystem: rawSlug,
      customGameSystemName: rawSlug === 'other' ? customName : null,
    },
  };
}

export function resolveGameSystemLabel(
  gameSystem: string | null | undefined,
  customGameSystemName?: string | null,
): string {
  return getGameSystemLabel(
    gameSystem ? normalizeGameSystemSlug(gameSystem) : null,
    customGameSystemName,
  );
}
