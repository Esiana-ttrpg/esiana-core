import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { TYPED_INFOBOX_SURFACE_KEYS } from '@/lib/entitySurfaceProfile';
import type { InfoboxField } from '@/types/wiki';
import { interactionInputProps, type WidgetInteractionHandlers } from './widgetInteraction';

function resolveInfoboxDisplayValue(
  value: string,
  pageTitleById: Map<string, string>,
): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return pageTitleById.get(trimmed) ?? trimmed;
}

interface InfoboxWidgetProps extends WidgetInteractionHandlers {
  content: Record<string, unknown>;
  onChange: (newContent: Record<string, unknown>) => void;
  isEditingLayout: boolean;
  templateType: string;
  pageMetadata?: unknown;
  surfaceProfileKey?: SurfaceProfileKey | string | null;
}

function isTagKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return normalized === 'tag' || normalized === 'tags';
}

function getDefaultFields(templateType: string): InfoboxField[] {
  if (templateType === 'CHARACTER') {
    return [];
  }

  if (templateType === 'LOCATION') {
    return [
      { key: 'Type', value: '' },
      { key: 'Ruler/Authority', value: '' },
      { key: 'Population', value: '' },
      { key: 'Region', value: '' },
    ];
  }

  if (templateType === 'ORGANIZATION') {
    return [
      { key: 'Type', value: '' },
      { key: 'Region', value: '' },
      { key: 'Parent', value: '' },
      { key: 'Motivation', value: '' },
    ];
  }

  if (templateType === 'FAMILY') {
    return [
      { key: 'Type', value: '' },
      { key: 'Region', value: '' },
      { key: 'Parent', value: '' },
      { key: 'Status', value: '' },
    ];
  }

  return [
    { key: 'Title', value: '' },
    { key: 'Status', value: '' },
    { key: 'Notes', value: '' },
  ];
}

