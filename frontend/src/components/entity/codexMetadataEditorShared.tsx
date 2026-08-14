import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { formatCommaList, parseCommaList, parseCommaListDraft } from '@/components/entity/appearance/appearanceShared';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { ImageCreditEditor } from '@/components/media/ImageCreditEditor';
import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';
import { AppearanceSummaryField } from '@/components/entity/AppearanceSummaryField';
import { AppearanceFieldLabel } from '@/components/entity/appearance/AppearanceFieldLabel';
import { getAppearanceFieldGuidance } from '@/lib/appearanceFieldGuidance';
import type { CodexAppearanceFields } from '@/lib/codexMetadataShared';
import type { ImageCredit } from '@shared/imageCredit';
import type { WikiTreeNode } from '@/types/wiki';

export const codexFieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

export function CodexSectionLabel({
  children,
  as: Tag = 'h4',
  className = '',
}: {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'h4' | 'span';
  className?: string;
}) {
  return (
    <Tag className={className ? `${META_SECTION_LABEL_CLASS} ${className}` : META_SECTION_LABEL_CLASS}>
      {children}
    </Tag>
  );
}

export function CodexFieldLabel({ children }: { children: ReactNode }) {
  return <span className={META_FIELD_LABEL_CLASS}>{children}</span>;
}

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
        <span className={META_SECTION_LABEL_CLASS}>
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
  /** Collapse import URL and credits until expanded — for appearance tab primary portrait. */
  collapsedTools?: boolean;
}

export function PortraitImageEditor({
  campaignHandle,
  portraitUrl,
  portraitCredit,
  onChange,
  onPersist,
  collapsedTools = false,
}: PortraitImageEditorProps) {
  const [toolsOpen, setToolsOpen] = useState(!collapsedTools);
  const showTools = !collapsedTools || toolsOpen;

  return (
    <div className="grid gap-2">
      {portraitUrl?.trim() ? (
        <img
          src={portraitUrl}
          alt=""
          className="max-h-48 w-auto rounded-lg border border-border/40 object-cover shadow-sm"
        />
      ) : null}

      {collapsedTools ? (
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
          {toolsOpen ? 'Image details' : 'Edit portrait or attribution'}
        </button>
      ) : (
        <h4 className={META_SECTION_LABEL_CLASS}>Portrait</h4>
      )}

      {showTools ? (
        <>
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
        </>
      ) : null}
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
  /** When true, summary is edited outside this block (e.g. appearance tab). */
  hideSummary?: boolean;
  /** Tags and identity fields only, after main appearance content. */
  supportingMetadata?: boolean;
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
  hideSummary = false,
  supportingMetadata = false,
}: AppearanceEditorProps) {
  const showTags = tags !== undefined && onTagsChange && onTagsPersist;
  const showIdentity =
    identityFields !== undefined && onIdentityChange !== undefined && onIdentityPersist !== undefined;
  const showPortrait = !hidePortrait;
  const [tagsInput, setTagsInput] = useState(formatCommaList(tags ?? []));

  const identityBlock =
    showIdentity ? (
      <div className="grid gap-2">
        {!supportingMetadata ? (
          <h4 className={META_SECTION_LABEL_CLASS}>Identity &amp; presence</h4>
        ) : null}
        <div className="space-y-1">
          <AppearanceFieldLabel
            label="Gender"
            htmlFor="appearance.gender"
            guidance={getAppearanceFieldGuidance('gender')}
          />
          <input
            id="appearance.gender"
            className={codexFieldClass}
            placeholder="Optional"
            value={identityFields.gender ?? ''}
            onChange={(e) =>
              onIdentityChange({
                ...identityFields,
                gender: e.target.value || null,
              })
            }
            onBlur={() => onIdentityPersist({ gender: identityFields.gender })}
          />
        </div>
        <div className="space-y-1">
          <AppearanceFieldLabel
            label="Presentation"
            htmlFor="appearance.presentation"
            guidance={getAppearanceFieldGuidance('presentation')}
          />
          <input
            id="appearance.presentation"
            className={codexFieldClass}
            placeholder="Optional"
            value={identityFields.presentation ?? ''}
            onChange={(e) =>
              onIdentityChange({
                ...identityFields,
                presentation: e.target.value || null,
              })
            }
            onBlur={() => onIdentityPersist({ presentation: identityFields.presentation })}
          />
        </div>
      </div>
    ) : null;

  const tagsBlock = showTags ? (
    <div className="space-y-1">
      <span className={META_FIELD_LABEL_CLASS}>Appearance tags</span>
      <input
        id={tagsFieldId}
        className={codexFieldClass}
        placeholder="Comma-separated tags"
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
    </div>
  ) : null;

  const summaryBlock = !hideSummary ? (
    <AppearanceSummaryField
      value={appearance.summary}
      onChange={(summary) => onChange({ ...appearance, summary })}
      onPersist={(summary) => onPersist({ summary })}
    />
  ) : null;

  const portraitBlock =
    showPortrait && campaignHandle ? (
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
    ) : showPortrait ? (
      <p className="text-[10px] text-muted">Portrait import requires campaign context.</p>
    ) : null;

  if (supportingMetadata) {
    return (
      <div className="grid gap-4 pb-2">
        <h4 className={META_SECTION_LABEL_CLASS}>Notes</h4>
        {tagsBlock}
        {identityBlock}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {identityBlock}

      <div className="grid gap-2">
        {showIdentity && showPortrait ? (
          <h4 className={META_SECTION_LABEL_CLASS}>Physical / embodied</h4>
        ) : null}
        {portraitBlock}
        {summaryBlock}
        {tagsBlock}
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
