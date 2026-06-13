/**
 * Default Lucide icon names (kebab-case) when Tag.icon is null.
 */
export function defaultTagIconName(tagName: string): string {
  const slug = tagName.toLowerCase();

  if (/quest/.test(slug)) return 'scroll-text';
  if (/npc|character|person|player/.test(slug)) return 'user';
  if (/location|place|city|town|region|map/.test(slug)) return 'map-pin';
  if (/item|loot|gear|equipment|treasure/.test(slug)) return 'package';
  if (/session|note|journal|log/.test(slug)) return 'notebook-pen';
  if (/enemy|monster|beast|foe/.test(slug)) return 'skull';
  if (/magic|spell|arcane/.test(slug)) return 'sparkles';
  if (/faction|guild|org/.test(slug)) return 'users';
  if (/lore|history|legend/.test(slug)) return 'book-open';

  return 'tag';
}
