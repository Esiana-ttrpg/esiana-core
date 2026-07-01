import type { SemanticBlockType } from '@/lib/blockCapabilities';
import type { WikiPageBlockType } from '@/types/wiki';
import { characterAppearanceAdapter } from './adapters/characterAppearance';
import { characterHeroAdapter } from './adapters/characterHero';
import { characterLineageAdapter } from './adapters/characterLineage';
import { discoveryAdapter } from './adapters/discovery';
import { familyHeroAdapter } from './adapters/familyHero';
import { genericAdapter } from './adapters/generic';
import { infoboxAdapter } from './adapters/infobox';
import { locationHeroAdapter } from './adapters/locationHero';
import { narrativePropertiesAdapter } from './adapters/narrativeProperties';
import { ancestryHeroAdapter } from './adapters/ancestryHero';
import { bestiaryHeroAdapter } from './adapters/bestiaryHero';
import { orgHeroAdapter } from './adapters/orgHero';
import { proseBlockAdapter } from './adapters/prose';
import type {
  BlockSemanticIndex,
  BlockSemanticIndexAdapter,
  BlockSemanticIndexContext,
  GetBlockSemanticIndexOptions,
  PageBlockSemanticIndexEntry,
  RawBlockSemanticIndex,
} from './types';
import { emptyRawIndex, normalizeBlockSemanticIndex, normalizeKeywords } from './utils';
import type { WikiPageBlock } from '@/types/wiki';

export const semanticAdapterRegistry = {
  'entity-hero': characterHeroAdapter,
  'entity-org-hero': orgHeroAdapter,
  'entity-family-hero': familyHeroAdapter,
  'entity-location-hero': locationHeroAdapter,
  'entity-bestiary-hero': bestiaryHeroAdapter,
  'entity-ancestry-hero': ancestryHeroAdapter,
  'entity-thread-properties': narrativePropertiesAdapter,
  'entity-scene-properties': narrativePropertiesAdapter,
  'entity-quest-properties': narrativePropertiesAdapter,
  'entity-objective-properties': narrativePropertiesAdapter,
  'entity-arc-properties': narrativePropertiesAdapter,
  'entity-appearance': characterAppearanceAdapter,
  'entity-relationships': characterLineageAdapter,
  'entity-timeline': characterLineageAdapter,
  'entity-discovery': discoveryAdapter,
  'text-biography': proseBlockAdapter,
} satisfies Record<SemanticBlockType, BlockSemanticIndexAdapter>;

const extendedAdapterRegistry: Partial<Record<WikiPageBlockType, BlockSemanticIndexAdapter>> = {
  'text-tiptap': proseBlockAdapter,
  'wiki-infobox': infoboxAdapter,
  'wiki-backlinks': genericAdapter,
  'image-display': genericAdapter,
  'stat-block': genericAdapter,
  'entity-document': genericAdapter,
};

function resolveAdapter(blockType: WikiPageBlockType): BlockSemanticIndexAdapter {
  if (blockType in semanticAdapterRegistry) {
    return semanticAdapterRegistry[blockType as SemanticBlockType];
  }
  return extendedAdapterRegistry[blockType] ?? genericAdapter;
}

function runAdapterSafely(
  adapter: BlockSemanticIndexAdapter,
  ctx: BlockSemanticIndexContext,
): RawBlockSemanticIndex {
  try {
    return adapter(ctx) ?? emptyRawIndex();
  } catch {
    return emptyRawIndex();
  }
}

export function getBlockSemanticIndex(
  block: WikiPageBlock,
  pageMetadata?: unknown,
  options?: GetBlockSemanticIndexOptions,
): BlockSemanticIndex {
  const ctx: BlockSemanticIndexContext = {
    block,
    pageMetadata,
    templateType: options?.templateType,
    flatPages: options?.flatPages,
  };
  const adapter = resolveAdapter(block.type);
  const raw = runAdapterSafely(adapter, ctx);
  return normalizeBlockSemanticIndex(raw);
}

/** @deprecated Prefer getBlockSemanticIndex — kept for test and import stability. */
export function buildBlockSemanticIndex(
  block: WikiPageBlock,
  pageMetadata?: unknown,
  options?: GetBlockSemanticIndexOptions,
): BlockSemanticIndex {
  return getBlockSemanticIndex(block, pageMetadata, options);
}

export function buildPageSemanticIndex(
  blocks: WikiPageBlock[],
  options?: GetBlockSemanticIndexOptions & { pageMetadata?: unknown },
): PageBlockSemanticIndexEntry[] {
  const pageKeywords =
    options?.narrativeStatusLabel?.trim()
      ? normalizeKeywords([options.narrativeStatusLabel.trim()])
      : [];

  return blocks.map((block) => {
    const index = getBlockSemanticIndex(block, options?.pageMetadata, options);
    if (pageKeywords.length === 0) {
      return {
        blockId: block.id,
        blockType: block.type,
        ...index,
      };
    }
    const mergedKeywords = normalizeKeywords([
      ...index.semanticKeywords,
      ...pageKeywords,
    ]);
    return {
      blockId: block.id,
      blockType: block.type,
      ...index,
      semanticKeywords: mergedKeywords,
    };
  });
}

export { semanticAdapterRegistry as blockSemanticAdapterRegistry };
