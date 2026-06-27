import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useRef, useState } from 'react';
import { ImageCreditDisplay } from '@/components/media/ImageCreditDisplay';
import { ImageCreditEditor } from '@/components/media/ImageCreditEditor';
import type {
  AppearanceGalleryEntry,
  AppearanceGalleryState,
  AppearancePresentationType,
} from '@shared/appearanceMetadata';
import {
  APPEARANCE_PRESENTATION_TYPE_LABELS,
  APPEARANCE_PRESENTATION_TYPES,
  enforceSinglePrimaryInEditor,
} from '@shared/appearanceMetadata';
import type { AppearanceFormsViewModel } from '@/lib/entityAppearanceProjection';
import {
  appearanceFieldClass,
  formatCommaList,
  parseCommaList,
  parseCommaListDraft,
  SectionLabel,
} from './appearanceShared';
import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';
import { Plus, Star, Trash2 } from 'lucide-react';

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
}

export function AppearanceFormsReadView({
  forms,
  filterEntries,
}: AppearanceFormsReadProps) {
  const entries = filterEntries ? forms.entries.filter(filterEntries) : forms.entries;
  const [previewId, setPreviewId] = useState<string | null>(
    forms.primaryEntry?.id ?? entries[0]?.id ?? null,
  );

  if (entries.length === 0) return null;

  const preview =
    entries.find((e) => e.id === previewId) ?? forms.primaryEntry ?? entries[0];

  if (!preview) return null;

  return (
    <section className="space-y-3">
      <SectionLabel>Forms</SectionLabel>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-sm font-medium text-foreground">{preview.label}</h5>
          <PresentationTypeBadge type={preview.presentationType} />
          {preview.isPrimary ? (
            <span className="rounded-full border border-border/40 bg-elevated/60 px-2 py-0.5 text-[10px] text-muted">
              Primary
            </span>
          ) : null}
        </div>
        {preview.imageUrl.trim() ? (
          <img
            src={preview.imageUrl}
            alt=""
            className="max-h-80 w-auto rounded-lg border border-border/40 object-cover shadow-sm"
          />
        ) : (
          <p className="rounded-lg border border-dashed border-border/40 px-3 py-6 text-center text-xs text-muted">
            No portrait yet for this form.
          </p>
        )}
        <ImageCreditDisplay credit={preview.imageCredit} />
        {preview.presentationNotes ? (
          <p className="wiki-reader-prose text-sm leading-relaxed text-foreground">
            {preview.presentationNotes}
          </p>
        ) : null}
        {preview.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {preview.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/40 bg-elevated/60 px-2 py-0.5 text-xs text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {entries.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setPreviewId(entry.id)}
              className={`relative shrink-0 rounded-lg border p-0.5 transition-colors ${
                preview.id === entry.id
                  ? 'border-primary/60 ring-1 ring-primary/30'
                  : 'border-border/40 hover:border-border'
              }`}
            >
              <img
                src={entry.imageUrl}
                alt=""
                className="size-16 rounded-md object-cover"
              />
              {entry.isPrimary ? (
                <Star
                  className="absolute right-1 top-1 size-3 fill-primary text-primary"
                  aria-label="Primary"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
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
      label: 'New form',
      imageUrl: '',
      imageCredit: null,
      tags: [],
      presentationType: 'default',
      isPrimary: entries.length === 0 ? true : undefined,
      timelinePin: null,
      presentationNotes: null,
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
        <div className="space-y-0.5">
          <SectionLabel>Forms</SectionLabel>
          <p className="text-[10px] text-muted">
            Variants, transformations, and presentation states — name each form freely.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 ? (
            <span className="text-[10px] text-muted">
              {entries.length} form{entries.length === 1 ? '' : 's'}
            </span>
          ) : null}
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 rounded-md border border-border/40 px-2 py-1 text-[10px] font-medium text-muted hover:text-foreground"
          >
            <Plus className="size-3" />
            Add form
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted">
          Moon Prism Form, Winter court attire, Masked vigilante — add labeled portrait forms.
        </p>
      ) : null}

      <div className="grid gap-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            id={`form-entry-${entry.id}`}
            className={`space-y-2 rounded-lg border bg-surface/20 p-3 transition-shadow ${
              highlightEntryId === entry.id
                ? 'border-primary/50 ring-2 ring-primary/25'
                : 'border-border/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex flex-1 items-center gap-2">
                <input
                  type="radio"
                  name="forms-primary"
                  checked={entry.isPrimary === true}
                  onChange={() => setPrimary(entry.id)}
                  className="size-3.5"
                  aria-label={`Set ${entry.label} as primary`}
                />
                <span className={META_FIELD_LABEL_CLASS}>
                  Primary
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="rounded p-1 text-muted hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${entry.label}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>
                Form name
              </span>
              <input
                className={appearanceFieldClass}
                placeholder="Moon Prism Form, The Red Saint…"
                value={entry.label}
                onChange={(e) => {
                  const next = entries.map((item) =>
                    item.id === entry.id ? { ...item, label: e.target.value } : item,
                  );
                  updateEntries(next);
                }}
                onBlur={persistCurrent}
              />
            </label>

            <div className="space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>
                Portrait
              </span>
            {campaignHandle ? (
              <ImportImageUrlField
                campaignHandle={campaignHandle}
                value={entry.imageUrl}
                inputClassName={appearanceFieldClass}
                onChange={(referenceUrl) => {
                  const next = entries.map((item) =>
                    item.id === entry.id ? { ...item, imageUrl: referenceUrl } : item,
                  );
                  updateEntries(next);
                }}
                onImported={async () => {
                  persistCurrent();
                }}
              />
            ) : (
              <p className="text-[10px] text-muted">
                Gallery portraits require campaign context to import.
              </p>
            )}
            </div>

            <ImageCreditEditor
              value={entry.imageCredit}
              onChange={(imageCredit) => {
                const next = entries.map((item) =>
                  item.id === entry.id ? { ...item, imageCredit } : item,
                );
                updateEntries(next);
              }}
              onPersist={persistCurrent}
              inputClassName={appearanceFieldClass}
            />

            <label className="space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>
                Presentation type
              </span>
              <select
                className={appearanceFieldClass}
                value={entry.presentationType ?? 'default'}
                onChange={(e) => {
                  const presentationType = e.target.value as AppearancePresentationType;
                  const next = entries.map((item) =>
                    item.id === entry.id ? { ...item, presentationType } : item,
                  );
                  updateEntries(next, true);
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
              <span className={META_FIELD_LABEL_CLASS}>
                Tags (mood/aesthetic)
              </span>
              <input
                className={appearanceFieldClass}
                placeholder="formal, battle-worn, winter — comma-separated"
                value={entry.tags.join(', ')}
                onChange={(e) => {
                  const next = entries.map((item) =>
                    item.id === entry.id
                      ? { ...item, tags: parseCommaListDraft(e.target.value) }
                      : item,
                  );
                  updateEntries(next);
                }}
                onBlur={(e) => {
                  const normalized = parseCommaList(e.target.value);
                  const next = entriesRef.current.map((item) =>
                    item.id === entry.id ? { ...item, tags: normalized } : item,
                  );
                  updateEntries(next, true);
                }}
              />
            </label>

            <label className="space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>
                While in this form…
              </span>
              <textarea
                className={`${appearanceFieldClass} min-h-[3rem] resize-y`}
                placeholder="Her voice becomes resonant and impossibly calm."
                value={entry.presentationNotes ?? ''}
                onChange={(e) => {
                  const next = entries.map((item) =>
                    item.id === entry.id
                      ? { ...item, presentationNotes: e.target.value || null }
                      : item,
                  );
                  updateEntries(next);
                }}
                onBlur={persistCurrent}
                rows={2}
              />
            </label>

            <label className="space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>
                Timeline pin (optional)
              </span>
              <input
                className={appearanceFieldClass}
                placeholder="Epoch or event reference"
                value={entry.timelinePin ?? ''}
                onChange={(e) => {
                  const next = entries.map((item) =>
                    item.id === entry.id
                      ? { ...item, timelinePin: e.target.value || null }
                      : item,
                  );
                  updateEntries(next);
                }}
                onBlur={persistCurrent}
              />
            </label>
          </div>
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
}

export function AppearanceFormsWidget({
  mode,
  campaignHandle,
  forms,
  onChange,
  onPersist,
  filterEntries,
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
    return <AppearanceFormsReadView forms={viewModel} filterEntries={filterEntries} />;
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
