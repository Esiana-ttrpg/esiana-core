import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateSessionNotes,
  findProtectedMarkdownRanges,
  overlapsProtected,
  toAggregateNotesFromColumns,
} from './index.js';

describe('aggregateSessionNotes', () => {
  it('requires two distinct authors for a topic section', () => {
    const result = aggregateSessionNotes({
      rosterCount: 2,
      knownEntities: [],
      notes: [
        {
          noteId: 'n1',
          authorId: 'a1',
          markdown: 'We entered combat after the door opened.',
        },
      ],
    });
    assert.equal(result.topics.length, 0);
    assert.equal(result.otherPassages.length, 1);
    assert.equal(result.notesWithContent, 1);
  });

  it('creates a Combat topic when two authors mention fighting', () => {
    const result = aggregateSessionNotes({
      rosterCount: 3,
      knownEntities: [],
      notes: [
        {
          noteId: 'n1',
          authorId: 'belle',
          markdown: 'We entered combat after Varro opened the gate.',
        },
        {
          noteId: 'n2',
          authorId: 'jasmine',
          markdown: 'The fight started when the guards arrived.',
        },
      ],
    });
    assert.equal(result.topics.length, 1);
    assert.equal(result.topics[0]?.label, 'Combat');
    assert.equal(result.topics[0]?.passages.length, 2);
    assert.equal(result.otherPassages.length, 0);
  });

  it('prefers cross-author strength over entity topics', () => {
    const result = aggregateSessionNotes({
      rosterCount: 4,
      knownEntities: [
        { pageId: 'varro', title: 'Captain Varro', aliases: ['Varro'] },
      ],
      notes: [
        {
          noteId: 'n1',
          authorId: 'a',
          markdown: 'We fought Captain Varro at the keep.',
        },
        {
          noteId: 'n2',
          authorId: 'b',
          markdown: 'The battle with Captain Varro was brutal.',
        },
        {
          noteId: 'n3',
          authorId: 'c',
          markdown: 'During the combat Captain Varro fled.',
        },
        {
          noteId: 'n4',
          authorId: 'd',
          markdown: 'I only remember the fight, not much else.',
        },
      ],
    });
    assert.ok(result.topics.length >= 1);
    assert.equal(result.topics[0]?.label, 'Combat');
    // Each paragraph assigned once
    const passageCount = result.topics.reduce(
      (sum, t) => sum + t.passages.length,
      0,
    );
    assert.equal(passageCount + result.otherPassages.length, 4);
  });

  it('does not treat merchant alone as Shopping', () => {
    const result = aggregateSessionNotes({
      rosterCount: 2,
      knownEntities: [],
      notes: [
        {
          noteId: 'n1',
          authorId: 'a',
          markdown: 'We talked to the merchant about rumors.',
        },
        {
          noteId: 'n2',
          authorId: 'b',
          markdown: 'I spoke with the merchant as well.',
        },
      ],
    });
    const labels = result.topics.map((t) => t.label);
    assert.ok(labels.includes('Social'));
    assert.ok(!labels.includes('Shopping'));
  });

  it('classifies bought + merchant as Shopping when two authors match', () => {
    const result = aggregateSessionNotes({
      rosterCount: 2,
      knownEntities: [],
      notes: [
        {
          noteId: 'n1',
          authorId: 'a',
          markdown: 'We bought armor from the merchant.',
        },
        {
          noteId: 'n2',
          authorId: 'b',
          markdown: 'I purchased a shield at the same store.',
        },
      ],
    });
    assert.ok(result.topics.some((t) => t.label === 'Shopping'));
  });

  it('matches entity aliases and attaches detectedEntities', () => {
    const result = aggregateSessionNotes({
      rosterCount: 2,
      knownEntities: [
        { pageId: 'varro', title: 'Captain Varro', aliases: ['Varro'] },
      ],
      notes: [
        { noteId: 'n1', authorId: 'a', markdown: 'Varro smiled coldly.' },
        { noteId: 'n2', authorId: 'b', markdown: 'Varro knew too much.' },
      ],
    });
    assert.equal(result.topics[0]?.label, 'Captain Varro');
    assert.equal(result.topics[0]?.entityRef, 'varro');
    assert.ok(
      result.topics[0]?.passages[0]?.detectedEntities.some(
        (d) => d.pageId === 'varro',
      ),
    );
  });

  it('does not detect entities inside wiki-link or code spans', () => {
    const markdown =
      'See [[Captain Varro]] and `Captain Varro` but also plain Captain Varro nearby.';
    const protectedRanges = findProtectedMarkdownRanges(markdown);
    assert.ok(
      overlapsProtected(
        markdown.indexOf('[[Captain Varro]]'),
        markdown.indexOf('[[Captain Varro]]') + '[[Captain Varro]]'.length,
        protectedRanges,
      ),
    );
    assert.ok(
      overlapsProtected(
        markdown.indexOf('`Captain Varro`'),
        markdown.indexOf('`Captain Varro`') + '`Captain Varro`'.length,
        protectedRanges,
      ),
    );

    const result = aggregateSessionNotes({
      rosterCount: 2,
      knownEntities: [
        { pageId: 'varro', title: 'Captain Varro', aliases: [] },
      ],
      notes: [
        { noteId: 'n1', authorId: 'a', markdown },
        {
          noteId: 'n2',
          authorId: 'b',
          markdown: 'Captain Varro was waiting outside.',
        },
      ],
    });

    const n1Passage = result.topics
      .flatMap((t) => t.passages)
      .find((p) => p.noteId === 'n1');
    assert.ok(n1Passage);
    assert.equal(n1Passage.detectedEntities.length, 1);
    const only = n1Passage.detectedEntities[0]!;
    assert.equal(markdown.slice(only.start, only.end), 'Captain Varro');
    assert.equal(
      markdown.slice(only.start, only.end),
      markdown.match(/plain (Captain Varro)/)?.[1],
    );
  });

  it('drops topics with fewer than two assigned authors after primary pick', () => {
    const result = aggregateSessionNotes({
      rosterCount: 3,
      knownEntities: [
        { pageId: 'varro', title: 'Captain Varro', aliases: [] },
      ],
      notes: [
        {
          noteId: 'n1',
          authorId: 'a',
          markdown: 'We entered combat.',
        },
        {
          noteId: 'n2',
          authorId: 'b',
          markdown: 'Captain Varro was scary.',
        },
        {
          noteId: 'n3',
          authorId: 'c',
          markdown: 'The battle with Captain Varro was brutal.',
        },
      ],
    });

    const labels = result.topics.map((t) => t.label);
    assert.ok(!labels.includes('Combat'));
    assert.ok(labels.includes('Captain Varro'));
    assert.equal(result.otherPassages.length, 1);
    assert.equal(result.otherPassages[0]?.authorId, 'a');
  });

  it('assigns each paragraph to exactly one primary topic', () => {
    const result = aggregateSessionNotes({
      rosterCount: 2,
      knownEntities: [
        { pageId: 'varro', title: 'Captain Varro', aliases: [] },
        { pageId: 'gate', title: 'Western Gate', aliases: [] },
      ],
      notes: [
        {
          noteId: 'n1',
          authorId: 'a',
          markdown:
            'We fought Captain Varro at the Western Gate and recovered the treasure.',
        },
        {
          noteId: 'n2',
          authorId: 'b',
          markdown:
            'The battle with Captain Varro near the Western Gate yielded loot.',
        },
      ],
    });
    const assigned = result.topics.reduce(
      (sum, t) => sum + t.passages.length,
      0,
    );
    assert.equal(assigned + result.otherPassages.length, 2);
    assert.equal(assigned, 2);
  });
});

describe('toAggregateNotesFromColumns', () => {
  it('excludes DM_Only notes even when not masked', () => {
    const notes = toAggregateNotesFromColumns([
      {
        userId: 'dm',
        pageId: 'dm-page',
        markdown: 'secret combat notes',
        visibility: 'DM_Only',
        masked: false,
        hasNotes: true,
      },
      {
        userId: 'p',
        pageId: 'p-page',
        markdown: 'we fought hard',
        visibility: 'Party',
        masked: false,
        hasNotes: true,
      },
    ]);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.noteId, 'p-page');
  });
});
