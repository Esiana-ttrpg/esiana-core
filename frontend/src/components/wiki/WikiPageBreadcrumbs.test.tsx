import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { WikiPageBreadcrumbs } from './WikiPageBreadcrumbs';
import type { WikiTreeNode } from '@/types/wiki';

const wiki = vi.hoisted(() => ({ flatPages: [] as WikiTreeNode[] }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => wiki }));

const defaults = { campaignId: 'fixture', parentId: null, visibility: 'Party', featuredImageId: null, children: [], createdAt: '', updatedAt: '' };

const html = (id: string) => renderToStaticMarkup(<MemoryRouter><WikiPageBreadcrumbs campaignHandle="florence"
  crumbs={[{ id, title: 'An authored account' }, { id: 'child', title: 'Eyewitness notes' }]} /></MemoryRouter>);

describe('authored chronology wiki breadcrumbs', () => {
  it('keeps a known legacy event-page ID in the Events wiki workspace', () => {
    wiki.flatPages = [{ ...defaults, id: 'event-definition', title: 'An authored account', templateType: 'DEFAULT', workspace: 'EVENTS', pathKey: 'authored-account', metadata: { chronologyDocument: 'event' } }];
    const output = html('event-definition');
    expect(output).toContain('href="/campaigns/florence/event-pages/authored-account"');
    expect(output).not.toContain('href="/campaigns/florence/events/');
  });
  it('keeps known era documents in their wiki workspace', () => {
    wiki.flatPages = [{ ...defaults, id: 'era-document', title: 'An authored account', templateType: 'DEFAULT', workspace: 'ERAS', pathKey: 'authored-account', metadata: { chronologyDocument: 'era' } }];
    expect(html('era-document')).toContain('href="/campaigns/florence/era-pages/authored-account"');
  });
  it('retains chronology navigation for an unknown legacy event link', () => {
    wiki.flatPages = [];
    expect(html('event-definition')).toContain('href="/campaigns/florence/events/definition"');
  });
});
