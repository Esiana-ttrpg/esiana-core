import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { formatCommaList, parseCommaList, parseCommaListDraft } from '@/components/entity/appearance/appearanceShared';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { ImageCreditEditor } from '@/components/media/ImageCreditEditor';
import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';
import { AppearanceSummaryField } from '@/components/entity/AppearanceSummaryField';
import type { CodexAppearanceFields } from '@/lib/codexMetadataShared';
import type { ImageCredit } from '@shared/imageCredit';
import type { WikiTreeNode } from '@/types/wiki';

export const codexFieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface CodexEditorShellProps {
  saving: boolean;
  error: string | null;
  bare?: boolean;
  children: ReactNode;
}

export function CodexEditorShell({ saving, error, bare, children }: CodexEditorShellProps) {
  if (bare) {
    return (
      <>
        {children}
        {saving ? (
          <p className="mt-2 flex items-center gap-1 text-[10px] text-muted">
            <Loader2 className="size-3 animate-spin" /> Saving…
          </p>
        ) : null}
        {error ? <p className="mt-2 text-[10px] text-destructive">{error}</p> : null}
      </>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface/40 p-3">
      {children}
      {saving ? (
        <p className="flex items-center gap-1 text-[10px] text-muted">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function codexFieldId(focusField: string | null | undefined, key: string): string | undefined {
  return focusField === key ? `character-field-${key}` : undefined;
}

interface PageIdListEditorProps {
  label: string;
  ids: string[];
  pickerPages: WikiTreeNode[];
  flatPages: WikiTreeNode[];
  placeholder: string;
  onChange: (nextIds: string[]) => void;
  defaultOptions?: WikiTreeNode[];
  searchOptions?: WikiTreeNode[];
  onCreatePage?: (title: string) => void;
  createLabel?: string;
  clearLabel?: string;
}

export function PageIdListEditor({
  label,
  ids,
  pickerPages,
  flatPages,
  placeholder,
  onChange,
  defaultOptions,
  searchOptions,
  onCreatePage,
  createLabel,
  clearLabel,
}: PageIdListEditorProps) {
  const [emptyRowCount, setEmptyRowCount] = useState(0);
  const rowCount = ids.length + emptyRowCount;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
          onClick={() => setEmptyRowCount((count) => count + 1)}
        >
          <Plus className="size-3" /> Add
        </button>
      </div>
      {rowCount === 0 ? (
        <p className="text-[10px] text-muted">No links yet. Add a row to search or create one.</p>
      ) : null}
      {Array.from({ length: rowCount }, (_, index) => {
        const pageId = index < ids.length ? ids[index] : null;
        const rowKey = pageId ?? `empty-${index}`;

        return (
          <div key={rowKey} className="flex items-center gap-2">
            <IdentityPagePicker
              flatPages={pickerPages}
              defaultOptions={defaultOptions}
              searchOptions={searchOptions}
              lookupPages={flatPages}
              value={pageId}
              placeholder={placeholder}
              clearLabel={clearLabel}
              createLabel={createLabel}
              onCreatePage={onCreatePage}
              onChange={(nextId) => {
                if (!nextId) {
                  if (pageId) {
                    onChange(ids.filter((id) => id !== pageId));
                  } else {
                    setEmptyRowCount((count) => Math.max(0, count - 1));
                  }
                  return;
                }

                if (pageId) {
                  onChange(ids.map((id) => (id === pageId ? nextId : id)));
                  return;
                }

                onChange([...ids, nextId]);
                setEmptyRowCount((count) => Math.max(0, count - 1));
              }}
            />
            {(pageId || index >= ids.length) && (
              <button
                type="button"
                className="text-muted hover:text-destructive"
                onClick={() => {
                  if (pageId) {
                    onChange(ids.filter((id) => id !== pageId));
                  } else {
                    setEmptyRowCount((count) => Math.max(0, count - 1));
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface PortraitImageEditorProps {
  campaignHandle: string;
  portraitUrl: string | null;
  portraitCredit: ImageCredit | null;
  onChange: (fields: { portraitUrl: string | null; portraitCredit: ImageCredit | null }) => void;
  onPersist: (
    fields: Partial<{ portraitUrl: string | null; portraitCredit: ImageCredit | null }>,
  ) => void | Promise<void>;
}

export function PortraitImageEditor({
  campaignHandle,
  portraitUrl,
  portraitCredit,
  onChange,
  onPersist,
}: PortraitImageEditorProps) {
  return (
    <div className="grid gap-2">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted">Portrait</h4>
      <ImportImageUrlField
        campaignHandle={campaignHandle}
        value={portraitUrl ?? ''}
        inputClassName={codexFieldClass}
        onChange={(referenceUrl) =>
          onChange({ portraitUrl: referenceUrl || null, portraitCredit })
        }
        onImported={async (referenceUrl) => {
          await onPersist({ portraitUrl: referenceUrl });
        }}
      />
      <ImageCreditEditor
        value={portraitCredit}
        onChange={(nextCredit) => onChange({ portraitUrl, portraitCredit: nextCredit })}
        onPersist={(nextCredit) => onPersist({ portraitCredit: nextCredit })}
        inputClassName={codexFieldClass}
      />
    </div>
  );
}

interface AppearanceEditorProps {
  campaignHandle?: string;
  appearance: CodexAppearanceFields;
  focusField?: string | null;
  onChange: (appearance: CodexAppearanceFields) => void;
  onPersist: (appearance: Partial<CodexAppearanceFields>) => void;
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  onTagsPersist?: (tags: string[]) => void;
  tagsFieldId?: string;
  identityFields?: {
    gender: string | null;
    presentation: string | null;
  };
  onIdentityChange?: (fields: { gender: string | null; presentation: string | null }) => void;
  onIdentityPersist?: (fields: Partial<{ gender: string | null; presentation: string | null }>) => void;
  /** When true, portrait URL/credit are managed by appearance-gallery instead. */
  hidePortrait?: boolean;
}

export function AppearanceEditor({
  campaignHandle,
  appearance,
  focusField: _focusField,
  onChange,
  onPersist,
  tags,
  onTagsChange,
  onTagsPersist,
  tagsFieldId = 'appearance.tags',
  identityFields,
  onIdentityChange,
  onIdentityPersist,
  hidePortrait = false,
}: AppearanceEditorProps) {
  const showTags = tags !== undefined && onTagsChange && onTagsPersist;
  const showIdentity =
    identityFields !== undefined && onIdentityChange !== undefined && onIdentityPersist !== undefined;
  const showPortrait = !hidePortrait;
  const [tagsInput, setTagsInput] = useState(formatCommaList(tags ?? []));

  return (
    <div className="grid gap-4">
      {showIdentity ? (
        <div className="grid gap-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Identity &amp; presence
          </h4>
          <label className="space-y-1" id="appearance.gender">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Gender
            </span>
            <input
              className={codexFieldClass}
              placeholder="Optional — self-identity, freeform"
              value={identityFields.gender ?? ''}
              onChange={(e) =>
                onIdentityChange({
                  ...identityFields,
                  gender: e.target.value || null,
                })
              }
              onBlur={() => onIdentityPersist({ gender: identityFields.gender })}
            />
          </label>
          <label className="space-y-1" id="appearance.presentation">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Presentation
            </span>
            <input
              className={codexFieldClass}
              placeholder="Optional — femme, androgynous, masc…"
              value={identityFields.presentation ?? ''}
              onChange={(e) =>
                onIdentityChange({
                  ...identityFields,
                  presentation: e.target.value || null,
                })
              }
              onBlur={() => onIdentityPersist({ presentation: identityFields.presentation })}
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-2">
        {showIdentity && showPortrait ? (
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Physical / embodied
          </h4>
        ) : null}
      {showPortrait ? (
        <>
      {campaignHandle ? (
        <PortraitImageEditor
          campaignHandle={campaignHandle}
          portraitUrl={appearance.portraitUrl}
          portraitCredit={appearance.portraitCredit}
          onChange={({ portraitUrl, portraitCredit }) =>
            onChange({ ...appearance, portraitUrl, portraitCredit })
          }
          onPersist={async (fields) => {
            await onPersist(fields);
          }}
        />
      ) : (
        <p className="text-[10px] text-muted">
          Portrait import requires campaign context.
        </p>
      )}
        </>
      ) : null}
      <AppearanceSummaryField
        value={appearance.summary}
        onChange={(summary) => onChange({ ...appearance, summary })}
        onPersist={(summary) => onPersist({ summary })}
      />
      {showTags ? (
        <label className="space-y-1" id={tagsFieldId}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Appearance tags
          </span>
          <input
            className={codexFieldClass}
            placeholder="femme, androgynous, scarred, bioluminescent — comma-separated"
            value={tagsInput}
            onChange={(e) => {
              setTagsInput(e.target.value);
              onTagsChange(parseCommaListDraft(e.target.value));
            }}
            onBlur={() => {
              const normalized = parseCommaList(tagsInput);
              setTagsInput(formatCommaList(normalized));
              onTagsChange(normalized);
              onTagsPersist(normalized);
            }}
          />
        </label>
      ) : null}
      </div>
    </div>
  );
}

export function useCodexMetadataDraft<T extends object>(
  metadata: unknown,
  parse: (metadata: unknown) => T,
  blockId = 'codex-metadata',
): [T, Dispatch<SetStateAction<T>>, () => void, (committed?: T) => void, boolean] {
  const parsed = useMemo(() => parse(metadata), [metadata, parse]);
  const { draft, setDraft, resetFromSource, markCommitted, dirty } = useBlockDraft({
    blockId,
    source: parsed,
    serialize: (value) => JSON.stringify(value),
  });
  return [draft, setDraft, resetFromSource, markCommitted, dirty];
}
