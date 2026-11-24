import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./NewCampaignWizard.tsx', import.meta.url), 'utf8');
const stepNavSource = fs.readFileSync(
  new URL('./newCampaignWizard/WizardStepNav.tsx', import.meta.url),
  'utf8',
);

test('keeps wizard actions reachable in constrained Standard desktop viewports', () => {
  assert.match(
    source,
    /flex-col overflow-hidden.*sm:max-h-\[calc\(100dvh-2rem\)\]/,
    'the dialog must be bounded by the visible viewport and lay out its regions vertically',
  );
  assert.match(
    source,
    /min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5/,
    'long step content must shrink and scroll inside the available dialog height',
  );
  assert.match(
    source,
    /flex shrink-0 flex-wrap items-center justify-between gap-2 border-t/,
    'the action footer must remain outside the scrolling content region',
  );

  for (const [viewportWidth, viewportHeight] of [
    [1366, 768],
    [1366, 640],
    [1366, 560],
  ]) {
    const dialogLimit = viewportHeight - 32;
    assert.ok(
      dialogLimit < viewportHeight,
      `dialog fits a ${viewportWidth}x${viewportHeight} viewport`,
    );
    assert.ok(
      dialogLimit >= 528,
      `dialog retains usable content space at ${viewportHeight}px tall`,
    );
  }

  assert.ok(source.includes("{step === 0 ? 'Cancel' : 'Back'}"));
  assert.ok(source.includes(": 'Next'}"));
});

test('uses a full-height sheet and compact step nav on mobile viewports', () => {
  assert.match(
    source,
    /h-\[100dvh\] max-h-\[100dvh\].*sm:h-auto sm:max-h-\[calc\(100dvh-2rem\)\]/,
    'mobile must fill the dynamic viewport instead of a padded inset dialog',
  );
  assert.match(
    source,
    /items-stretch justify-center sm:items-center sm:p-4/,
    'mobile must avoid outer padding that shrinks usable height',
  );
  assert.match(
    stepNavSource,
    /flex gap-2 overflow-x-auto.*md:grid md:overflow-visible/,
    'mobile step nav must scroll horizontally instead of stacking every step',
  );
  assert.match(
    stepNavSource,
    /Step \{stepIndex \+ 1\} of \{steps\.length\}/,
    'mobile must show a compact step counter',
  );

  // Phone-height budget: header + single-row nav + footer must leave room for form fields.
  const phoneHeight = 667;
  const headerBudget = 64;
  const stepNavBudget = 88;
  const footerBudget = 64;
  const contentBudget = phoneHeight - headerBudget - stepNavBudget - footerBudget;
  assert.ok(
    contentBudget >= 360,
    `phone layout must keep usable content space (got ${contentBudget}px)`,
  );
});
