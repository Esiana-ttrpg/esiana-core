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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    forms?.primaryEntry?.id ?? DEFAULT_APPEARANCE_PRESENTATION_ID,
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const previousLightboxOpenRef = useRef(false);
  useEffect(() => {
    const dialog = lightboxRef.current;
    if (lightboxOpen && dialog && !dialog.open) dialog.showModal();
  }, [lightboxOpen]);
  useEffect(() => {
    if (previousLightboxOpenRef.current && !lightboxOpen) expandButtonRef.current?.focus();
    previousLightboxOpenRef.current = lightboxOpen;
  }, [lightboxOpen]);

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
                <div className="relative w-fit shrink-0">
                  <img
                    key={presentation.selectedEntryId ?? 'default'}
                    src={portraitSrc}
                    alt=""
                    className="max-h-80 w-auto rounded-lg border border-border/40 object-cover shadow-sm transition-opacity duration-200"
                  />
                  <button
                    ref={expandButtonRef}
                    type="button"
                    className="absolute right-2 top-2 rounded-md border border-border/50 bg-surface/90 p-1.5 text-foreground shadow-sm hover:bg-elevated"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View full-size portrait"
                  >
                    <Maximize2 className="size-4" aria-hidden />
                  </button>
                </div>
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
      {lightboxOpen && portraitSrc ? (
        <dialog
          ref={lightboxRef}
          className="m-auto max-h-none max-w-none border-0 bg-transparent p-4 backdrop:bg-black/80"
          aria-label="Full-size portrait"
          onCancel={(event) => {
            event.preventDefault();
            setLightboxOpen(false);
          }}
          onClose={() => setLightboxOpen(false)}
        >
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setLightboxOpen(false);
            }}
          >
            <img src={portraitSrc} alt="" className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              autoFocus
              className="absolute right-4 top-4 rounded-md bg-surface p-2 text-foreground"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close full-size portrait"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
