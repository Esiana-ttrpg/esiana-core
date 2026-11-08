import assert from 'node:assert/strict';

/** Run with the real-router PostgreSQL fixture and a Vite server proxying ADVENTURE_BROWSER_API_PORT. */
export async function runAcceptance({ url, handle, emptyHandle, cookies, pageId }) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [index, cookie] of cookies.entries()) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const split = cookie.indexOf('=');
      await context.addCookies([{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url }]);
      const page = await context.newPage();
      const failures = [];
      let partyActive = false;
      page.on('request', request => {
        const requestUrl = new URL(request.url());
        if (partyActive && /\/wiki\/(tree|adventure-hub|quests-hub|threads-hub|link-index|mention-targets)(?:\/|$)/.test(requestUrl.pathname) &&
          requestUrl.searchParams.get('previewAsPlayer') !== 'true') failures.push(`Missing Party audience: ${requestUrl.pathname}`);
      });
      page.on('response', response => {
        if (response.url().includes('previewAsPlayer=') && response.status() >= 500) failures.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(`${url}/campaigns/${handle}/adventures`, { waitUntil: 'networkidle' });
      console.log('Browser account', index, 'loaded');
      if (index < 2) {
        await page.getByRole('button', { name: 'Party', exact: true }).click();
        await page.getByText('Shared quest', { exact: true }).first().waitFor();
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark/);
        partyActive = true;
        await page.reload({ waitUntil: 'networkidle' });
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark/);
      }
      for (const view of ['quests', 'threads', ...(index < 2 ? ['scenes', 'storyboard'] : [])]) {
        await page.goto(`${url}/campaigns/${handle}/adventures?view=${view}`, { waitUntil: 'networkidle' });
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark|temporarily unavailable/);
      }
      if (index < 2) {
        await page.goto(`${url}/campaigns/${handle}/wiki/${pageId}`, { waitUntil: 'networkidle' });
        assert.match(await page.locator('body').innerText(), /Shared link source/);
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden landmark/);
        await page.goBack({ waitUntil: 'networkidle' });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'Mobile document must not overflow horizontally');
        if (index === 0) await page.screenshot({ path: '../artifacts/adventure-party-mobile.png', fullPage: true });
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement !== document.body), true);
        await page.setViewportSize({ width: 1440, height: 1000 });

        partyActive = false;
        await page.getByRole('button', { name: 'GM', exact: true }).click();
        await page.getByRole('button', { name: 'Party', exact: true }).click();
        partyActive = true;
        await page.waitForLoadState('networkidle');
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark/);
        await page.goto(`${url}/campaigns/${handle}/adventures?view=quests`, { waitUntil: 'networkidle' });
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        let intercepted;
        const pending = new Promise(resolve => { intercepted = resolve; });
        let completed;
        const delivered = new Promise(resolve => { completed = resolve; });
        await page.route('**/wiki/quests-hub/**', async route => {
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
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark/);
        release();
        await delivered;
        await page.getByText('Shared quest', { exact: true }).first().waitFor();
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark/);
        await page.unroute('**/wiki/quests-hub/**');
        await page.route('**/wiki/quests-hub/**', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Party fixture rejection' }) }));
        await page.reload({ waitUntil: 'networkidle' });
        assert.doesNotMatch(await page.locator('body').innerText(), /Hidden quest sentinel|Hidden landmark/);
        await page.unroute('**/wiki/quests-hub/**');
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByText('Shared quest', { exact: true }).first().waitFor();
      }
      partyActive = false;
      await page.goto(`${url}/campaigns/${emptyHandle}/adventures?view=quests`, { waitUntil: 'networkidle' });
      if (index < 2) {
        await page.getByRole('button', { name: 'Party', exact: true }).click();
        partyActive = true;
        await page.waitForLoadState('networkidle');
        assert.equal(await page.getByRole('button', { name: 'Party', exact: true }).getAttribute('aria-pressed'), 'true');
        const group = page.getByRole('group', { name: 'Adventure view perspective' });
        assert.equal(await group.count(), 1);
        partyActive = false;
        await group.getByRole('button', { name: 'GM', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: 'Party', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        assert.equal(await page.getByRole('button', { name: 'Party', exact: true }).getAttribute('aria-pressed'), 'true');
      }
      assert.doesNotMatch(await page.locator('body').innerText(), /temporarily unavailable|Unable to load campaign/);
      console.log('Browser account', index, 'passed populated and empty campaigns');
      assert.deepEqual(failures, []);
      await context.close();
    }
  } catch (error) { console.error(error); throw error; } finally { await browser.close(); }
}
