import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricValue } from '../../../../../shared/metricValue.js';
import {
  assembleArchetypes,
  normalizeArchetypeScores,
} from './assembleArchetypes.js';

describe('normalizeArchetypeScores', () => {
  it('returns an empty list when every raw score is zero', () => {
    assert.deepEqual(
      normalizeArchetypeScores({
        chronicler: 0,
        worldsmith: 0,
        cartographer: 0,
        timekeeper: 0,
        storyweaver: 0,
        adventurer: 0,
        wanderer: 0,
      }),
      [],
    );
  });

  it('L1-normalizes to four decimals that sum to 1', () => {
    const scores = normalizeArchetypeScores({
      chronicler: 50,
      worldsmith: 25,
      cartographer: 25,
      timekeeper: 0,
      storyweaver: 0,
      adventurer: 0,
      wanderer: 0,
    });
    const total = scores.reduce((sum, row) => sum + row.score, 0);
    assert.equal(Math.round(total * 10_000) / 10_000, 1);
    assert.equal(scores[0]?.id, 'chronicler');
    assert.equal(scores[0]?.score, 0.5);
  });
});

describe('assembleArchetypes', () => {
  it('favors chronicler when writing dominates the window', () => {
    const result = assembleArchetypes({
      wordsAdded: metricValue(400),
      pagesEdited: metricValue(10),
      sessionMinutes: 120,
      worldbuilding: [],
      cartography: [],
      chronology: [],
      participation: [],
    });
    assert.ok(result);
    assert.equal(result.rulesetVersion, 1);
    assert.equal(result.dominantId, 'chronicler');
    assert.ok((result.scores.find((row) => row.id === 'chronicler')?.score ?? 0) > 0.8);
  });

  it('favors cartographer when map activity dominates', () => {
    const result = assembleArchetypes({
      wordsAdded: metricValue(0),
      pagesEdited: metricValue(0),
      sessionMinutes: 0,
      worldbuilding: [],
      cartography: [
        {
          domain: 'maps',
          created: metricValue(1),
          periodCreated: metricValue(4),
          periodEdited: metricValue(6),
        },
      ],
      chronology: [],
      participation: [],
    });
    assert.equal(result?.dominantId, 'cartographer');
  });

  it('favors wanderer for cross-campaign participation', () => {
    const result = assembleArchetypes({
      wordsAdded: metricValue(0),
      pagesEdited: metricValue(0),
      sessionMinutes: 0,
      worldbuilding: [],
      cartography: [],
      chronology: [],
      participation: [
        {
          domain: 'campaignsParticipated',
          total: metricValue(5),
          periodTotal: metricValue(5),
        },
        {
          domain: 'campaignsGmed',
          total: metricValue(1),
          periodTotal: metricValue(1),
        },
        {
          domain: 'sessionsAttended',
          total: metricValue(0),
          periodTotal: metricValue(0),
        },
        {
          domain: 'sessionsHosted',
          total: metricValue(0),
          periodTotal: metricValue(0),
        },
      ],
    });
    assert.equal(result?.dominantId, 'wanderer');
  });

  it('returns null when the window has no measurable activity', () => {
    assert.equal(
      assembleArchetypes({
        wordsAdded: undefined,
        pagesEdited: undefined,
        sessionMinutes: 0,
        worldbuilding: [],
        cartography: [],
        chronology: [],
        participation: [],
      }),
      null,
    );
  });
});
