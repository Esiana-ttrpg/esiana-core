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
  const asideBox = await page.getByRole('complementary').boundingBox();
  assert.ok(asideBox.y >= tableBox.y + tableBox.height);
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
  await page.getByRole('button', { name: 'New event', exact: true }).click();
  const dialogBox = await page.getByRole('dialog').boundingBox();
  assert.equal(dialogBox.width, 390);
  assert.equal(dialogBox.height, 844);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
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
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);
  console.log(
    'Chronology browser verification passed: grid, climate, durations, overflow, modal save/error/dirty guards, rich text, mobile and player permissions.',
  );
} finally {
  await page.screenshot({
    path: 'node_modules/.chronology-verification/final.png',
    fullPage: true,
  });
  await browser.close();
  await server.close();
}
