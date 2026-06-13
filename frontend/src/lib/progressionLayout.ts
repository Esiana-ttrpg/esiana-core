import {
  DEFAULT_PROGRESSION_SECTION,
  DEFAULT_SCENES_VIEW,
  PROGRESSION_SECTIONS,
  SCENES_VIEWS,
  resolveLegacyProgressionRedirect,
  type ProgressionSectionId,
  type ScenesViewId,
} from '@shared/progressionHub';
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
  const legacy = resolveLegacyProgressionRedirect(section);
  if (legacy) return legacy.section;
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

export function readScenesViewFromSearch(
  search: string,
  campaignHandle?: string,
): ScenesViewId {
  const params = new URLSearchParams(search);
  const legacy = resolveLegacyProgressionRedirect(params.get('section'));
  if (legacy?.view) return legacy.view;
  const view = params.get('view');
  if (view && SCENES_VIEWS.some((v) => v.id === view)) {
    return view as ScenesViewId;
  }
  if (campaignHandle) {
    const sticky = readCampaignWorkspaceState(campaignHandle).progressionScenesView;
    if (sticky && SCENES_VIEWS.some((v) => v.id === sticky)) {
      return sticky;
    }
  }
  return DEFAULT_SCENES_VIEW;
}

export function progressionSectionHref(
  basePath: string,
  section: ProgressionSectionId,
  options?: { view?: ScenesViewId },
): string {
  const params = new URLSearchParams({ section });
  if (options?.view) {
    params.set('view', options.view);
  }
  return `${basePath}?${params.toString()}`;
}

export function scenesViewHref(
  basePath: string,
  view: ScenesViewId,
): string {
  return progressionSectionHref(basePath, 'scenes', { view });
}

/** Returns a replacement URL when legacy section params need redirecting. */
export function resolveProgressionLegacyNavigateTarget(
  basePath: string,
  search: string,
): string | null {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  const legacy = resolveLegacyProgressionRedirect(section);
  if (!legacy) return null;

  const isCanonical =
    section === legacy.section &&
    (!legacy.view || params.get('view') === legacy.view) &&
    !['storyboard', 'sceneSequence', 'scene-timeline', 'sceneTimeline', 'trajectories', 'authoringWorkshop'].includes(
      section ?? '',
    );
  if (isCanonical) return null;

  const next = new URLSearchParams();
  next.set('section', legacy.section);
  if (legacy.view) {
    next.set('view', legacy.view);
  }
  if (legacy.preserveSearchParams) {
    for (const key of ['authoringKind', 'anchors', 'overlays'] as const) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
  }
  return `${basePath}?${next.toString()}`;
}
