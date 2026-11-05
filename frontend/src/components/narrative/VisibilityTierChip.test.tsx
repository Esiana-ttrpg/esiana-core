import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrowseVisibilityIndicator } from './VisibilityTierChip';

test('shows access restriction separately from draft status to an elevated viewer', () => {
  const html = renderToStaticMarkup(<BrowseVisibilityIndicator pageVisibility="DM_Only"
    narrativeStatus="DRAFT" showWhenElevated />);
  expect(html).toContain('GM only');
  expect(html).toContain('Draft');
  expect(renderToStaticMarkup(<BrowseVisibilityIndicator pageVisibility="UPLOADER_AND_MANAGERS" showWhenElevated />))
    .toContain('Restricted');
  expect(renderToStaticMarkup(<BrowseVisibilityIndicator pageVisibility="DM_Only" showWhenElevated={false} />)).toBe('');
});
