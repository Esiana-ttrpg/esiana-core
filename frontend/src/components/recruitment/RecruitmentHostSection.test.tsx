import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { RecruitmentHostSection } from './RecruitmentHostSection.js';

test('renders the campaign owner separately with their avatar', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <RecruitmentHostSection
        host={{
          id: 'owner-1',
          displayName: 'Nyx Vale',
          username: 'nyx',
          label: 'Nyx Vale',
          avatarUrl: '/api/users/owner-1/avatar',
          publicBio: null,
          pronouns: 'she/they',
        }}
      />
    </MemoryRouter>,
  );

  assert.match(html, /Your DM/);
  assert.match(html, /src="\/api\/users\/owner-1\/avatar"/);
  assert.match(html, /Nyx Vale avatar/);
});

test('profile text is escaped and biography Markdown blocks executable URLs', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <RecruitmentHostSection
        host={{
          id: 'owner-1',
          displayName: '<img src=x onerror=alert(1)>',
          username: 'mira',
          label: '<img src=x onerror=alert(1)>',
          avatarUrl: null,
          pronouns: '<script>alert(1)</script>',
          publicBio: [
            '[unsafe](javascript:alert%281%29)',
            '[mixed](JaVaScRiPt:alert%281%29)',
            '[encoded](javascript&#58;alert%281%29)',
            '[data](data:text/html,hello)',
            '<script>alert(1)</script>',
            '[safe](https://example.com/story)',
          ].join('\n\n'),
        }}
      />
    </MemoryRouter>,
  );
  assert.doesNotMatch(html, /<script\b|<img src="?x|href="(?:javascript|data):/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example.com\/story"/);
  for (const label of ['unsafe', 'mixed', 'encoded', 'data']) {
    assert.match(html, new RegExp(`<a href="">${label}</a>`));
  }
});
