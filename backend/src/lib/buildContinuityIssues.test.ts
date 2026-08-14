import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBrokenLinkIssues,
  buildUnresolvedWikilinkIssues,
  buildUnlinkedEntityIssue,
} from './buildContinuityIssues.js';

describe('buildContinuityIssues', () => {
  it('sets producer and scope on broken links', () => {
    const issues = buildBrokenLinkIssues('page1', [
      { targetPageId: '', label: 'Bring back the Kingdom Hearts' },
    ]);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].producer, 'link_integrity');
    assert.equal(issues[0].scope, 'local');
    assert.equal(issues[0].severity, 'critical');
    assert.equal(issues[0].type, 'broken_link');
    assert.match(issues[0].message, /Broken link/);
    assert.match(issues[0].message, /Kingdom Hearts/);
    assert.ok(issues[0].fingerprint.startsWith('broken_link:page1:'));
  });

  it('sets producer on unresolved wikilinks', () => {
    const issues = buildUnresolvedWikilinkIssues(
      [
        {
          sourcePageId: 'src',
          rawText: 'Sus Apple',
          normalizedText: 'sus apple',
        },
      ],
      'local',
    );
    assert.equal(issues[0].producer, 'wikilink_resolver');
    assert.match(issues[0].message, /Unresolved reference/);
    assert.equal(issues[0].fingerprint, 'unresolved_wikilink:src:sus apple');
  });

  it('uses character-friendly copy for unlinked character entity', () => {
    const issue = buildUnlinkedEntityIssue(
      {
        id: 'c1',
        title: 'Johnny Nior',
        templateType: 'DEFAULT',
        metadata: { entityCategory: 'characters' },
        inboundLinkCount: 0,
      },
      'local',
    );
    assert.ok(issue);
    assert.equal(issue.producer, 'unlinked_entity_scanner');
    assert.match(issue.message, /character/i);
    assert.doesNotMatch(issue.message, /orphan/i);
  });
});
