import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { metricUnavailable, metricValue } from '../../../../../shared/metricValue.js';
import {
  assembleArchetypes,
  normalizeArchetypeScores,
} from './assembleArchetypes.js';
import { PERSONAL_ARCHETYPE_IDS } from '../../../../../shared/statsTypes.js';

const allMeasured = Object.fromEntries(
  PERSONAL_ARCHETYPE_IDS.map((id) => [id, true]),
) as Record<(typeof PERSONAL_ARCHETYPE_IDS)[number], boolean>;

describe('normalizeArchetypeScores', () => {
  it('keeps measured zeros at zero without inventing equal shares', () => {
    const scores = normalizeArchetypeScores(
      {
        chronicler: 0,
        worldsmith: 0,
        cartographer: 0,
        timekeeper: 0,
        storyweaver: 0,
        adventurer: 0,
        wanderer: 0,
      },
      allMeasured,
    );
    assert.equal(scores.length, 7);
    assert.ok(scores.every((row) => row.availability === 'measured' && row.score === 0));
  });

  it('L1-normalizes measured axes and leaves unavailable axes null', () => {
    const measured = { ...allMeasured, timekeeper: false, storyweaver: false };
    const scores = normalizeArchetypeScores(
      {
        chronicler: 50,
        worldsmith: 25,
        cartographer: 25,
        timekeeper: 999,
        storyweaver: 999,
        adventurer: 0,
        wanderer: 0,
      },
      measured,
    );
    const measuredScores = scores.filter((row) => row.availability === 'measured');
    const total = measuredScores.reduce((sum, row) => sum + (row.score ?? 0), 0);
    assert.equal(Math.round(total * 10_000) / 10_000, 1);
    assert.equal(scores.find((row) => row.id === 'chronicler')?.score, 0.5);
    assert.equal(scores.find((row) => row.id === 'timekeeper')?.score, null);
    assert.equal(scores.find((row) => row.id === 'timekeeper')?.availability, 'unavailable');
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
    assert.equal(result.scores.length, 7);
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

  it('does not treat unavailable writing metrics as zero chronicler activity alone', () => {
    const result = assembleArchetypes({
      wordsAdded: metricUnavailable('not_yet_tracked'),
      pagesEdited: metricUnavailable('not_yet_tracked'),
      sessionMinutes: 0,
      worldbuilding: [],
      cartography: [
        {
          domain: 'maps',
          created: metricValue(1),
          periodCreated: metricValue(2),
          periodEdited: metricValue(0),
        },
      ],
      chronology: [],
      participation: [],
    });
    assert.equal(result?.dominantId, 'cartographer');
    assert.equal(
      result?.scores.find((row) => row.id === 'chronicler')?.availability,
      'unavailable',
    );
    assert.equal(result?.scores.find((row) => row.id === 'chronicler')?.score, null);
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
