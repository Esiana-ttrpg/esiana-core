import { describe, expect, it } from 'vitest';
import { formatWikiTemplateType } from './formatWikiTemplateType';

describe('formatWikiTemplateType', () => {
  it('maps known template types', () => {
    expect(formatWikiTemplateType('CHARACTER')).toBe('Character');
    expect(formatWikiTemplateType('LOCATION')).toBe('Location');
    expect(formatWikiTemplateType('QUEST')).toBe('Quest');
    expect(formatWikiTemplateType('SCENE')).toBe('Scene');
  });

  it('falls back for empty values', () => {
    expect(formatWikiTemplateType(null)).toBe('Page');
    expect(formatWikiTemplateType('')).toBe('Page');
  });

  it('title-cases unknown snake_case types', () => {
    expect(formatWikiTemplateType('CUSTOM_TYPE')).toBe('Custom Type');
  });
});
