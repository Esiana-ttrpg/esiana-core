import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkshopDocument, WorkshopFieldShadow } from '@shared/workshopDocument';
import type { WorkshopFieldSchema, WorkshopFieldSlot } from '@shared/workshopFieldSchema';
import type { InfoboxField, WikiPageBlock, WikiPageLayoutPayload } from '@/types/wiki';
import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { patchWorkshopDraft, type WorkshopSaveState } from '@/lib/workshopDrafts';
import { buildMetadataPatch, readMetadataFieldValue } from '@/lib/workshopFieldSchema';
import { updateCharacterMetadata, updateWikiPage, saveWikiPageLayout } from '@/lib/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface WorkshopFieldsPanelProps {
  campaignHandle: string;
  draft: WorkshopDocument;
  schema: WorkshopFieldSchema | null;
  anchorPage: WikiPageLayoutPayload | null;
  onFieldsSaveState?: (state: WorkshopSaveState) => void;
  onAnchorPageUpdated?: (page: WikiPageLayoutPayload) => void;
  onDraftUpdated?: (draft: WorkshopDocument) => void;
}

function getInfoboxFields(blocks: WikiPageBlock[]): InfoboxField[] {
  const block = blocks.find((b) => b.type === 'wiki-infobox');
  const fields = (block?.content as { fields?: InfoboxField[] })?.fields;
  return Array.isArray(fields) ? [...fields] : [];
}

function setInfoboxField(
  blocks: WikiPageBlock[],
  key: string,
  value: string,
): WikiPageBlock[] {
  return blocks.map((block) => {
    if (block.type !== 'wiki-infobox') return block;
    const fields = getInfoboxFields([block]);
    const index = fields.findIndex((f) => f.key === key);
    if (index >= 0) {
      const next = [...fields];
      next[index] = { ...next[index]!, value };
      return { ...block, content: { ...block.content, fields: next } };
    }
    return {
      ...block,
      content: { ...block.content, fields: [...fields, { key, value }] },
    };
  });
}

function deepMergeMetadata(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const prev = base[key];
      next[key] = deepMergeMetadata(
        prev && typeof prev === 'object' && !Array.isArray(prev)
          ? (prev as Record<string, unknown>)
          : {},
        value as Record<string, unknown>,
      );
    } else {
      next[key] = value;
    }
  }
  return next;
}

function WidgetPlaceholder({ label }: { label: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      Edit {label.toLowerCase()} on the wiki page.
    </p>
  );
}

