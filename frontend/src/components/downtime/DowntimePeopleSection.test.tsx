import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { DowntimeHubPeoplePayload } from '@shared/downtimeHub';
import { DowntimePeopleSection } from './DowntimePeopleSection';

const data: DowntimeHubPeoplePayload = {
  people: [{
    id: 'person-1',
    characterPageId: 'character-1',
    characterName: 'Nyra',
    characterHref: '/campaigns/red-sands/characters/nyra',
    relationshipType: 'HIRELING',
    role: 'Scout',
    status: 'ACTIVE',
    assignment: null,
    compensation: { amount: null, currency: null, cadence: null, unpaid: true, label: 'Unpaid' },
    features: [],
    notes: null,
    startedAtEpochMinute: null,
    endedAtEpochMinute: null,
    canEdit: true,
  }],
  summary: { active: 1, assignedToProjects: 0, assignedToHavens: 0, unassigned: 1 },
  assignmentOptions: {
    havens: [{ id: 'haven-1', label: 'The Lantern House' }],
    projects: [{ id: 'project-1', label: 'Chart the Hollow Road' }],
  },
};

test('editors get a quick assignment dropdown with haven and project choices', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DowntimePeopleSection data={data} campaignHandle="red-sands" onChanged={() => undefined} />
    </MemoryRouter>,
  );

  assert.match(html, /aria-label="Assignment for Nyra"/);
  assert.match(html, /value="haven:haven-1">The Lantern House/);
  assert.match(html, /value="project:project-1">Chart the Hollow Road/);
  assert.match(html, /<span class="block text-xs text-muted">Unassigned<\/span>/);
});

test('editors retain a link to the current assignment beside the quick selector', () => {
  const assigned = {
    ...data,
    people: [{
      ...data.people[0]!,
      assignment: { kind: 'haven' as const, id: 'haven-1', label: 'The Lantern House', href: '/campaigns/red-sands/havens/the-lantern-house' },
    }],
  };
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <DowntimePeopleSection data={assigned} campaignHandle="red-sands" onChanged={() => undefined} />
    </MemoryRouter>,
  );

  assert.match(html, /href="\/campaigns\/red-sands\/havens\/the-lantern-house"/);
  assert.match(html, /View The Lantern House/);
});
