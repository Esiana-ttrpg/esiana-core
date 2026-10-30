import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
// Optional browser tooling; production dependencies remain unchanged.
// From the repository root:
// npm install --prefix node_modules/.chronology-verification --no-save --package-lock=false playwright
// node frontend/scripts/verify-chronology-ui.mjs
const { chromium } = await import('playwright').catch(
  () =>
    import('../../node_modules/.chronology-verification/node_modules/playwright/index.mjs'),
);
mkdirSync('node_modules/.chronology-verification', { recursive: true });
const root = process.cwd().replaceAll('\\', '/');
const server = await createServer({
  root: path.resolve('frontend'),
  configFile: path.resolve('frontend/vite.config.ts'),
  server: { port: 5199, strictPort: true, hmr: false },
  cacheDir: path.resolve('node_modules/.chronology-verification/.vite'),
  optimizeDeps: {
    entries: [path.resolve('frontend/scripts/fixtures/chronology-ui.tsx')],
  },
  plugins: [
    {
      name: 'chronology-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (
          id === '@/contexts/WikiContext' ||
          id.replaceAll('\\', '/').endsWith('/src/contexts/WikiContext')
        )
          return '\0mock-wiki';
      },
      load(id) {
        if (id === '\0mock-wiki')
          return 'export const useWiki=()=>({campaignHandle:"test",flatPages:[{id:"era-page",title:"World history",workspace:"pages",pathKey:"world-history"}],can:()=>!new URLSearchParams(location.search).has("player")});export const useOptionalWiki=()=>null;';
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/__chronology') && !req.url?.startsWith('/campaigns/test/chronology')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(
            await vite.transformIndexHtml(
              req.url,
              '<html><body><div id="root"></div><script type="module" src="/@fs/' +
                root +
                '/frontend/scripts/fixtures/chronology-ui.tsx"></script></body></html>',
            ),
          );
        });
      },
    },
  ],
});
await server.listen();
const browser = await chromium.launch({
  channel:
    process.env.CHRONOLOGY_BROWSER_CHANNEL ??
    (process.platform === 'win32' ? 'msedge' : undefined),
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.error(e.message); });
let failSave = false;
const requests = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (req.url().includes('/chronology/timeline') && req.method() === 'GET') return route.fulfill({ json: await page.evaluate(() => {
    const bundle = window.__chronologyBundle;
    return new URLSearchParams(location.search).has('hidden') ? { ...bundle, baseEvents: bundle.baseEvents.filter(row => row.id !== 'journey'), occurrences: bundle.occurrences.filter(row => row.baseEventId !== 'journey') } : bundle;
  }) });
  if (req.url().includes('/time-tracking') && req.method() === 'GET') return route.fulfill({ json: await page.evaluate(() => window.__chronologyTime) });
  if (req.url().includes('/chronology/overlay') && req.method() === 'GET') {
    const params = new URL(req.url()).searchParams;
    const from = params.get('from') ?? '0', to = params.get('to') ?? '100000';
    const entry = { entryId: 'linked-journey', sortOrdinal: '1', instant: { epochMinute: '34683', dateParts: null },
      display: { title: 'The long journey', summary: 'Mira found the coast.', dateLabel: 'Before 25, Year 1' },
      source: { domain: 'world_event', entityType: 'timeline_event', entityId: 'journey', subEntityId: 'occ_0' }, domain: 'world_event',
      domainPayload: {}, projection: { visible: true }, links: [], sessionLink: null,
      feed: { datePrecision: 'day', importance: 'MAJOR', referenceDay: '24', calendarId: 'clock', calendarName: 'World',
        occurrenceId: 'occ_0', occurrenceIndex: 0, nativeStart: { year: 1, month: 0, day: 25 }, duration: 40 } };
    const entries = (!params.has('domains') || params.get('domains').split(',').includes('world_event')) &&
      (params.get('importance') ?? 'MAJOR,MINOR,NOTICE').split(',').includes('MAJOR') ? [entry] : [];
    return route.fulfill({ json: { entries, campaignNowEpochMinute: '56283', window: { mode: 'EPOCH_RANGE', from, to },
      truncation: { capped: false, maxEntries: 2000, totalCollected: entries.length },
      feed: { requestedRange: { mode: 'EPOCH_RANGE', from, to }, todayEndEpochMinute: '57723', includeFuture: params.get('includeFuture') === 'true',
        undated: { capped: false }, unaligned: { capped: false }, sourceWarnings: [], gaps: [] } } });
  }
  if (req.url().includes('/narrative-snapshots') && req.method() === 'GET') return route.fulfill({ json: { snapshots: [] } });
  if (req.url().includes('/chronology/eras')) {
    if (req.method() === 'GET') return route.fulfill({ json: { events: 1, trajectories: 2, recurringRules: 1, overviewWords: 2 } });
    const payload = req.postDataJSON();
    requests.push({ method: req.method(), url: req.url(), payload });
    if (failSave) return route.fulfill({ status: 500, json: { error: 'Simulated era save failure' } });
    if (req.method() === 'DELETE') {
      await page.evaluate(id => { window.__deletedEra = id; }, req.url().split('/').at(-1));
      return route.fulfill({ status: 204 });
    }
    if (req.url().endsWith('/order')) return route.fulfill({ json: {} });
    const era = { ...payload, id: req.method() === 'POST' ? 'new-era' : req.url().split('/').at(-1), calendarName: 'World', isMasterTime: true, sortOrder: 2, overviewPageId: 'era-page', canManage: true, status: 'PRESENT' };
    await page.evaluate(value => { window.__savedEra = value; }, era);
    return route.fulfill({ json: { era } });
  }
  if (['POST', 'PATCH', 'DELETE'].includes(req.method())) {
    requests.push({
      method: req.method(),
      url: req.url(),
      payload: req.postData() ? req.postDataJSON() : null,
    });
    if (failSave)
      return route.fulfill({
        status: 500,
        json: { error: 'Simulated save failure' },
      });
    return route.fulfill({ json: { event: { id: 'saved-event' } } });
  }
  return route.fulfill({ json: [] });
});
const visible = async (locator) => {
  await locator.waitFor({ state: 'visible' });
};
try {
  await page.goto('http://localhost:5199/__chronology?climate&truncated');
  await page.getByRole('table', { name: 'Returning' }).waitFor();
  assert.equal(await page.locator('th').count(), 7);
  await visible(page.getByText('Monthly climate: Pluvial', { exact: true }));
  await page.getByText('Monthly climate: Pluvial', { exact: true }).click();
  await visible(page.getByText('Pluvial / Monsoon', { exact: true }));
  assert.equal(
    (await page.getByRole('img', { name: 'Aster: full' }).count()) > 0,
    true,
  );
  await visible(
    page.getByText(
      'Some event occurrences are omitted because expansion limits were reached.',
    ),
  );
  assert.equal(
    await page
      .getByRole('button', { name: /The long journey, major, Event begins/ })
      .count(),
    0,
  );
  const cell = page.getByRole('button', {
    name: 'Returning 10, today, 4 events',
    exact: true,
  });
  assert.ok((await cell.locator('xpath=../..').boundingBox()).height >= 132);
  await page.screenshot({
    path: 'node_modules/.chronology-verification/calendar-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '+1 more', exact: true }).click();
  await visible(
    page.getByRole('complementary', { name: 'Selected day details' }),
  );
  await page
    .getByRole('button', { name: /The long journey World history/ })
    .click();
  await page.getByRole('button', { name: 'Edit event', exact: true }).click();
  await visible(page.getByRole('dialog', { name: 'Edit event', exact: true }));
  await visible(page.getByRole('alert'));
  const title = page.getByRole('textbox', { name: 'Title', exact: true });
  await title.fill('Changed journey');
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await visible(page.getByRole('dialog', { name: 'Edit event', exact: true }));
  assert.equal(await title.inputValue(), 'Changed journey');
  // Native close() must reopen the modal before applying the discard guard.
  const nativeClosePrompt = page.waitForEvent('dialog');
  await page.getByRole('dialog').evaluate((el) => el.close());
  await (await nativeClosePrompt).dismiss();
  await visible(page.getByRole('dialog', { name: 'Edit event', exact: true }));
  assert.equal(await page.getByRole('dialog').evaluate((el) => el.open), true);
  assert.equal(await title.inputValue(), 'Changed journey');
  page.once('dialog', (d) => d.dismiss());
  await page
    .getByRole('dialog')
    .getByRole('link', { name: 'Initialize Lore Page' })
    .click();
  await visible(page.getByRole('dialog', { name: 'Edit event', exact: true }));
  assert.ok(page.url().includes('/__chronology'));
  failSave = true;
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await visible(
    page.getByRole('alert').filter({ hasText: 'Simulated save failure' }),
  );
  assert.equal(await title.inputValue(), 'Changed journey');
  failSave = false;
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  const patch = requests.at(-1);
  assert.equal(patch.method, 'PATCH');
  assert.equal(patch.payload.title, 'Changed journey');
  assert.equal(patch.payload.duration, 40);
  assert.equal(patch.payload.repeatUnit, 'YEARS');
  assert.equal(patch.payload.moonOverrides[0].offset, 2);
  assert.match(patch.payload.description, /\*\*Remember\*\*/);
  await page.getByRole('button', { name: 'Close agenda', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: '+1 more', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByRole('button', { name: 'New event', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('A new discovery');
  await page
    .getByRole('combobox', { name: 'Importance', exact: true })
    .selectOption('MAJOR');
  await page
    .getByRole('spinbutton', { name: 'Duration (days)', exact: true })
    .fill('3');
  const richText = page.locator('[contenteditable=true]');
  await richText.fill('');
  await richText.pressSequentially('/');
  await page.getByRole('listbox').waitFor();
  assert.equal(
    await page
      .getByRole('listbox')
      .evaluate((el) => Boolean(el.closest('dialog[open]'))),
    true,
  );
  await page.getByRole('button', { name: /Link to codex/ }).click();
  await visible(page.getByText('Link to codex', { exact: true }));
  await richText.fill('A remembered discovery');
  await page.getByRole('button', { name: 'Create event', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(requests.at(-1).method, 'POST');
  assert.equal(requests.at(-1).payload.importance, 'MAJOR');
  assert.equal(requests.at(-1).payload.duration, 3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5199/__chronology');
  await page.getByRole('table').waitFor();
  assert.equal(await page.locator('th').count(), 7);
  assert.equal(
    await page.getByText('Monthly climate:', { exact: false }).count(),
    0,
  );
  await page
    .getByRole('button', { name: 'Returning 10, today, 4 events', exact: true })
    .click();
  const tableBox = await page.getByRole('table').boundingBox();
  const asideBox = await page.getByRole('dialog', { name: 'Selected day details' }).boundingBox();
  assert.ok(asideBox.y >= 0 && asideBox.y + asideBox.height <= 845);
  assert.ok(asideBox.height <= 844 * .75 + 1);
  await page.getByRole('button', { name: 'Close agenda' }).click();
  await page.getByRole('button', { name: 'Returning 10, today, 4 events', exact: true }).click();
  await page.screenshot({
    path: 'node_modules/.chronology-verification/calendar-mobile.png',
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole('button', { name: 'Close agenda', exact: true }).click();
  await page.getByRole('button', { name: 'New event', exact: true }).click();
  const dialogBox = await page.getByRole('dialog').boundingBox();
  assert.equal(dialogBox.width, 390);
  assert.equal(dialogBox.height, 844);
  // A clean native close also has to clear the parent's open state.
  await page.getByRole('dialog').evaluate((el) => el.close());
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.goto('http://localhost:5199/__chronology?custom&player');
  await page.getByRole('table').waitFor();
  assert.equal(await page.locator('th').count(), 5);
  await page
    .getByRole('button', { name: 'Returning 10, today, 4 events', exact: true })
    .click();
  await page
    .getByRole('button', { name: /The long journey World history/ })
    .click();
  assert.equal(
    await page.getByRole('button', { name: 'Edit event', exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole('button', { name: 'New event', exact: true }).count(),
    0,
  );

  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('http://localhost:5199/__chronology?sidebar');
  await page.getByRole('table').waitFor();
  await page.evaluate(() =>
    history.pushState({ ...history.state, idx: 1 }, '', location.href),
  );
  await page.getByRole('button', { name: 'Edit event', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('History guard');
  page.once('dialog', (d) => d.dismiss());
  await page.evaluate(() => history.back());
  await page.waitForTimeout(200);
  await visible(page.getByRole('dialog', { name: 'Edit event', exact: true }));
  assert.ok(page.url().includes('sidebar'));
  assert.equal(
    await page
      .getByRole('textbox', { name: 'Title', exact: true })
      .inputValue(),
    'History guard',
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .focus();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    assert.equal(
      await page
        .getByRole('dialog')
        .evaluate((el) => el.contains(document.activeElement)),
      true,
    );
  }
  page.once('dialog', (d) => d.accept());
  await page.getByRole('dialog').evaluate((el) => el.close());
  await page.getByRole('dialog').waitFor({ state: 'detached' });

  console.log('Calendar inspector and editor checks passed.');
  await page.goto('http://localhost:5199/__chronology?timeline&truncated');
  await page.locator('[data-historical-timeline]').waitFor();
  await visible(page.getByRole('button', { name: 'Fit to Loaded Events', exact: true }));
  await visible(page.getByRole('status'));
  const axisText = () => page.locator('[data-timeline-axis]').textContent();
  const beforeAxis = await axisText();
  const canvasWidth = await page.locator('[data-timeline-axis]').evaluate(el => el.clientWidth);
  const journey = page.locator('[data-timeline-event="occ_0"]');
  await journey.focus();
  await page.keyboard.press('Enter');
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  assert.equal(await page.locator('[data-timeline-axis]').evaluate(el => el.clientWidth), canvasWidth);
  await page.locator('[data-timeline-event="extra1"]').focus();
  await page.keyboard.press('Enter');
  await visible(page.getByRole('complementary').getByText('Milestone 1', { exact: true }));
  assert.equal(await axisText(), beforeAxis);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  assert.equal(await page.locator('[data-timeline-event="extra1"]').evaluate(el => el === document.activeElement), true);
  await journey.focus();
  await page.keyboard.press('Enter');
  await visible(page.getByRole('complementary', { name: 'Event details' }).getByText(/Before 25.*After 4/).last());
  await page.getByRole('button', { name: 'Edit event', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Timeline dirty guard');
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('textbox', { name: 'Title', exact: true }).inputValue(), 'Timeline dirty guard');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('dialog', { name: 'Edit event', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog', { name: 'Edit event', exact: true }).waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Close inspector' }).click();
  assert.equal(await axisText(), beforeAxis);
  assert.equal(await journey.evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').textContent !== before, beforeAxis);
  assert.notEqual(await axisText(), beforeAxis);
  await page.getByRole('button', { name: 'Fit to Loaded Events', exact: true }).click();
  await page.screenshot({ path: 'node_modules/.chronology-verification/timeline-desktop.png', fullPage: true });

  await page.getByText('Navigation & filters', { exact: true }).click();
  const filteredBefore = await axisText();
  await page.getByRole('button', { name: 'Minor', exact: true }).click();
  assert.equal(await page.locator('[data-timeline-event^="extra"]').count(), 0);
  assert.equal(await page.locator('[data-timeline-event="occ_0"]').count(), 1);
  assert.equal(await axisText(), filteredBefore);
  await page.getByRole('button', { name: 'Notice', exact: true }).click();
  assert.equal(await page.locator('[data-timeline-event="extra0"]').count(), 1);
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('uncategorized');
  assert.equal(await page.locator('[data-timeline-event]').count(), 0);
  assert.equal(await axisText(), filteredBefore);

  await page.goto('http://localhost:5199/__chronology?timeline&twoClocks');
  await page.locator('[data-historical-timeline]').waitFor();
  const viewport = () => page.locator('[data-timeline-axis]').evaluate(el => [el.dataset.viewportOrigin, el.dataset.viewportSpan]);
  const clockInitial = await viewport();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').dataset.viewportSpan !== before[1], clockInitial);
  const clockViewport = await viewport();
  const tracksToggle = () => page.getByRole('button', { name: /^Tracks \(/ });
  await tracksToggle().click();
  assert.equal(await page.getByText('Unauthorized clock', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Show All', exact: true }).click();
  await page.getByRole('button', { name: 'Move Other up', exact: true }).click();
  await tracksToggle().click();
  assert.deepEqual(await page.locator('[data-timeline-track]').evaluateAll(els => els.map(el => el.dataset.timelineTrack)), ['other', 'clock']);
  assert.deepEqual(await viewport(), clockViewport);
  await page.getByRole('combobox', { name: 'Reference clock', exact: true }).selectOption('other');
  assert.deepEqual(await viewport(), clockViewport);
  await page.getByText('Navigation & filters', { exact: true }).click();
  await page.getByRole('button', { name: 'Major', exact: true }).click();
  assert.equal(await page.locator('[data-timeline-event="occ_0"]').count(), 0);
  assert.equal(await page.locator('[data-timeline-event="other-event"]').count(), 0);
  assert.ok(await page.locator('[data-timeline-event^="extra"]').count() > 0);
  assert.deepEqual(await viewport(), clockViewport);
  await page.getByRole('button', { name: 'Major', exact: true }).click();
  await page.getByText('Navigation & filters', { exact: true }).click();
  await tracksToggle().click();
  await page.locator('[data-track-control="other"]').getByRole('checkbox').uncheck();
  assert.equal(await page.getByRole('combobox', { name: 'Reference clock', exact: true }).inputValue(), 'clock');
  assert.deepEqual(await viewport(), clockViewport);
  await page.locator('[data-track-control="other"]').getByRole('checkbox').check();
  await tracksToggle().click();
  await page.getByRole('combobox', { name: 'Reference clock', exact: true }).selectOption('clock');
  await page.locator('[data-timeline-event="occ_0"]').focus();
  await page.keyboard.press('Enter');
  await visible(page.getByText('Source clock: World', { exact: true }));
  assert.equal(await page.locator('[data-comparison-guide]').count(), 2);
  assert.equal(await page.locator('[data-timeline-event="other-event"]').getAttribute('data-comparison-match'), 'true');
  await page.getByRole('button', { name: 'Collapse Other', exact: true }).click();
  assert.deepEqual(await viewport(), clockViewport);
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await page.getByRole('button', { name: 'Expand Other', exact: true }).click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await tracksToggle().click();
  await page.getByRole('button', { name: 'Inspect Other independently', exact: true }).click();
  await visible(page.getByText('Native inspection: Other', { exact: false }));
  await page.setViewportSize({ width: 1920, height: 1080 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'node_modules/.chronology-verification/workspace-ultrawide.png', fullPage: true });
  assert.equal(await page.locator('[data-comparison-guide]').count(), 0);
  const nativeBefore = await viewport();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').dataset.viewportSpan !== before[1], nativeBefore);
  const nativeViewport = await viewport();
  await page.getByRole('button', { name: 'Aligned comparison', exact: true }).click();
  assert.deepEqual(await viewport(), clockViewport);
  await tracksToggle().click();
  await page.getByRole('button', { name: 'Inspect Other independently', exact: true }).click();
  assert.deepEqual(await viewport(), nativeViewport);
  await page.getByRole('button', { name: 'Aligned comparison', exact: true }).click();
  await tracksToggle().click();
  await page.getByRole('button', { name: 'Reset View', exact: true }).click();
  await tracksToggle().click();
  assert.deepEqual(await page.locator('[data-timeline-track]').evaluateAll(els => els.map(el => el.dataset.timelineTrack)), ['clock']);
  assert.deepEqual(await viewport(), clockInitial);

  await page.goto('http://localhost:5199/__chronology?timeline&twoClocks&unaligned');
  await tracksToggle().click();
  await page.getByRole('button', { name: 'Show All', exact: true }).click();
  await tracksToggle().click();
  await visible(page.locator('[data-timeline-track="other"]').getByText(/Unaligned:/));
  assert.equal(await page.locator('[data-timeline-event="other-event"]').count(), 0);
  await page.locator('[data-timeline-track="other"]').getByRole('button', { name: 'Inspect Other independently' }).click();
  await page.locator('[data-timeline-event="other-event"]').focus();
  await page.keyboard.press('Enter');
  await visible(page.getByText('Source clock: Other', { exact: true }));
  assert.equal(await page.locator('[data-comparison-guide]').count(), 0);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('button', { name: 'Aligned comparison', exact: true }).click();
  assert.equal(await page.locator('[data-comparison-guide]').count(), 0);

  await page.goto('http://localhost:5199/__chronology?timeline&twoClocks&track=other&era=other-era');
  await page.locator('[data-timeline-track="other"]').waitFor();
  await visible(page.getByRole('link', { name: 'Age of discovery: read overview', exact: true }));
  assert.equal(await page.getByRole('combobox', { name: 'Reference clock', exact: true }).inputValue(), 'other');

  await page.goto('http://localhost:5199/__chronology?timeline&dense');
  await page.getByRole('button', { name: /overlapping events; open complete list/ }).click();
  const cluster = page.getByRole('complementary');
  assert.equal(await cluster.locator('li').count(), 34);
  await cluster.locator('li button').first().click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.screenshot({ path: 'node_modules/.chronology-verification/timeline-dense.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5199/__chronology?timeline&twoClocks');
  await tracksToggle().click();
  await page.getByRole('button', { name: 'Show All', exact: true }).click();
  await tracksToggle().click();
  assert.equal(await page.locator('[data-timeline-track]').count(), 2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const mobileComparisonViewport = await viewport();
  await page.getByRole('button', { name: 'Collapse World', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse Other', exact: true }).click();
  assert.deepEqual(await viewport(), mobileComparisonViewport);
  await page.getByRole('button', { name: 'Expand Other', exact: true }).click();
  await page.locator('[data-comparison-scroll]').evaluate(el => { el.scrollTop = 150; });
  const stickyAxisBox = await page.locator('[data-timeline-axis]').boundingBox();
  const scrollBox = await page.locator('[data-comparison-scroll]').boundingBox();
  assert.ok(stickyAxisBox.y >= scrollBox.y && stickyAxisBox.y <= scrollBox.y + 1);
  await page.screenshot({ path: 'node_modules/.chronology-verification/timeline-mobile-comparison.png', fullPage: true });
  await page.goto('http://localhost:5199/__chronology?timeline');
  await page.locator('[data-timeline-event="occ_0"]').focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: 'Event details', exact: true });
  await visible(sheet);
  const sheetBox = await sheet.boundingBox();
  assert.ok(sheetBox.y + sheetBox.height <= 845 && sheetBox.height <= 844 * .75 + 1);
  await sheet.getByRole('button', { name: 'Edit event', exact: true }).click();
  const mobileEditor = page.getByRole('dialog', { name: 'Edit event', exact: true });
  await visible(mobileEditor);
  assert.equal((await mobileEditor.boundingBox()).width, 390);
  assert.equal(await mobileEditor.getByText('Unsaved changes', { exact: true }).count(), 0);
  await mobileEditor.getByRole('button', { name: 'Close', exact: true }).click();
  await mobileEditor.waitFor({ state: 'detached' });
  await visible(sheet);
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  await page.locator('[data-timeline-event="occ_0"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Dismiss inspector', exact: true }).click({ position: { x: 10, y: 50 } });
  await sheet.waitFor({ state: 'detached' });
  const canvas = page.getByRole('region', { name: /Historical timeline/ });
  await canvas.focus();
  const mobileAxis = await axisText();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(50);
  assert.notEqual(await axisText(), mobileAxis);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByText('Navigation & filters', { exact: true }).click();
  const menuBox = await page.getByRole('combobox', { name: 'Category', exact: true }).boundingBox();
  assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= 390);
  await page.getByText('Navigation & filters', { exact: true }).click();
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const touchBefore = await axisText();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 220, y: 430, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 430, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').textContent !== before, touchBefore);
  assert.equal(await page.getByRole('dialog').count(), 0);
  const pinchBefore = await axisText();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y: 430, id: 1 }, { x: 240, y: 430, id: 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60, y: 430, id: 1 }, { x: 290, y: 430, id: 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').textContent !== before, pinchBefore);
  assert.equal(await page.getByRole('dialog').count(), 0);
  await touch.detach();
  await page.screenshot({ path: 'node_modules/.chronology-verification/timeline-mobile.png', fullPage: true });

  await page.goto('http://localhost:5199/__chronology?timeline&player');
  await page.locator('[data-timeline-event="occ_0"]').focus();
  await page.keyboard.press('Enter');
  await visible(page.getByRole('dialog', { name: 'Event details', exact: true }));
  assert.equal(await page.getByRole('button', { name: 'Edit event', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'New event', exact: true }).count(), 0);
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('http://localhost:5199/__chronology?timeline');
  await page.locator('[data-historical-timeline]').waitFor();
  assert.equal(await page.locator('[data-historical-timeline]').count(), 1);
  assert.equal(await page.getByRole('complementary').count(), 0);
  await page.screenshot({ path: 'node_modules/.chronology-verification/timeline-ultrawide.png', fullPage: true });
  // Pass 4: real Eras workspace, canonical editing, interval inspection and tab restoration.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('http://localhost:5199/__chronology?eras&twoClocks&truncated');
  await visible(page.getByRole('heading', { name: 'World history', exact: true }));
  await visible(page.getByRole('link', { name: 'Open Wiki overview' }));
  await visible(page.getByText('The crossing', { exact: true }));
  await visible(page.getByText(/historical coverage|history is incomplete/));
  assert.equal(await page.getByRole('heading', { name: 'Selected major events' }).count(), 1);
  const eraJourney = page.getByRole('button', { name: /The long journey.*Before 25/s });
  await eraJourney.click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await visible(page.getByRole('button', { name: 'Edit event', exact: true }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  assert.equal(await eraJourney.evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'Browse eras' }).click();
  await page.getByRole('button', { name: /Early discoveries.*Start|Early discoveries.*Year/s }).click();
  await visible(page.getByRole('heading', { name: 'Early discoveries' }));
  await visible(page.getByText('Mira', { exact: true }));
  await visible(page.getByText(/10 days/));
  await page.getByRole('button', { name: 'View on Timeline', exact: true }).click();
  await visible(page.locator('[data-historical-timeline]'));
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const eraViewport = () => page.locator('[data-timeline-axis]').evaluate(el => [el.dataset.viewportOrigin, el.dataset.viewportSpan]);
  await page.waitForTimeout(100);
  const savedView = await eraViewport();
  await page.getByRole('button', { name: 'Tracks (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Show All', exact: true }).click();
  await page.getByRole('button', { name: 'Move Other up', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse Other', exact: true }).click();
  await page.getByText('Navigation & filters', { exact: true }).click();
  await page.getByRole('button', { name: 'Notice', exact: true }).click();
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('uncategorized');
  await page.getByRole('button', { name: 'Eras tab', exact: true }).click();
  await page.getByRole('combobox', { name: 'Calendar', exact: true }).selectOption('other');
  await visible(page.getByRole('heading', { name: 'Age of discovery' }));
  await page.getByRole('button', { name: 'Timeline tab', exact: true }).click();
  await visible(page.locator('[data-historical-timeline]'));
  assert.deepEqual(await eraViewport(), savedView);
  assert.equal(await page.getByRole('button', { name: 'Expand Other', exact: true }).count(), 1);
  assert.deepEqual(await page.locator('[data-timeline-track]').evaluateAll(els => els.map(el => el.dataset.timelineTrack)), ['other', 'clock']);
  await page.getByText('Navigation & filters', { exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Notice', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('combobox', { name: 'Category', exact: true }).inputValue(), 'uncategorized');
  await page.getByRole('button', { name: 'Eras tab', exact: true }).click();
  await page.getByRole('button', { name: 'Compare on Timeline', exact: true }).click();
  await visible(page.locator('[data-timeline-track="other"]'));
  assert.equal(await page.getByRole('combobox', { name: /Reference/ }).inputValue(), 'clock');
  await page.waitForTimeout(100);
  const focused = await eraViewport();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.waitForTimeout(100);
  assert.notDeepEqual(await eraViewport(), focused);
  await page.getByRole('button', { name: 'Eras tab', exact: true }).click();
  await page.getByRole('button', { name: 'Compare on Timeline', exact: true }).click();
  await page.waitForTimeout(100);
  assert.deepEqual(await eraViewport(), focused);
  await page.getByRole('button', { name: 'Eras tab', exact: true }).click();
  await page.getByRole('combobox', { name: 'Calendar', exact: true }).selectOption('clock');
  await page.locator('details').filter({ hasText: 'Manage era' }).evaluate(el => { el.open = true; });
  await page.getByRole('button', { name: 'Edit era', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Age of shared stories');
  assert.match(await page.locator('[contenteditable="true"]').innerText(), /The crossing/);
  failSave = true;
  await page.getByRole('button', { name: 'Save era', exact: true }).click();
  await visible(page.getByRole('dialog').getByRole('alert'));
  failSave = false;
  await page.getByRole('button', { name: 'Save era', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await visible(page.getByRole('heading', { name: 'Age of shared stories' }));
  assert.equal(requests.at(-1).payload.overview, 'The crossing');
  await page.getByRole('button', { name: 'Create era', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Unbounded discoveries');
  await page.getByRole('button', { name: 'Save era', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Unbounded discoveries' }));
  await page.locator('details').filter({ hasText: 'Manage era' }).evaluate(el => { el.open = true; });
  await page.getByRole('button', { name: 'Delete era...', exact: true }).click();
  await visible(page.getByRole('dialog', { name: 'Delete era', exact: true }));
  await visible(page.getByText('Events and progression content will remain.', { exact: false }));
  await page.getByRole('button', { name: 'Delete era and Overview', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.notEqual(await page.getByRole('heading', { name: 'Unbounded discoveries' }).count(), 1);
  assert.equal(requests.at(-1).payload.confirmed, true);
  await page.screenshot({ path: 'node_modules/.chronology-verification/eras-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5199/__chronology?eras&player');
  await visible(page.getByRole('heading', { name: 'World history', exact: true }));
  await visible(page.getByRole('combobox', { name: 'Era', exact: true }));
  assert.equal(await page.getByRole('button', { name: 'Create era' }).count(), 0);
  assert.equal(await page.getByText('Manage era', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: /The long journey.*Before 25/s }).click();
  await visible(page.getByRole('dialog', { name: 'Event details', exact: true }));
  assert.equal(await page.getByRole('button', { name: 'Edit event', exact: true }).count(), 0);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'Era', exact: true }).selectOption('earlier-era');
  await visible(page.getByRole('heading', { name: 'Early discoveries' }));
  await page.screenshot({ path: 'node_modules/.chronology-verification/eras-mobile.png', fullPage: true });
  await page.goto('http://localhost:5199/__chronology?eras');
  await page.getByRole('button', { name: 'Create era', exact: true }).click();
  const mobileDialog = page.getByRole('dialog', { name: 'Add era', exact: true });
  await visible(mobileDialog);
  assert.equal(await mobileDialog.evaluate(el => Math.round(el.getBoundingClientRect().width)), 390);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Create era' }).evaluate(el => el === document.activeElement), true);
  await page.goto('http://localhost:5199/__chronology?eras&twoClocks&unaligned&track=other&era=other-era');
  await visible(page.getByRole('heading', { name: 'Age of discovery' }));
  assert.equal(await page.getByRole('button', { name: 'Compare on Timeline' }).count(), 0);
  await page.goto('http://localhost:5199/__chronology?eras&era=unavailable');
  await visible(page.getByText(/This era or calendar is unavailable/));
  // Pass 5: bounded reading feed, grouping without deduplication, navigation and source inspection.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('http://localhost:5199/__chronology?feed&capped');
  await visible(page.getByRole('heading', { name: 'Campaign history', exact: true }));
  assert.equal(await page.locator('[data-feed-entry]').count(), 7); // Grouping retains both effects and the separately collapsed undated record.
  await page.getByText('A season of discovery', { exact: false }).click();
  assert.equal(await page.locator('[data-feed-entry="effect-one"]').count(), 1);
  assert.equal(await page.locator('[data-feed-entry="effect-two"]').count(), 1);
  await page.getByRole('button', { name: 'The long journey', exact: true }).click();
  await visible(page.getByRole('complementary', { name: 'Event details', exact: true }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  assert.equal(await page.getByRole('button', { name: 'The long journey', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.getByText('Filter and group history', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Notice', exact: true }).uncheck();
  assert.equal(await page.locator('[data-feed-entry="notice"]').count(), 0);
  await page.getByRole('checkbox', { name: 'Notice', exact: true }).check();
  await page.getByRole('combobox', { name: 'Group by', exact: true }).selectOption('session');
  await visible(page.getByRole('heading', { name: 'Session 1', exact: true }));
  await page.getByRole('combobox', { name: 'Group by', exact: true }).selectOption('date');
  await page.getByRole('button', { name: 'Earlier', exact: true }).click();
  const earlierRange = new URL(page.url()).searchParams;
  assert.equal(BigInt(earlierRange.get('to')) - BigInt(earlierRange.get('from')), 30n * 1440n);
  assert.equal(await page.locator('[data-feed-entry="notice"]').count(), 0);
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  assert.equal(await page.locator('[data-feed-entry="notice"]').count(), 1);
  await page.getByRole('button', { name: 'Narrow range', exact: true }).click();
  assert.equal(BigInt(new URL(page.url()).searchParams.get('to')) - BigInt(new URL(page.url()).searchParams.get('from')), 15n * 1440n);
  await page.getByRole('button', { name: 'Choose historical range', exact: true }).click();
  await visible(page.getByRole('dialog', { name: 'Choose historical range', exact: true }));
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Choose historical range' }).evaluate(el => el === document.activeElement), true);
  await page.getByText('Coverage and source limitations', { exact: true }).click();
  await visible(page.getByText('Non-event progression artifacts require source adapters.', { exact: true }));
  await page.getByRole('button', { name: 'Manage history', exact: true }).click();
  await visible(page.getByRole('dialog', { name: 'Manage history', exact: true }));
  await page.keyboard.press('Escape');
  await page.getByText('Filter and group history', { exact: true }).click();
  await page.getByText('Coverage and source limitations', { exact: true }).click();
  await page.locator('[data-campaign-feed]').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: 'node_modules/.chronology-verification/feed-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5199/__chronology?feed&player');
  await visible(page.getByRole('heading', { name: 'Campaign history', exact: true }));
  assert.equal(await page.getByRole('button', { name: 'Manage history' }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'The long journey', exact: true }).click();
  await visible(page.getByRole('dialog', { name: 'Event details', exact: true }));
  assert.equal(await page.getByRole('button', { name: 'Edit event', exact: true }).count(), 0);
  await page.keyboard.press('Escape');
  await page.getByText('Undated (1)', { exact: true }).click();
  await visible(page.getByText('An undated discovery', { exact: true }));
  await page.locator('[data-campaign-feed]').evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: 'node_modules/.chronology-verification/feed-mobile.png', fullPage: true });
  // Pass 6: exercise the real page owner, URL history, restored sessions and authorized deep links.
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('http://localhost:5199/__chronology?workspace&view=calendar&keep=value');
  await page.getByRole('table', { name: 'Returning' }).waitFor();
  await page.getByRole('button', { name: 'Returning 10, today, 4 events', exact: true }).click();
  await page.getByRole('button', { name: /The long journey World history/ }).click();
  await page.getByRole('link', { name: 'Open on Timeline', exact: true }).click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  const targetUrl = new URL(page.url());
  assert.equal(targetUrl.searchParams.get('event'), 'journey');
  assert.equal(targetUrl.searchParams.get('occurrence'), '0');
  assert.equal(targetUrl.searchParams.get('at'), '34683');
  assert.equal(targetUrl.searchParams.get('keep'), 'value');
  await page.getByRole('link', { name: 'Open in Calendar', exact: true }).click();
  await page.getByRole('table', { name: 'Before' }).waitFor();
  await visible(page.getByRole('complementary').getByText('40 day(s)', { exact: true }));
  await page.reload();
  await page.getByRole('table', { name: 'Before' }).waitFor();
  await visible(page.getByRole('link', { name: 'Open on Timeline', exact: true }));
  await page.goBack();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await page.goForward();
  await page.getByRole('table', { name: 'Before' }).waitFor();
  // Header tabs carry an actively inspected occurrence into compatible representations.
  await page.getByRole('navigation', { name: 'Chronology views' }).getByRole('link', { name: 'Timeline', exact: true }).click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  const realViewport = () => page.locator('[data-timeline-axis]').evaluate(el => [el.dataset.viewportOrigin, el.dataset.viewportSpan]);
  const realBefore = await realViewport();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').dataset.viewportSpan !== before[1], realBefore);
  const realZoomed = await realViewport();
  const tabs = page.getByRole('navigation', { name: 'Chronology views' });
  await tabs.getByRole('link', { name: 'Calendar', exact: true }).click();
  await page.getByRole('table', { name: 'Before' }).waitFor();
  await tabs.getByRole('link', { name: 'Timeline', exact: true }).click();
  await page.locator('[data-timeline-axis]').waitFor();
  assert.deepEqual(await realViewport(), realZoomed);
  await tabs.getByRole('link', { name: 'Eras', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'World history', exact: true }));
  await page.getByRole('button', { name: 'View on Timeline', exact: true }).click();
  await page.locator('[data-timeline-axis]').waitFor();
  await page.getByRole('link', { name: 'World history: read overview', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'World history', exact: true }));
  await page.getByRole('button', { name: /The long journey.*Before 25/s }).click();
  await page.getByRole('link', { name: 'Open in Calendar', exact: true }).click();
  await page.getByRole('table', { name: 'Before' }).waitFor();
  await page.getByRole('link', { name: 'Open in Campaign Feed', exact: true }).click();
  await visible(page.getByRole('heading', { name: 'Campaign history', exact: true }));
  await page.waitForFunction(() => new URLSearchParams(location.search).get('from') === '34683');
  await page.getByRole('button', { name: 'Show this event', exact: true }).click();
  await page.getByRole('complementary', { name: 'Event details' }).getByRole('link', { name: 'Open on Timeline', exact: true }).click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.goto('http://localhost:5199/__chronology?workspace&view=timeline&focus=timeline&track=clock&event=extra0&occurrence=0&at=56283');
  await visible(page.getByText('This event is hidden by Timeline filters.', { exact: false }));
  await page.getByRole('button', { name: 'Show this event', exact: true }).click();
  await visible(page.getByRole('complementary').getByText('Milestone 0', { exact: true }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByText('Navigation & filters', { exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Notice', exact: true }).getAttribute('aria-pressed'), 'false');
  await page.goto('http://localhost:5199/__chronology?workspace&view=calendar&focus=calendar&track=clock&event=extra0&occurrence=0&at=56283');
  await visible(page.getByText('This event is hidden by Calendar filters.', { exact: false }));
  await page.getByRole('button', { name: 'Show this event', exact: true }).click();
  await visible(page.getByRole('link', { name: 'Open on Timeline', exact: true }));
  await page.goto('http://localhost:5199/__chronology?workspace&view=timeline&track=clock&event=journey&occurrence=999&at=34683');
  await visible(page.getByText('This historical target is unavailable in the loaded authorized history.', { exact: true }));
  assert.equal(await page.getByRole('complementary', { name: 'Event details' }).count(), 0);
  await page.goto('http://localhost:5199/__chronology?workspace&hidden&view=timeline&track=clock&event=journey&occurrence=0&at=34683');
  await visible(page.getByText('This historical target is unavailable in the loaded authorized history.', { exact: true }));
  assert.equal(await page.getByText('The long journey', { exact: true }).count(), 0);
  await page.goto('http://localhost:5199/__chronology?workspace&twoClocks&unaligned&view=calendar&track=other&date=1:0:30');
  await page.getByRole('table', { name: 'Long rain' }).waitFor();
  await page.getByRole('button', { name: /Neri discovers the archive/ }).last().click();
  await visible(page.getByText('Reference date unavailable; native dates are retained.', { exact: true }));
  await page.getByRole('link', { name: 'Open on Timeline', exact: true }).click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await visible(page.getByText('Native inspection: Other', { exact: false }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5199/__chronology?workspace&view=calendar&track=clock&event=journey&occurrence=0&at=34683&player');
  await visible(page.getByRole('dialog', { name: 'Selected day details' }));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.getByRole('button', { name: 'Edit event', exact: true }).count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await tabs.getByRole('link', { name: 'Calendar', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.screenshot({ path: 'node_modules/.chronology-verification/workspace-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'Chronology browser verification passed: Calendar, multi-clock Timeline, Eras, Campaign Feed, real workspace round trips, refresh and Back/Forward, exact occurrence targets, retained viewports, filter-aware reveal, unavailable/hidden targets, native-only clocks, shared inspectors/editors, keyboard focus, mobile/ultrawide layouts, and read-only permissions.',
  );
} finally {
  await page.screenshot({
    path: 'node_modules/.chronology-verification/final.png',
    fullPage: true,
  });
  await browser.close();
  await server.close();
}
