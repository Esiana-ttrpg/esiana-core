import {
  DEFAULT_PROGRESSION_SECTION,
  DEFAULT_SCENES_VIEW,
  PROGRESSION_SECTIONS,
  SCENES_VIEWS,
  resolveLegacyProgressionRedirect,
  type ProgressionSectionId,
  type ScenesViewId,
} from '@shared/progressionHub';
import { adventureViewHref } from '@/lib/adventureLayout';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';
import { readCampaignWorkspaceState } from '@/lib/workspacePersistence';

export {
  PROGRESSION_SECTIONS,
  DEFAULT_PROGRESSION_SECTION,
  SCENES_VIEWS,
  DEFAULT_SCENES_VIEW,
  type ProgressionSectionId,
  type ScenesViewId,
};

export function readProgressionSectionFromSearch(
  search: string,
  campaignHandle?: string,
): ProgressionSectionId {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  const legacy = resolveLegacyProgressionRedirect(section, params.get('view'));
  if (legacy?.destination === 'progression') return legacy.section;
  if (section && PROGRESSION_SECTIONS.some((s) => s.id === section)) {
    return section as ProgressionSectionId;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionSection;
    if (sticky && PROGRESSION_SECTIONS.some((s) => s.id === sticky)) {
      return sticky;
    }
  }
  return DEFAULT_PROGRESSION_SECTION;
}

/** @deprecated Scenes views moved to Adventure; kept for sticky migration. */
export function readScenesViewFromSearch(
  search: string,
  campaignHandle?: string,
): ScenesViewId {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (view && SCENES_VIEWS.some((s) => s.id === view)) {
    return view as ScenesViewId;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionScenesView;
    if (sticky && SCENES_VIEWS.some((s) => s.id === sticky)) {
      return sticky;
    }
  }
  return DEFAULT_SCENES_VIEW;
}

export function progressionSectionHref(
  basePath: string,
  section: ProgressionSectionId,
): string {
  const params = new URLSearchParams({ section });
  return `${basePath}?${params.toString()}`;
}

/**
 * Returns a replacement URL when legacy section params need redirecting.
 * Scenes / Session Prep / Storyboard aliases leave Progression for Adventure.
 */
export function resolveProgressionLegacyNavigateTarget(
  progressionBasePath: string,
  search: string,
  campaignHandle: string,
): string | null {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  const legacy = resolveLegacyProgressionRedirect(section, params.get('view'));
  if (!legacy) return null;

  if (legacy.destination === 'adventure') {
    return adventureViewHref(campaignAdventureHubPath(campaignHandle), legacy.view, {
      storyboardLens: legacy.storyboardLens,
    });
  }

  const isCanonical =
    section === legacy.section &&
    !['storyboard', 'sceneSequence', 'scene-timeline', 'sceneTimeline', 'trajectories', 'authoringWorkshop', 'scenes', 'sessionPrep', 'sessions'].includes(
      section ?? '',
    );
  if (isCanonical) return null;

  const next = new URLSearchParams();
  next.set('section', legacy.section);
  if (legacy.preserveSearchParams) {
    for (const key of ['authoringKind', 'anchors', 'overlays'] as const) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
  }
  return `${progressionBasePath}?${next.toString()}`;
}
