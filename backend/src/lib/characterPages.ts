import {
  CHARACTER_CORE_PAGE_KEYS,
  type CharacterCorePageKey,
  type CharacterPageOrigin,
  type CharacterPageRenderMode,
} from '../../../shared/characterPages.js';

export const CORE_CHARACTER_PAGE_TITLES: Record<CharacterCorePageKey, string> = {
  overview: 'Overview',
  appearance: 'Appearance',
  relationships: 'Relationships',
  timeline: 'Timeline',
  discovery: 'Discovery',
  continuity: 'Continuity',
};

export const CORE_CHARACTER_PAGE_ORDER = new Map<string, number>(
  CHARACTER_CORE_PAGE_KEYS.map((key, index) => [key, index * 10]),
);

export function isCharacterPageOrigin(value: unknown): value is CharacterPageOrigin {
  return value === 'CORE' || value === 'CUSTOM' || value === 'PLUGIN';
}

export function isCharacterPageRenderMode(value: unknown): value is CharacterPageRenderMode {
  return value === 'CORE' || value === 'CANVAS' || value === 'PLUGIN';
}

export function isValidOriginRenderMode(
  origin: CharacterPageOrigin,
  renderMode: CharacterPageRenderMode,
): boolean {
  if (origin === 'CORE') return renderMode === 'CORE';
  if (origin === 'CUSTOM') return renderMode === 'CANVAS';
  return renderMode === 'CANVAS' || renderMode === 'PLUGIN';
}

export function isCharacterCorePageKey(value: unknown): value is CharacterCorePageKey {
  return typeof value === 'string' && (CHARACTER_CORE_PAGE_KEYS as readonly string[]).includes(value);
}

export function normalizeCharacterPageTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  return title.length > 0 && title.length <= 100 ? title : null;
}

export function normalizeCharacterPageBlocks(value: unknown): Array<Record<string, unknown>> | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  return value.every((block) => block && typeof block === 'object' && !Array.isArray(block))
    ? (value as Array<Record<string, unknown>>)
    : null;
}

