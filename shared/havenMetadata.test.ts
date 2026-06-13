import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHavenActivityEntry,
  createHavenReferenceEntry,
  createHavenSpaceEntry,
  createHavenUpgradeEntry,
  emptyDowntimeHavenFields,
  isEscalatingThreat,
  parseDowntimeHavenFields,
  parseHavenIdentityHints,
  parseHavenReferenceEntry,
  parseProjectHavenEffectPayload,
  sortActivityLogNewestFirst,
  sortHavenReferences,
} from './havenMetadata.js';

describe('havenMetadata', () => {
  it('defaults missing fields', () => {
    assert.deepEqual(parseDowntimeHavenFields(null), emptyDowntimeHavenFields());
  });

  it('parses identity and presence fields', () => {
    const fields = parseDowntimeHavenFields({
      havenType: 'ship',
      status: 'threatened',
      scale: 'modest',
      ownershipType: 'party',
      primaryTheme: 'smuggler',
      discoveryState: 'concealed',
      residentPageIds: ['char-1'],
      factionPageIds: ['org-1'],
      simulationHints: { prosperitySeed: 0.4 },
    });

    assert.equal(fields.havenType, 'ship');
    assert.equal(fields.status, 'threatened');
    assert.equal(fields.scale, 'modest');
    assert.equal(fields.ownershipType, 'party');
    assert.equal(fields.primaryTheme, 'smuggler');
    assert.equal(fields.discoveryState, 'concealed');
    assert.deepEqual(fields.residentPageIds, ['char-1']);
    assert.deepEqual(fields.simulationHints, { prosperitySeed: 0.4 });
  });

  it('parses activity log with origin and sourceProjectId', () => {
    const fields = parseDowntimeHavenFields({
      activityLog: [
        {
          summary: 'Smugglers arrived',
          origin: 'project_outcome',
          sourceProjectId: 'proj-1',
          tone: 'warning',
          atEpochMinute: '10080',
        },
      ],
    });

    assert.equal(fields.activityLog.length, 1);
    assert.equal(fields.activityLog[0]?.origin, 'project_outcome');
    assert.equal(fields.activityLog[0]?.sourceProjectId, 'proj-1');
  });

  it('sorts activity log newest first', () => {
    const sorted = sortActivityLogNewestFirst([
      createHavenActivityEntry({
        summary: 'Older',
        origin: 'manual',
        atEpochMinute: '100',
      }),
      createHavenActivityEntry({
        summary: 'Newer',
        origin: 'manual',
        atEpochMinute: '200',
      }),
    ]);

    assert.equal(sorted[0]?.summary, 'Newer');
  });

  it('detects escalating threats', () => {
    assert.equal(
      isEscalatingThreat({
        id: 't1',
        label: 'Watch',
        severity: 'rising',
        description: null,
        sinceEpochMinute: null,
      }),
      true,
    );
    assert.equal(
      isEscalatingThreat({
        id: 't2',
        label: 'Mild',
        severity: 'low',
        description: null,
        sinceEpochMinute: null,
      }),
      false,
    );
  });

  it('parses upgrade provenance fields', () => {
    const fields = parseDowntimeHavenFields({
      upgrades: [
        {
          label: 'Hidden smuggler docks',
          establishedByProjectId: 'proj-1',
          establishedByProjectTitle: 'Operation Black Tide',
        },
      ],
    });

    assert.equal(fields.upgrades[0]?.label, 'Hidden smuggler docks');
    assert.equal(fields.upgrades[0]?.establishedByProjectId, 'proj-1');
    assert.equal(fields.upgrades[0]?.establishedByProjectTitle, 'Operation Black Tide');
  });

  it('parses project haven effect payload', () => {
    const payload = parseProjectHavenEffectPayload({
      activitySummary: 'Dock completed',
      status: 'prosperous',
      upgrade: { label: 'East dock relay' },
      threat: { label: 'City watch suspicion', severity: 'rising' },
    });

    assert.equal(payload?.activitySummary, 'Dock completed');
    assert.equal(payload?.status, 'prosperous');
    assert.equal(payload?.upgrade?.label, 'East dock relay');
    assert.equal(payload?.threat?.severity, 'rising');
  });

  it('parses project haven effect payload with simulation deltas', () => {
    const payload = parseProjectHavenEffectPayload({
      activitySummary: 'Dock completed',
      simulationDeltas: { prosperity: 10, danger: -5, stability: 15 },
    });

    assert.equal(payload?.activitySummary, 'Dock completed');
    assert.equal(payload?.simulationDeltas?.prosperity, 10);
    assert.equal(payload?.simulationDeltas?.danger, -5);
    assert.equal(payload?.simulationDeltas?.stability, 15);
  });

  it('creates upgrade entry with provenance', () => {
    const upgrade = createHavenUpgradeEntry({
      label: 'Moonlit shrine',
      establishedByProjectId: 'proj-2',
      establishedByProjectTitle: 'Sanctify the ruins',
    });

    assert.equal(upgrade.establishedByProjectTitle, 'Sanctify the ruins');
  });

  it('parses identity hints and references', () => {
    const fields = parseDowntimeHavenFields({
      identityHints: {
        summary: 'A smuggler sanctuary on the coast',
        portraitAssetId: 'asset-portrait',
        galleryAssetIds: ['asset-1', 'asset-2'],
      },
      references: [
        {
          type: 'map',
          title: 'Citadel Floorplan',
          targetType: 'wiki_page',
          targetId: 'map-page-1',
          sortOrder: 1,
        },
        {
          type: 'external_doc',
          title: 'House Rules',
          targetType: 'external',
          url: 'https://example.com/rules',
          sortOrder: 0,
        },
      ],
      spaces: [{ label: 'War Room', description: 'Strategy table' }],
    });

    assert.equal(fields.identityHints.summary, 'A smuggler sanctuary on the coast');
    assert.equal(fields.identityHints.portraitAssetId, 'asset-portrait');
    assert.deepEqual(fields.identityHints.galleryAssetIds, ['asset-1', 'asset-2']);
    assert.equal(fields.references.length, 2);
    assert.equal(sortHavenReferences(fields.references)[0]?.title, 'House Rules');
    assert.equal(fields.spaces[0]?.label, 'War Room');
  });

  it('defaults identity hints when missing', () => {
    assert.deepEqual(parseHavenIdentityHints(null), {
      summary: null,
      portraitAssetId: null,
      crestAssetId: null,
      galleryAssetIds: [],
    });
  });

  it('rejects reference entries without title or target', () => {
    assert.equal(parseHavenReferenceEntry({ type: 'map' }, 0), null);
    const ref = createHavenReferenceEntry({
      type: 'rules',
      title: 'Teleport Circle Rules',
      targetType: 'wiki_page',
      targetId: 'rules-page',
    });
    assert.equal(ref.type, 'rules');
    assert.equal(ref.targetId, 'rules-page');
  });

  it('creates space entries', () => {
    const space = createHavenSpaceEntry({ label: 'Forge Wing', description: 'Smithy' });
    assert.equal(space.label, 'Forge Wing');
    assert.equal(space.description, 'Smithy');
  });
});
