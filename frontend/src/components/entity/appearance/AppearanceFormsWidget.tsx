import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useRef, useState } from 'react';
import { ImageCreditEditor } from '@/components/media/ImageCreditEditor';
import type {
  AppearanceGalleryEntry,
  AppearanceGalleryState,
  AppearancePresentationType,
} from '@shared/appearanceMetadata';
import {
  APPEARANCE_PRESENTATION_TYPE_LABELS,
  APPEARANCE_PRESENTATION_TYPES,
  emptyGalleryEntryOverlays,
  enforceSinglePrimaryInEditor,
} from '@shared/appearanceMetadata';
import type { AppearanceFormsViewModel } from '@/lib/entityAppearanceProjection';
import { resolveAlternateGalleryEntries } from '@/lib/entityAppearanceProjection';
import { getAppearanceFieldGuidance } from '@/lib/appearanceFieldGuidance';
import { AppearanceFieldLabel } from './AppearanceFieldLabel';
import {
  appearanceFieldClass,
  formatCommaList,
  parseCommaList,
  parseCommaListDraft,
  SectionLabel,
} from './appearanceShared';
import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

function PresentationTypeBadge({ type }: { type?: AppearancePresentationType }) {
  if (!type || type === 'default') return null;
  return (
    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
      {APPEARANCE_PRESENTATION_TYPE_LABELS[type]}
    </span>
  );
}

interface AppearanceFormsReadProps {
  forms: AppearanceFormsViewModel;
  filterEntries?: (entry: AppearanceGalleryEntry) => boolean;
  /** When true, only non-primary entries — used under the Appearances section. */
  alternatesOnly?: boolean;
}

