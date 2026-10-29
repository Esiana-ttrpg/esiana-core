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
          return 'export const useWiki=()=>({flatPages:[],can:()=>!new URLSearchParams(location.search).has("player")});export const useOptionalWiki=()=>null;';
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/__chronology')) return next();
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
page.on('pageerror', (e) => errors.push(e.message));
let failSave = false;
const requests = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
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
  await visible(page.getByRole('complementary', { name: 'Event details' }).getByText(/Before 25.*After 4/));
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
  const clockInitial = await axisText();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').textContent !== before, clockInitial);
  const clockViewport = await axisText();
  await page.getByRole('combobox', { name: 'Clock', exact: true }).selectOption('other');
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').textContent !== before, clockViewport);
  await page.getByRole('combobox', { name: 'Clock', exact: true }).selectOption('clock');
  await page.waitForFunction(before => document.querySelector('[data-timeline-axis]').textContent === before, clockViewport);

  await page.goto('http://localhost:5199/__chronology?timeline&dense');
  await page.getByRole('button', { name: /overlapping events; open complete list/ }).click();
  const cluster = page.getByRole('complementary');
  assert.equal(await cluster.locator('li').count(), 34);
  await cluster.locator('li button').first().click();
  await visible(page.getByRole('complementary', { name: 'Event details' }));
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.screenshot({ path: 'node_modules/.chronology-verification/timeline-dense.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
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
  assert.deepEqual(errors, []);
  console.log(
    'Chronology browser verification passed: Calendar, Timeline geometry and clusters, inspector switching/focus, viewport preservation, dirty/clean editor dismissal, mobile sheet and touch pan/pinch, and player permissions.',
  );
} finally {
  await page.screenshot({
    path: 'node_modules/.chronology-verification/final.png',
    fullPage: true,
  });
  await browser.close();
  await server.close();
}
