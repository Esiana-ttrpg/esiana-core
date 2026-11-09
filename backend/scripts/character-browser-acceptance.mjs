import assert from 'node:assert/strict';

export async function runCharacterAcceptance({ url, handle, emptyHandle, cookies, fixture }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const privateContent = /Hidden [\w -]*sentinel|Future character sentinel/;
  try {
    for (const [index, cookie] of cookies.entries()) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const split = cookie.indexOf('=');
      await context.addCookies([{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url }]);
      const page = await context.newPage();
      const failures = [];
      let partyActive = false;
      page.on('request', request => {
        const target = new URL(request.url());
        if (partyActive && /\/api\/campaigns\/[^/]+\/(wiki(?:\/|$)|workspace\/|entity-graph|downtime\/people\/by-character)/.test(target.pathname) &&
          request.method() === 'GET' && !target.pathname.includes('/wiki/pins') && target.searchParams.get('previewAsPlayer') !== 'true') {
          failures.push(`Missing audience: ${target.pathname}`);
        }
      });
      page.on('pageerror', error => failures.push(`Browser error: ${error.message}`));
      const clean = async () => assert.doesNotMatch(await page.locator('body').innerText(), privateContent);
      const cast = `${url}/campaigns/${handle}/characters`;
      const waitCast = () => page.getByRole('link', { name: /^Mira the navigator/ }).first().waitFor();
      await page.goto(cast, { waitUntil: 'networkidle' });
      await waitCast();
      if (index < 2) {
        assert.match(await page.locator('body').innerText(), /Hidden character sentinel/);
        await page.getByRole('group', { name: 'Character cast view perspective' }).getByRole('button', { name: 'Party', exact: true }).click();
        partyActive = true;
        await waitCast();
        await clean();
        assert.equal(await page.getByRole('button', { name: 'Party', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.reload({ waitUntil: 'networkidle' });
        await waitCast();
        await clean();
      } else {
        assert.equal(await page.getByRole('group', { name: 'Character cast view perspective' }).count(), 0);
        await clean();
      }
      await page.getByRole('link', { name: /^Mira the navigator/ }).first().click();
      await page.getByRole('heading', { name: 'Mira the navigator', exact: true }).waitFor();
      await page.waitForLoadState('networkidle');
      if (index < 2) {
        await clean();
        await page.getByText('Cartographer', { exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Party', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.getByRole('tab', { name: 'Shared voyages', exact: true }).click();
        await page.getByText('Shared voyage text', { exact: true }).waitFor();
        await clean();
        await page.goto(`${url}/campaigns/${handle}/wiki/${fixture.characterId}`, { waitUntil: 'networkidle' });
        await page.getByRole('heading', { name: 'Mira the navigator', exact: true }).waitFor();
        await clean();
        await page.reload({ waitUntil: 'networkidle' });
        await clean();
        await page.goto(`${url}/campaigns/${handle}/wiki/${fixture.hiddenCharacterId}`, { waitUntil: 'networkidle' });
        assert.match(await page.locator('body').innerText(), /Page not found/);
        await clean();
      }
      await page.goto(cast, { waitUntil: 'networkidle' });
      await waitCast();
      if (index < 2) {
        // Observe every rendered mutation during a late GM response, not just the
        // final screenshot. Only this deliberately delayed response is intercepted.
        await page.evaluate(() => {
          window.__characterLeaks = [];
          window.__characterObserver = new MutationObserver(() => {
            const text = document.body.innerText;
            const selected = document.querySelector('[aria-label="Character cast view perspective"] button[aria-pressed="true"]');
            if (selected?.textContent === 'Party' && /Hidden [\w -]*sentinel|Future character sentinel/.test(text)) window.__characterLeaks.push(text);
          });
        });
        let release, intercepted, completed;
        const gate = new Promise(resolve => { release = resolve; });
        const pending = new Promise(resolve => { intercepted = resolve; });
        const delivered = new Promise(resolve => { completed = resolve; });
        await page.route('**/wiki/character-hub/**', async route => {
          if (!route.request().url().includes('previewAsPlayer')) {
            const response = await route.fetch();
            intercepted();
            await gate;
            await route.fulfill({ response });
            completed();
          } else await route.continue();
        });
        partyActive = false;
        await page.getByRole('button', { name: 'GM', exact: true }).click();
        await pending;
        await page.getByRole('button', { name: 'Party', exact: true }).click();
        partyActive = true;
        await waitCast();
        release();
        await delivered;
        await page.waitForLoadState('networkidle');
        await clean();
        assert.deepEqual(await page.evaluate(() => window.__characterLeaks), []);
        await page.evaluate(() => window.__characterObserver.disconnect());
        await page.unroute('**/wiki/character-hub/**');
        await page.route('**/wiki/character-hub/**', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Party fixture rejection' }) }));
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByText('Party fixture rejection', { exact: true }).waitFor();
        await clean();
        await page.unroute('**/wiki/character-hub/**');
        await page.reload({ waitUntil: 'networkidle' });
        await waitCast();
        await page.setViewportSize({ width: 390, height: 844 });
        const closeContext = page.getByRole('button', { name: 'Close contextual panel', exact: true });
        if (await closeContext.isVisible()) await closeContext.click();
        await clean();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
        if (index === 0) await page.screenshot({ path: '../artifacts/character-party-mobile.png', fullPage: true });
        partyActive = false;
        await page.getByRole('button', { name: 'GM', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.getByText('Hidden character sentinel', { exact: true }).first().waitFor();
        await page.getByRole('button', { name: 'Party', exact: true }).focus();
        await page.keyboard.press('Enter');
        partyActive = true;
        await waitCast();
        await clean();
      }
      partyActive = false;
      await page.goto(`${url}/campaigns/${emptyHandle}/characters`, { waitUntil: 'networkidle' });
      if (index < 2) {
        await page.getByRole('button', { name: 'Party', exact: true }).click();
        await page.waitForLoadState('networkidle');
        assert.equal(await page.getByRole('button', { name: 'Party', exact: true }).getAttribute('aria-pressed'), 'true');
      }
      await clean();
      assert.doesNotMatch(await page.locator('body').innerText(), /temporarily unavailable|Unable to load campaign/);
      assert.deepEqual(failures, []);
      console.log(`Character browser account ${index}: populated/empty, navigation, perspective and mobile checks passed`);
      await context.close();
    }
  } finally { await browser.close(); }
}
