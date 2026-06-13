import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  frontMatterFieldsToMetadata,
  metadataToFrontMatterFields,
  resolveAppearanceAssetRefs,
  resolvePageMetadataSlugRefs,
  packSlugRef,
  packAssetRef,
} from './pageMetadataRoundTrip.js';
import { frontMatterToMetadata } from './campaignBackupRestore.js';
import { parseMarkdownFrontMatter } from './markdownFrontMatter.js';
import { parseCharacterMetadata } from './characterMetadata.js';

describe('pageMetadataRoundTrip', () => {
  it('round-trips character appearance with gallery forms', () => {
    const metadata = {
      entityCategory: 'characters',
      templateType: 'CHARACTER',
      profession: 'Student',
      activeArc: 'Hide the curse',
      partyParticipation: { active: true, role: 'PLAYER_CHARACTER' },
      appearance: {
        summary: 'Quiet student',
        pronouns: 'she/her',
        gallery: {
          entries: [
            {
              id: 'civilian',
              label: 'Civilian Form',
              imageUrl: '',
              presentationType: 'default',
              presentationNotes: 'School uniform',
              tags: [],
              timelinePin: null,
              imageCredit: null,
            },
            {
              id: 'magical',
              label: 'Magical Form',
              imageUrl: '',
              presentationType: 'transformation',
              presentationNotes: 'Moonlit armor',
              tags: ['radiant'],
              timelinePin: null,
              imageCredit: null,
            },
          ],
        },
      },
    };

    const fm = metadataToFrontMatterFields(metadata);
    const restored = frontMatterFieldsToMetadata(fm);

    assert.equal(restored.profession, 'Student');
    assert.equal(restored.activeArc, 'Hide the curse');
    const party = restored.partyParticipation as { active: boolean; role: string };
    assert.equal(party.active, true);
    const appearance = restored.appearance as { gallery: { entries: unknown[] } };
    assert.equal(appearance.gallery.entries.length, 2);
  });

  it('round-trips codex custom fields via fields JSON', () => {
    const metadata = {
      entityCategory: 'characters',
      fields: [{ key: 'Favorite Color', value: 'silver' }],
    };
    const fm = metadataToFrontMatterFields(metadata);
    const restored = frontMatterFieldsToMetadata(fm);
    const fields = restored.fields as Array<{ key: string; value: string }>;
    assert.equal(fields[0]?.key, 'Favorite Color');
    assert.equal(fields[0]?.value, 'silver');
  });

  it('round-trips havenFields metadata through backup frontmatter sidecars', () => {
    const metadata = {
      entityCategory: 'locations',
      templateType: 'DOWNTIME_HAVEN',
      havenFields: {
        havenType: 'sanctuary',
        status: 'prosperous',
        primaryTheme: 'refuge',
      },
    };
    const fm = metadataToFrontMatterFields(metadata);
    const restored = frontMatterToMetadata(fm);
    assert.ok(restored);
    const havenFields = restored!.havenFields as {
      havenType: string;
      status: string;
    };
    assert.equal(havenFields.havenType, 'sanctuary');
    assert.equal(havenFields.status, 'prosperous');
  });

  it('round-trips projectFields metadata through backup frontmatter sidecars', () => {
    const metadata = {
      entityCategory: 'projects',
      templateType: 'DOWNTIME_PROJECT',
      projectFields: {
        projectType: 'research',
        status: 'ACTIVE',
        priority: 'high',
      },
    };
    const fm = metadataToFrontMatterFields(metadata);
    const restored = frontMatterToMetadata(fm);
    assert.ok(restored);
    const projectFields = restored!.projectFields as {
      projectType: string;
      status: string;
    };
    assert.equal(projectFields.projectType, 'research');
    assert.equal(projectFields.status, 'ACTIVE');
  });

  it('resolves slug refs in metadata', () => {
    const slugMap = new Map([['quest-1', 'uuid-quest']]);
    const resolved = resolvePageMetadataSlugRefs(
      { questGiverId: packSlugRef('quest-1') },
      slugMap,
    );
    assert.equal(resolved.questGiverId, 'uuid-quest');
  });

  it('parses double-encoded GbM partyParticipation frontmatter', () => {
    const raw = `---
title: "Test PC"
slug: "pc-test"
partyParticipation: "{\\"active\\":true,\\"role\\":\\"PLAYER_CHARACTER\\"}"
---
# Test PC
`;
    const parsed = parseMarkdownFrontMatter(raw);
    const metadata = frontMatterFieldsToMetadata(parsed.frontMatter.customFields);
    const identity = parseCharacterMetadata(metadata);
    assert.equal(identity.partyParticipation.active, true);
    assert.equal(identity.partyParticipation.role, 'PLAYER_CHARACTER');
  });

  it('parses single-quoted JSON partyParticipation from pack generator', () => {
    const raw = `---
title: "Test PC"
slug: "pc-test"
partyParticipation: '{"active":true,"role":"PLAYER_CHARACTER"}'
---
# Test PC
`;
    const parsed = parseMarkdownFrontMatter(raw);
    const metadata = frontMatterFieldsToMetadata(parsed.frontMatter.customFields);
    const identity = parseCharacterMetadata(metadata);
    assert.equal(identity.partyParticipation.active, true);
  });

  it('resolves appearance asset refs', () => {
    const assetMap = new Map([['portraits/hero.webp', 'asset-uuid']]);
    const resolved = resolveAppearanceAssetRefs(
      {
        portraitUrl: packAssetRef('portraits/hero.webp'),
        gallery: { entries: [] },
      },
      assetMap,
    ) as { portraitUrl: string };
    assert.equal(resolved.portraitUrl, '/api/assets/asset-uuid');
  });
});