function AlternateAppearanceCard({ entry }: { entry: AppearanceGalleryEntry }) {
  return (
    <article className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">{entry.label}</h3>
        <PresentationTypeBadge type={entry.presentationType} />
      </div>
      {entry.imageUrl.trim() ? (
        <img
          src={entry.imageUrl}
          alt=""
          className="max-h-48 w-auto rounded-lg border border-border/40 object-cover shadow-sm"
        />
      ) : null}
      {entry.presentationNotes?.trim() ? (
        <p className="wiki-reader-prose text-sm leading-relaxed text-foreground">
          {entry.presentationNotes}
        </p>
      ) : null}
      {entry.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/40 bg-elevated/60 px-2 py-0.5 text-xs text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function AppearanceFormsReadView({
  forms,
  filterEntries,
  alternatesOnly = false,
}: AppearanceFormsReadProps) {
  const entries = alternatesOnly
    ? resolveAlternateGalleryEntries(forms.entries, forms.primaryEntry, filterEntries)
    : filterEntries
      ? forms.entries.filter(filterEntries)
      : forms.entries;

  if (entries.length === 0) return null;

  if (alternatesOnly) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        {entries.map((entry) => (
          <AlternateAppearanceCard key={entry.id} entry={entry} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {entries.map((entry) => (
        <AlternateAppearanceCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

interface AppearanceFormsEditorProps {
  campaignHandle?: string;
  gallery: AppearanceGalleryState;
  onChange: (gallery: AppearanceGalleryState) => void;
  onPersist: (gallery: AppearanceGalleryState) => void;
}

function newGalleryEntryId(): string {
  return crypto.randomUUID();
}

function EntryPortraitEditor({
  campaignHandle,
  imageUrl,
  imageCredit,
  onImageUrlChange,
  onImageCreditChange,
  onPersist,
}: {
  campaignHandle?: string;
  imageUrl: string;
  imageCredit: AppearanceGalleryEntry['imageCredit'];
  onImageUrlChange: (url: string) => void;
  onImageCreditChange: (credit: AppearanceGalleryEntry['imageCredit']) => void;
  onPersist: () => void;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="grid gap-2">
      {imageUrl.trim() ? (
        <img
          src={imageUrl}
          alt=""
          className="max-h-24 w-auto rounded-lg border border-border/40 object-cover shadow-sm"
        />
      ) : null}
      <button
        type="button"
        onClick={() => setToolsOpen((open) => !open)}
        className="flex w-fit items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground"
        aria-expanded={toolsOpen}
      >
        {toolsOpen ? (
          <ChevronDown className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        )}
        {toolsOpen ? 'Hide portrait tools' : 'Edit portrait or attribution'}
      </button>
      {toolsOpen ? (
        campaignHandle ? (
          <>
            <ImportImageUrlField
              campaignHandle={campaignHandle}
              value={imageUrl}
              inputClassName={appearanceFieldClass}
              suppressPreview
              onChange={onImageUrlChange}
              onImported={async () => {
                onPersist();
              }}
            />
            <ImageCreditEditor
              value={imageCredit}
              onChange={onImageCreditChange}
              onPersist={onPersist}
              inputClassName={appearanceFieldClass}
            />
          </>
        ) : (
          <p className="text-[10px] text-muted">
            Gallery portraits require campaign context to import.
          </p>
        )
      ) : null}
    </div>
  );
}

interface AppearanceEntryEditorCardProps {
  entry: AppearanceGalleryEntry;
  campaignHandle?: string;
  highlighted: boolean;
  onPatch: (patch: Partial<AppearanceGalleryEntry>, persist?: boolean) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
  onPersist: () => void;
}

function AppearanceEntryEditorCard({
  entry,
  campaignHandle,
  highlighted,
  onPatch,
  onRemove,
  onSetPrimary,
  onPersist,
}: AppearanceEntryEditorCardProps) {
  return (
    <div
      id={`form-entry-${entry.id}`}
      className={`space-y-4 rounded-lg border bg-surface/20 p-3 transition-shadow ${
        highlighted ? 'border-primary/50 ring-2 ring-primary/25' : 'border-border/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex flex-1 items-center gap-2">
          <input
            type="radio"
            name="appearances-default"
            checked={entry.isPrimary === true}
            onChange={onSetPrimary}
            className="size-3.5"
            aria-label={`Set ${entry.label} as default wiki view`}
          />
          <span className={META_FIELD_LABEL_CLASS}>Default view</span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-muted hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${entry.label}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <section className="grid gap-2">
        <SectionLabel>Identity</SectionLabel>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>Appearance name</span>
          <input
            className={appearanceFieldClass}
            placeholder="Moon Prism Form, The Red Saint…"
            value={entry.label}
            onChange={(e) => onPatch({ label: e.target.value })}
            onBlur={onPersist}
          />
        </label>
        <div className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>Portrait</span>
          <EntryPortraitEditor
            campaignHandle={campaignHandle}
            imageUrl={entry.imageUrl}
            imageCredit={entry.imageCredit}
            onImageUrlChange={(referenceUrl) => onPatch({ imageUrl: referenceUrl })}
            onImageCreditChange={(imageCredit) => onPatch({ imageCredit })}
            onPersist={onPersist}
          />
        </div>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>Presentation type</span>
          <select
            className={appearanceFieldClass}
            value={entry.presentationType ?? 'default'}
            onChange={(e) => {
              onPatch({ presentationType: e.target.value as AppearancePresentationType }, true);
            }}
          >
            {APPEARANCE_PRESENTATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {APPEARANCE_PRESENTATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>Tags (mood/aesthetic)</span>
          <input
            className={appearanceFieldClass}
            placeholder="formal, battle-worn, winter — comma-separated"
            value={entry.tags.join(', ')}
            onChange={(e) => {
              onPatch({ tags: parseCommaListDraft(e.target.value) });
            }}
            onBlur={(e) => {
              onPatch({ tags: parseCommaList(e.target.value) }, true);
            }}
          />
        </label>
      </section>

      <section className="grid gap-2">
        <SectionLabel>Description</SectionLabel>
        <div className="space-y-1">
          <AppearanceFieldLabel
            label="Description"
            htmlFor={`appearance-presentation-description-${entry.id}`}
            guidance={getAppearanceFieldGuidance('presentationDescription')}
          />
          <textarea
            id={`appearance-presentation-description-${entry.id}`}
            className={`${appearanceFieldClass} min-h-[4rem] resize-y`}
            placeholder="How this presentation looks and feels…"
            value={entry.presentationNotes ?? ''}
            onChange={(e) => {
              onPatch({ presentationNotes: e.target.value || null });
            }}
            onBlur={onPersist}
            rows={3}
          />
        </div>
      </section>

      <details className="group rounded-md border border-border/30 bg-surface/10 px-2 py-1">
        <summary className="cursor-pointer list-none text-[11px] font-medium text-muted marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1 group-open:hidden">
            <ChevronRight className="size-3.5" aria-hidden />
            How this presentation differs
          </span>
          <span className="hidden items-center gap-1 group-open:inline-flex">
            <ChevronDown className="size-3.5" aria-hidden />
            How this presentation differs
          </span>
        </summary>
        <div className="mt-3 grid gap-3 pb-2">
          <SectionLabel>Details</SectionLabel>
          <div className="space-y-1">
            <AppearanceFieldLabel
              label="Distinguishing features"
              htmlFor={`appearance-entry-features-${entry.id}`}
              guidance={getAppearanceFieldGuidance('presentationDistinguishingFeatures')}
            />
            <input
              id={`appearance-entry-features-${entry.id}`}
              className={appearanceFieldClass}
              placeholder="Comma-separated — optional for this state"
              value={formatCommaList(entry.distinguishingFeatures)}
              onChange={(e) => {
                onPatch({
                  distinguishingFeatures: parseCommaListDraft(e.target.value),
                });
              }}
              onBlur={(e) => {
                onPatch({ distinguishingFeatures: parseCommaList(e.target.value) }, true);
              }}
            />
          </div>
          <div className="space-y-1">
            <AppearanceFieldLabel
              label="Voice"
              htmlFor={`appearance-entry-voice-${entry.id}`}
              guidance={getAppearanceFieldGuidance('presentationVoice')}
            />
            <input
              id={`appearance-entry-voice-${entry.id}`}
              className={appearanceFieldClass}
              placeholder="Optional"
              value={entry.voice ?? ''}
              onChange={(e) => onPatch({ voice: e.target.value || null })}
              onBlur={onPersist}
            />
          </div>
          <div className="space-y-1">
            <AppearanceFieldLabel
              label="Presence"
              htmlFor={`appearance-entry-presence-${entry.id}`}
              guidance={getAppearanceFieldGuidance('presentationPresence')}
            />
            <textarea
              id={`appearance-entry-presence-${entry.id}`}
              className={`${appearanceFieldClass} min-h-[2.5rem] resize-y`}
              placeholder="Optional"
              value={entry.presence ?? ''}
              onChange={(e) => onPatch({ presence: e.target.value || null })}
              onBlur={onPersist}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <AppearanceFieldLabel
              label="Clothing motifs"
              htmlFor={`appearance-entry-clothing-${entry.id}`}
              guidance={getAppearanceFieldGuidance('presentationClothingMotifs')}
            />
            <textarea
              id={`appearance-entry-clothing-${entry.id}`}
              className={`${appearanceFieldClass} min-h-[2.5rem] resize-y`}
              placeholder="Optional"
              value={entry.clothingMotifs ?? ''}
              onChange={(e) => onPatch({ clothingMotifs: e.target.value || null })}
              onBlur={onPersist}
              rows={2}
            />
          </div>

          <SectionLabel>Supporting</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <AppearanceFieldLabel
                label="Gender"
                htmlFor={`appearance-entry-gender-${entry.id}`}
                guidance={getAppearanceFieldGuidance('presentationEntryGender')}
              />
              <input
                id={`appearance-entry-gender-${entry.id}`}
                className={appearanceFieldClass}
                placeholder="This state only"
                value={entry.gender ?? ''}
                onChange={(e) => onPatch({ gender: e.target.value || null })}
                onBlur={onPersist}
              />
            </div>
            <div className="space-y-1">
              <AppearanceFieldLabel
                label="Presentation"
                htmlFor={`appearance-entry-presentation-${entry.id}`}
                guidance={getAppearanceFieldGuidance('presentationEntryPresentation')}
              />
              <input
                id={`appearance-entry-presentation-${entry.id}`}
                className={appearanceFieldClass}
                placeholder="This state only"
                value={entry.presentation ?? ''}
                onChange={(e) => onPatch({ presentation: e.target.value || null })}
                onBlur={onPersist}
              />
            </div>
          </div>
        </div>
      </details>

      <section className="grid gap-2">
        <SectionLabel>Notes</SectionLabel>
        <div className="space-y-1">
          <AppearanceFieldLabel
            label="Author notes"
            htmlFor={`appearance-entry-author-notes-${entry.id}`}
            guidance={getAppearanceFieldGuidance('presentationAuthorNotes')}
          />
          <textarea
            id={`appearance-entry-author-notes-${entry.id}`}
            className={`${appearanceFieldClass} min-h-[2.5rem] resize-y`}
            placeholder="Optional"
            value={entry.authorNotes ?? ''}
            onChange={(e) => onPatch({ authorNotes: e.target.value || null })}
            onBlur={onPersist}
            rows={2}
          />
        </div>
      </section>
    </div>
  );
}

export function AppearanceFormsEditor({
  campaignHandle,
  gallery,
  onChange,
  onPersist,
}: AppearanceFormsEditorProps) {
  const entries = gallery.entries;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);

  const persistCurrent = () => {
    onPersist({ entries: entriesRef.current });
  };

  const updateEntries = (next: AppearanceGalleryEntry[], persist = false) => {
    entriesRef.current = next;
    const state = { entries: next };
    onChange(state);
    if (persist) onPersist(state);
  };

  const addEntry = () => {
    const entry: AppearanceGalleryEntry = {
      id: newGalleryEntryId(),
      label: 'New appearance',
      imageUrl: '',
      imageCredit: null,
      tags: [],
      presentationType: 'default',
      isPrimary: entries.length === 0 ? true : undefined,
      timelinePin: null,
      presentationNotes: null,
      ...emptyGalleryEntryOverlays(),
    };
    setHighlightEntryId(entry.id);
    updateEntries([...entries, entry]);
  };

  useEffect(() => {
    if (!highlightEntryId) return;
    const timer = window.setTimeout(() => setHighlightEntryId(null), 3000);
    requestAnimationFrame(() => {
      const card = document.getElementById(`form-entry-${highlightEntryId}`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const nameInput = card?.querySelector<HTMLInputElement>('input[type="text"]');
      nameInput?.focus();
      nameInput?.select();
    });
    return () => window.clearTimeout(timer);
  }, [highlightEntryId, entries.length]);

  const removeEntry = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    if (next.length > 0 && !next.some((e) => e.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    updateEntries(next, true);
  };

  const setPrimary = (id: string) => {
    updateEntries(enforceSinglePrimaryInEditor(entries, id), true);
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>Appearances</SectionLabel>
        <div className="flex items-center gap-2">
          {entries.length > 0 ? (
            <span className="text-[10px] text-muted">
              {entries.length} appearance{entries.length === 1 ? '' : 's'}
            </span>
          ) : null}
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[10px] font-medium text-muted hover:text-foreground"
          >
            <Plus className="size-3" />
            Add appearance
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted">Add an appearance to capture another presentation state.</p>
      ) : null}

      <div className="grid gap-4">
        {entries.map((entry) => (
          <AppearanceEntryEditorCard
            key={entry.id}
            entry={entry}
            campaignHandle={campaignHandle}
            highlighted={highlightEntryId === entry.id}
            onPatch={(patch, persist) => {
              const next = entriesRef.current.map((item) =>
                item.id === entry.id ? { ...item, ...patch } : item,
              );
              updateEntries(next, persist ?? false);
            }}
            onRemove={() => removeEntry(entry.id)}
            onSetPrimary={() => setPrimary(entry.id)}
            onPersist={persistCurrent}
          />
        ))}
      </div>
    </div>
  );
}

interface AppearanceFormsWidgetProps {
  mode: 'read' | 'edit';
  campaignHandle?: string;
  forms: AppearanceFormsViewModel | AppearanceGalleryState;
  onChange?: (gallery: AppearanceGalleryState) => void;
  onPersist?: (gallery: AppearanceGalleryState) => void;
  filterEntries?: (entry: AppearanceGalleryEntry) => boolean;
  alternatesOnly?: boolean;
}

export function AppearanceFormsWidget({
  mode,
  campaignHandle,
  forms,
  onChange,
  onPersist,
  filterEntries,
  alternatesOnly,
}: AppearanceFormsWidgetProps) {
  const viewModel: AppearanceFormsViewModel =
    'primaryEntry' in forms
      ? forms
      : {
          entries: forms.entries,
          primaryEntry: forms.entries.find((e) => e.isPrimary) ?? forms.entries[0] ?? null,
          hasContent: forms.entries.length > 0,
        };

  if (mode === 'read') {
    return (
      <AppearanceFormsReadView
        forms={viewModel}
        filterEntries={filterEntries}
        alternatesOnly={alternatesOnly}
      />
    );
  }

  if (!onChange || !onPersist) return null;

  const editorGallery: AppearanceGalleryState =
    'primaryEntry' in forms
      ? { entries: viewModel.entries.filter((e) => e.id !== '__legacy_portrait__') }
      : forms;

  return (
    <AppearanceFormsEditor
      campaignHandle={campaignHandle}
      gallery={editorGallery}
      onChange={onChange}
      onPersist={onPersist}
    />
  );
}
