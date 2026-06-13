import type { Response } from 'express';
import {
  AssetReferenceError,
  validateAppearanceAssetReferences,
  validateEnsembleBannerImageSave,
  validateHeroCoverImageSave,
  validateWikiBlocksAssetReferences,
} from '../../../shared/assetReferenceValidation.js';

export {
  AssetReferenceError,
  ASSET_REFERENCE_PREFIX,
  ASSET_REFERENCE_VALIDATION_MESSAGE,
  assertAssetReferenceUrl,
  coerceAssetReferenceUrl,
  isAssetReferenceUrl,
  normalizeAssetReferenceUrl,
  parseAssetReferenceId,
  validateAppearanceAssetReferences,
  validateEnsembleBannerImageSave,
  validateHeroCoverImageSave,
  validateImageDisplayBlockContent,
  validateWikiBlocksAssetReferences,
} from '../../../shared/assetReferenceValidation.js';

export function respondAssetReferenceValidationError(
  res: Response,
  error: unknown,
): boolean {
  if (error instanceof AssetReferenceError) {
    res.status(400).json({ error: error.message });
    return true;
  }
  return false;
}

export function assertStructuredImageFieldsOnSave(input: {
  hero?: unknown;
  ensemble?: unknown;
  appearance?: unknown;
  wikiBlocks?: unknown;
}): void {
  if (input.hero !== undefined) {
    validateHeroCoverImageSave(input.hero);
  }
  if (input.ensemble !== undefined) {
    validateEnsembleBannerImageSave(input.ensemble);
  }
  if (input.appearance !== undefined) {
    validateAppearanceAssetReferences(input.appearance);
  }
  if (input.wikiBlocks !== undefined) {
    validateWikiBlocksAssetReferences(input.wikiBlocks);
  }
}
