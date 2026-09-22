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
