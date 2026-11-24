const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[contenteditable="true"]',
].join(', ');

/**
 * Enter/Space should activate a focused interactive control (Close link,
 * export button, slide tabs) instead of advancing the story index.
 */
function isElementWithClosest(
  target: EventTarget | null,
): target is Element {
  return (
    typeof target === 'object' &&
    target != null &&
    'closest' in target &&
    typeof (target as Element).closest === 'function'
  );
}

export function shouldDeferSlideAdvanceKey(
  key: string,
  target: EventTarget | null,
): boolean {
  if (key !== 'Enter' && key !== ' ') return false;
  if (!isElementWithClosest(target)) return false;
  return target.closest(INTERACTIVE_SELECTOR) != null;
}