export function WorkshopFieldsPanel({
  campaignHandle,
  draft,
  schema,
  anchorPage,
  onFieldsSaveState,
  onAnchorPageUpdated,
  onDraftUpdated,
}: WorkshopFieldsPanelProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pageTitle, setPageTitle] = useState(anchorPage?.title ?? draft.title);
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    () => (anchorPage?.metadata as Record<string, unknown>) ?? draft.fieldShadow?.metadata ?? {},
  );
  const [shadowBlocks, setShadowBlocks] = useState<WikiPageBlock[]>(
    () => (draft.fieldShadow?.blocks as unknown as WikiPageBlock[]) ?? [],
  );
  const [localBlocks, setLocalBlocks] = useState<WikiPageBlock[]>(() => anchorPage?.blocks ?? []);

  useEffect(() => {
    setPageTitle(anchorPage?.title ?? draft.title);
    setMetadata((anchorPage?.metadata as Record<string, unknown>) ?? draft.fieldShadow?.metadata ?? {});
    setShadowBlocks((draft.fieldShadow?.blocks as unknown as WikiPageBlock[]) ?? []);
    setLocalBlocks(anchorPage?.blocks ?? []);
  }, [anchorPage, draft.fieldShadow, draft.id, draft.title]);

  const scheduleShadowSave = useCallback(
    (nextMetadata: Record<string, unknown>, nextBlocks: WikiPageBlock[]) => {
      if (!draft.fieldShadow?.intendedTarget) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      onFieldsSaveState?.('saving');
      saveTimer.current = setTimeout(() => {
        const fieldShadow: WorkshopFieldShadow = {
          intendedTarget: draft.fieldShadow!.intendedTarget,
          templateType: draft.fieldShadow!.templateType,
          blocks: nextBlocks as unknown as Array<Record<string, unknown>>,
          metadata: nextMetadata,
        };
        void patchWorkshopDraft(campaignHandle, draft.id, { fieldShadow })
          .then((updated) => {
            onDraftUpdated?.(updated);
            onFieldsSaveState?.('saved');
          })
          .catch(() => onFieldsSaveState?.('error'));
      }, 600);
    },
    [campaignHandle, draft.fieldShadow, draft.id, onDraftUpdated, onFieldsSaveState],
  );

  const saveAnchoredTitle = useCallback(
    (title: string) => {
      if (!anchorPage) return;
      onFieldsSaveState?.('saving');
      void updateWikiPage(campaignHandle, anchorPage.id, { title: title.trim() || anchorPage.title })
        .then((page) => {
          onAnchorPageUpdated?.({ ...anchorPage, ...page, title: page.title });
          onFieldsSaveState?.('saved');
        })
        .catch(() => onFieldsSaveState?.('error'));
    },
    [anchorPage, campaignHandle, onAnchorPageUpdated, onFieldsSaveState],
  );

  const saveAnchoredMetadata = useCallback(
    (patch: Record<string, unknown>) => {
      if (!anchorPage) return;
      onFieldsSaveState?.('saving');
      void updateCharacterMetadata(campaignHandle, anchorPage.id, patch)
        .then((result) => {
          onAnchorPageUpdated?.({
            ...anchorPage,
            metadata: result.metadata as typeof anchorPage.metadata,
          });
          setMetadata(result.metadata);
          onFieldsSaveState?.('saved');
        })
        .catch(() => onFieldsSaveState?.('error'));
    },
    [anchorPage, campaignHandle, onAnchorPageUpdated, onFieldsSaveState],
  );

  const saveAnchoredInfobox = useCallback(
    (key: string, value: string) => {
      if (!anchorPage) return;
      const nextBlocks = setInfoboxField(localBlocks, key, value);
      onFieldsSaveState?.('saving');
      void saveWikiPageLayout(campaignHandle, anchorPage.id, nextBlocks, anchorPage.templateType)
        .then((result) => {
          setLocalBlocks(result.blocks);
          onAnchorPageUpdated?.({ ...anchorPage, blocks: result.blocks, templateType: result.templateType });
          onFieldsSaveState?.('saved');
        })
        .catch(() => onFieldsSaveState?.('error'));
    },
    [anchorPage, campaignHandle, localBlocks, onAnchorPageUpdated, onFieldsSaveState],
  );

  const renderField = (slot: WorkshopFieldSlot) => {
    if (slot.editorKind === 'widget') {
      return <WidgetPlaceholder key={slot.fieldKey} label={slot.label} />;
    }

    if (slot.editorKind === 'page-title') {
      return (
        <label key={slot.fieldKey} className="block space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>{slot.label}</span>
          <input
            className={fieldClass}
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            onBlur={() => {
              if (draft.binding === 'anchored') {
                saveAnchoredTitle(pageTitle);
              } else {
                void patchWorkshopDraft(campaignHandle, draft.id, {
                  title: pageTitle.trim() || draft.title,
                }).then(onDraftUpdated);
                scheduleShadowSave(metadata, shadowBlocks);
              }
            }}
          />
        </label>
      );
    }

    const blocksSource =
      draft.binding === 'anchored' ? localBlocks : shadowBlocks;
    const value =
      slot.editorKind === 'infobox' && slot.infoboxKey
        ? getInfoboxFields(blocksSource).find((f) => f.key === slot.infoboxKey)?.value ?? ''
        : readMetadataFieldValue(metadata, slot.metadataPath ?? '');

    return (
      <label key={slot.fieldKey} className="block space-y-1">
        <span className={META_FIELD_LABEL_CLASS}>{slot.label}</span>
        <input
          className={fieldClass}
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (slot.editorKind === 'infobox' && slot.infoboxKey) {
              const source = draft.binding === 'anchored' ? localBlocks : shadowBlocks;
              const nextBlocks = setInfoboxField(source, slot.infoboxKey, next);
              if (draft.binding === 'anchored') {
                setLocalBlocks(nextBlocks);
              } else {
                setShadowBlocks(nextBlocks);
                scheduleShadowSave(metadata, nextBlocks);
              }
              return;
            }
            if (!slot.metadataPath) return;
            const patch = buildMetadataPatch(slot.metadataPath, next);
            const merged = deepMergeMetadata(metadata, patch);
            setMetadata(merged);
            if (draft.binding === 'shadow') {
              scheduleShadowSave(merged, shadowBlocks);
            }
          }}
          onBlur={() => {
            if (slot.editorKind === 'infobox' && slot.infoboxKey) {
              if (draft.binding === 'anchored') {
                saveAnchoredInfobox(slot.infoboxKey, value);
              }
              return;
            }
            if (!slot.metadataPath) return;
            const patch = buildMetadataPatch(slot.metadataPath, value);
            if (draft.binding === 'anchored') {
              saveAnchoredMetadata(patch);
            } else {
              scheduleShadowSave(metadata, shadowBlocks);
            }
          }}
        />
      </label>
    );
  };

  const visibleGroups = useMemo(
    () => schema?.fieldGroups.filter((g) => g.slots.some((s) => s.editorKind !== 'widget')) ?? [],
    [schema],
  );

  if (!schema || visibleGroups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {draft.binding === 'shadow'
          ? 'Draft fields will appear here as you add structure.'
          : 'No structured fields for this document.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visibleGroups.map((group) => (
        <section key={group.subviewId} className="space-y-2">
          <h3 className={META_SECTION_LABEL_CLASS}>{group.label}</h3>
          <div className="space-y-2">
            {group.slots.filter((s) => s.editorKind !== 'widget').map(renderField)}
          </div>
        </section>
      ))}
      {schema.fieldGroups
        .filter((g) => g.slots.every((s) => s.editorKind === 'widget'))
        .map((group) => (
          <section key={group.subviewId} className="space-y-1">
            <h3 className={META_SECTION_LABEL_CLASS}>{group.label}</h3>
            <WidgetPlaceholder label={group.label} />
          </section>
        ))}
    </div>
  );
}
