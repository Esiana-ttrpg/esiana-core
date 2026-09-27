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
  DEFAULT_APPEARANCE_PRESENTATION_ID,
  shouldShowPresentationSelector,
  type AppearanceDetailsViewModel,
  type AppearanceFormsViewModel,
  type EntityAppearanceViewModel,
} from '@/lib/entityAppearanceProjection';
import type { AppearanceGalleryEntry } from '@shared/appearanceMetadata';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEntryId = searchParams.get('appearance') ?? DEFAULT_APPEARANCE_PRESENTATION_ID;
  const selectPresentation = (id: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (id === DEFAULT_APPEARANCE_PRESENTATION_ID) next.delete('appearance');
      else next.set('appearance', id);
      return next;
    });
  };

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
  const hasAppearanceHero = Boolean(showDetails || showSelector);

  const descriptionText = presentation.description?.trim() ?? '';
  const hasDescription = Boolean(descriptionText);

  const hasPresentation = Boolean(presentation.presentation?.trim());
  const hasGender = Boolean(presentation.gender?.trim());
  const hasTags = presentation.tags.length > 0;
  const hasSupporting = hasPresentation || hasGender || hasTags;
  const differenceFields = [
    { label: 'At a glance', field: presentation.fields.atAGlance },
    { label: 'Build', field: presentation.fields.build },
    { label: 'Voice', field: presentation.fields.voice },
    { label: 'Presence', field: presentation.fields.presence },
    { label: 'Clothing motifs', field: presentation.fields.clothingMotifs },
    { label: 'Distinguishing features', field: presentation.fields.distinguishingFeatures },
    { label: 'Visible injuries', field: presentation.fields.visibleInjuries },
    { label: 'Description', field: presentation.fields.description },
    { label: 'Tags', field: presentation.fields.tags },
    { label: 'Gender', field: presentation.fields.gender },
    { label: 'Presentation', field: presentation.fields.presentation },
  ].flatMap(({ label, field }) => {
    if (field.source === 'default') return [];
    const rawValue = field.value;
    const value = Array.isArray(rawValue) ? rawValue.join(' · ') : rawValue;
    return [{ label, value: value || 'Intentionally blank' }];
  });

  return (
    <div className="space-y-6">
      {hasAppearanceHero ? (
        <EntityPageSection id="appearance-primary" title="Appearance" wikiFacts>
          <div className="space-y-4">
            {showSelector ? (
              <AppearancePresentationSelector
                presentations={presentationOptions}
                selectedId={effectiveSelectedId}
                onSelect={selectPresentation}
              />
            ) : null}

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-medium text-muted">Physical</h3>
                {showDetails && presentation.details ? (
                  <EntityWikiInfobox>
                    <AppearanceDetailsFactRows details={presentation.details} />
                  </EntityWikiInfobox>
                ) : null}
              </div>
              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-medium text-muted">Presentation</h3>
                <EntityWikiInfobox>
                  <EntityFactRowList>
                    {presentation.presentationType ? <EntityFactRow label="Presentation type"><EntityFactReadValue value={presentation.presentationType} /></EntityFactRow> : null}
                    {hasGender ? <EntityFactRow label="Gender / presentation"><EntityFactReadValue value={[presentation.gender, presentation.presentation].filter(Boolean).join(' · ')} /></EntityFactRow> : null}
                    {hasTags ? <EntityFactRow label="Tags"><EntityFactReadValue value={presentation.tags.join(' · ')} /></EntityFactRow> : null}
                  </EntityFactRowList>
                </EntityWikiInfobox>
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

      {differenceFields.length > 0 || presentation.fields.authorNotes.value ? (
        <EntityPageSection id="appearance-supporting" title="Additional details" wikiFacts>
          {differenceFields.length > 0 ? (
            <details className="border-t border-border/25 py-2">
              <summary className="cursor-pointer text-sm text-muted">How this appearance differs</summary>
              <dl className="mt-3 grid gap-2 text-sm">
                {differenceFields.map((field) => (
                  <div key={field.label} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                    <dt className="text-muted">{field.label}</dt>
                    <dd className="text-foreground">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
          {presentation.fields.authorNotes.value ? <details className="border-t border-border/25 py-2"><summary className="cursor-pointer text-sm text-muted">Author notes</summary><p className="mt-2 whitespace-pre-line text-sm">{presentation.fields.authorNotes.value}</p></details> : null}
        </EntityPageSection>
      ) : null}
    </div>
  );
}
