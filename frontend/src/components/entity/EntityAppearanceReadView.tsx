import { AppearancePresentationSelector } from '@/components/entity/appearance/AppearancePresentationSelector';
import { AppearanceDetailsFactRows } from '@/components/entity/appearance/AppearanceDetailsWidget';
import { EntityPageSection } from '@/components/entity/shells/EntityPageSection';
import {
  EntityFactReadValue,
  EntityFactRow,
  EntityFactRowList,
  EntityWikiInfobox,
} from '@/components/entity/shells/EntityFactRow';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import {
  listAppearancePresentations,
  projectAppearancePresentation,
  resolveSelectedGalleryEntry,
  shouldShowPresentationSelector,
  type AppearanceDetailsViewModel,
  type AppearanceFormsViewModel,
  type EntityAppearanceViewModel,
} from '@/lib/entityAppearanceProjection';
import type { AppearanceGalleryEntry } from '@shared/appearanceMetadata';
import { useMemo, useState } from 'react';

interface EntityAppearanceReadViewProps {
  appearance: EntityAppearanceViewModel;
  forms?: AppearanceFormsViewModel;
  details?: AppearanceDetailsViewModel;
  appearanceCapabilities?: AppearanceCapabilities;
  /** @deprecated Portrait size is unified in the primary appearance section. */
  prominentPortrait?: boolean;
  filterFormEntries?: (entry: AppearanceGalleryEntry) => boolean;
}

export function EntityAppearanceReadView({
  appearance,
  forms,
  details,
  appearanceCapabilities = { forms: true, details: true, discoveryVariants: false },
  filterFormEntries,
}: EntityAppearanceReadViewProps) {
  const initialEntryId =
    resolveSelectedGalleryEntry(forms ?? { entries: [], primaryEntry: null, hasContent: false }, null)
      ?.id ?? null;

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialEntryId);

  const presentation = useMemo(
    () =>
      projectAppearancePresentation({
        appearance,
        forms: forms ?? { entries: [], primaryEntry: null, hasContent: false },
        details,
        selectedEntryId,
        detailsCapability: appearanceCapabilities.details,
        filterEntries: filterFormEntries,
      }),
    [
      appearance,
      forms,
      details,
      selectedEntryId,
      appearanceCapabilities.details,
      filterFormEntries,
    ],
  );

  const presentationOptions = useMemo(
    () =>
      forms
        ? listAppearancePresentations(forms, filterFormEntries)
        : [],
    [forms, filterFormEntries],
  );

  const showSelector = forms
    ? shouldShowPresentationSelector(forms, appearanceCapabilities.forms, filterFormEntries)
    : false;

  const effectiveSelectedId =
    presentation.selectedEntryId ?? presentationOptions[0]?.id ?? '';

  const showDetails = Boolean(presentation.details?.hasContent);
  const portraitSrc = presentation.portraitUrl?.trim() || null;
  const hasAppearanceHero = Boolean(portraitSrc || showDetails || showSelector);

  const descriptionText = presentation.description?.trim() ?? '';
  const hasDescription = Boolean(descriptionText);

  const hasPresentation = Boolean(presentation.presentation?.trim());
  const hasGender = Boolean(presentation.gender?.trim());
  const hasTags = presentation.tags.length > 0;
  const hasSupporting = hasPresentation || hasGender || hasTags;

  return (
    <div className="space-y-6">
      {hasAppearanceHero ? (
        <EntityPageSection id="appearance-primary" title="Appearance" wikiFacts>
          <div className="space-y-4">
            {showSelector ? (
              <AppearancePresentationSelector
                presentations={presentationOptions}
                selectedId={effectiveSelectedId}
                onSelect={setSelectedEntryId}
              />
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              {portraitSrc ? (
                <img
                  key={presentation.selectedEntryId ?? 'default'}
                  src={portraitSrc}
                  alt=""
                  className="max-h-80 w-auto shrink-0 rounded-lg border border-border/40 object-cover shadow-sm transition-opacity duration-200"
                />
              ) : null}

              <div className="min-w-0 flex-1 sm:max-w-md">
                {showDetails && presentation.details ? (
                  <EntityWikiInfobox>
                    <AppearanceDetailsFactRows details={presentation.details} />
                  </EntityWikiInfobox>
                ) : null}
              </div>
            </div>
          </div>
        </EntityPageSection>
      ) : null}

      {hasDescription ? (
        <EntityPageSection id="appearance-description" title="Description" dominant>
          <p className="wiki-reader-prose whitespace-pre-line text-sm leading-relaxed text-foreground">
            {descriptionText}
          </p>
        </EntityPageSection>
      ) : null}

      {hasSupporting ? (
        <EntityPageSection id="appearance-supporting" title="Notes" wikiFacts>
          <EntityWikiInfobox className="max-w-md">
            <EntityFactRowList>
              {hasPresentation ? (
                <EntityFactRow label="Presentation">
                  <EntityFactReadValue value={presentation.presentation} />
                </EntityFactRow>
              ) : null}
              {hasGender ? (
                <EntityFactRow label="Gender">
                  <EntityFactReadValue value={presentation.gender} />
                </EntityFactRow>
              ) : null}
            </EntityFactRowList>
          </EntityWikiInfobox>
          {hasTags ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {presentation.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/40 bg-elevated/60 px-2.5 py-0.5 text-xs text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </EntityPageSection>
      ) : null}
    </div>
  );
}