function ProjectedInfoboxPreview({
  fields,
  pageTitleById,
  isEditingLayout,
}: {
  fields: InfoboxField[];
  pageTitleById: Map<string, string>;
  isEditingLayout: boolean;
}) {
  if (fields.length === 0 && !isEditingLayout) return null;

  return (
    <div
      className={`h-full space-y-3 ${
        isEditingLayout
          ? 'pointer-events-none select-none rounded-lg border border-dashed border-border/80 bg-muted/10 p-4 opacity-80'
          : ''
      }`}
      tabIndex={-1}
      aria-readonly="true"
    >
      {isEditingLayout ? (
        <div className="flex items-center gap-1.5 META_SECTION_LABEL_CLASS">
          <Lock className="size-3" aria-hidden />
          Synced from metadata
        </div>
      ) : null}
      {fields.map((f, index) => {
        const display = resolveInfoboxDisplayValue(f.value, pageTitleById);
        if (!display.trim()) return null;
        const isLead = index === 0;
        return (
          <div key={`${f.key}-${index}`} className={isLead ? 'space-y-0.5' : 'space-y-0.5 pt-2'}>
            {isLead ? (
              <>
                <p className="text-base font-semibold text-foreground">{display}</p>
                {fields.length > 1 ? (
                  <p className="text-xs text-muted">{f.key}</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-xs text-muted">{f.key}</p>
                <p className="text-sm text-foreground">{display}</p>
              </>
            )}
          </div>
        );
      })}
      {isEditingLayout && fields.length === 0 ? (
        <p className="text-xs text-muted">
          Details sync from page blocks (overview, metadata).
        </p>
      ) : null}
    </div>
  );
}

export function InfoboxWidget({
  content,
  onChange,
  isEditingLayout,
  templateType,
  pageMetadata,
  surfaceProfileKey,
  onInteractionStart,
  onInteractionEnd,
}: InfoboxWidgetProps) {
  const wiki = useOptionalWiki();
  const pageTitleById = useMemo(
    () => new Map((wiki?.flatPages ?? []).map((page) => [page.id, page.title])),
    [wiki?.flatPages],
  );
  const interaction = interactionInputProps({ onInteractionStart, onInteractionEnd });
  const resolvedSurfaceKey = (surfaceProfileKey as SurfaceProfileKey | null) ?? null;
  const usesProjection =
    (resolvedSurfaceKey && TYPED_INFOBOX_SURFACE_KEYS.has(resolvedSurfaceKey)) ||
    ['CHARACTER', 'ORGANIZATION', 'FAMILY', 'BESTIARY'].includes(templateType);

  const projectedFields = useMemo(() => {
    if (!usesProjection) return [];
    return buildInfoboxProjection(
      templateType,
      pageMetadata,
      wiki?.flatPages ?? [],
      resolvedSurfaceKey,
    );
  }, [usesProjection, templateType, pageMetadata, wiki?.flatPages, resolvedSurfaceKey]);

  const defaultFields = useMemo(
    () => getDefaultFields(templateType),
    [templateType],
  );

  const parsedContentFields = useMemo(() => {
    const raw = (content as { fields?: unknown })?.fields;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((f) => ({
        key: typeof (f as InfoboxField)?.key === 'string' ? (f as InfoboxField).key : '',
        value: typeof (f as InfoboxField)?.value === 'string' ? (f as InfoboxField).value : '',
      }))
      .filter((field) => !isTagKey(field.key));
  }, [content]);

  const editFields = useMemo(() => {
    return parsedContentFields.length > 0 ? parsedContentFields : defaultFields;
  }, [parsedContentFields, defaultFields]);

  const readOnlyFields = useMemo(() => {
    if (usesProjection) return projectedFields;
    return parsedContentFields.filter((f) => {
      const key = f.key.trim();
      const value = f.value.trim();
      return key.length > 0 && value.length > 0;
    });
  }, [usesProjection, projectedFields, parsedContentFields]);

  useEffect(() => {
    if (!isEditingLayout || usesProjection) return;
    if (templateType === 'CHARACTER') return;
    const raw = (content as { fields?: unknown })?.fields;
    if (Array.isArray(raw) && raw.length > 0) return;
    onChange({ fields: defaultFields });
  }, [content, defaultFields, isEditingLayout, onChange, templateType, usesProjection]);

  const [draft, setDraft] = useState<InfoboxField[]>(editFields);

  useEffect(() => {
    setDraft(editFields);
  }, [editFields]);

  function updateField(index: number, patch: Partial<InfoboxField>) {
    setDraft((rows) => {
      const next = rows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      onChange({ fields: next });
      return next;
    });
  }

  function addField() {
    const next = [...draft, { key: '', value: '' }];
    setDraft(next);
    onChange({ fields: next });
  }

  function removeField(index: number) {
    const next = draft.filter((_, i) => i !== index);
    setDraft(next);
    onChange({ fields: next });
  }

  if (usesProjection) {
    return (
      <ProjectedInfoboxPreview
        fields={readOnlyFields}
        pageTitleById={pageTitleById}
        isEditingLayout={isEditingLayout}
      />
    );
  }

  const display = isEditingLayout ? draft : readOnlyFields;

  if (!isEditingLayout && display.length === 0) return null;

  return (
    <div
      className={
        isEditingLayout
          ? 'flex h-full flex-col rounded-lg border border-border bg-background/60'
          : 'h-full'
      }
    >
      {isEditingLayout && (
        <div className="rounded-t-lg bg-surface/90 px-4 py-2 META_SECTION_LABEL_CLASS">
          Metadata
        </div>
      )}

      <div className={isEditingLayout ? 'flex-1 space-y-3 p-4' : 'space-y-3'}>
        {display.map((f, index) => (
          <div
            key={`${f.key}-${index}`}
            className={isEditingLayout ? 'space-y-1' : 'space-y-0.5'}
          >
            {isEditingLayout ? (
              <>
                <input
                  value={f.key}
                  onChange={(e) => updateField(index, { key: e.target.value })}
                  {...interaction}
                  placeholder="Key"
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={f.value}
                    onChange={(e) => updateField(index, { value: e.target.value })}
                    {...interaction}
                    placeholder="Value"
                    className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="rounded p-1 text-muted hover:bg-red-950/50 hover:text-red-300"
                    aria-label="Remove metadata field"
                    title="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={META_SECTION_LABEL_CLASS}>
                  {f.key}
                </div>
                <div className="text-sm text-foreground">
                  {resolveInfoboxDisplayValue(f.value, pageTitleById)}
                </div>
              </>
            )}
          </div>
        ))}

        {isEditingLayout && (
          <div className="pt-1">
            <button
              type="button"
              onClick={addField}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/30 py-2 text-xs text-foreground hover:border-primary/40 hover:text-primary"
            >
              <Plus className="size-3.5" />
              Add Custom Field
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
