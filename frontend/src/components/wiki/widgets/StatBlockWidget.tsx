import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
interface StatField {
  key: string;
  value: string;
}

import { interactionInputProps, type WidgetInteractionHandlers } from './widgetInteraction';

interface StatBlockWidgetProps extends WidgetInteractionHandlers {
  content: Record<string, unknown>;
  onChange: (newContent: Record<string, unknown>) => void;
  isEditingLayout: boolean;
}

export function StatBlockWidget({
  content,
  onChange,
  isEditingLayout,
  onInteractionStart,
  onInteractionEnd,
}: StatBlockWidgetProps) {
  const interaction = interactionInputProps({ onInteractionStart, onInteractionEnd });
  const fields = Array.isArray(content.fields) ? (content.fields as StatField[]) : [];

  if (!isEditingLayout && fields.length === 0) {
    return null;
  }

  const effectiveFields =
    fields.length > 0 ? fields : [{ key: 'Stat', value: '' }];

  // In read-only mode, avoid rendering placeholder dashes for empty rows.
  const readableFields = isEditingLayout
    ? effectiveFields
    : effectiveFields.filter((f) => f.value.trim().length > 0);

  if (!isEditingLayout && readableFields.length === 0) return null;

  const updateField = (index: number, key: string, value: string) => {
    const nextFields = effectiveFields.map((field, idx) =>
      idx === index ? { key, value } : field,
    );
    onChange({ fields: nextFields });
  };

  const addField = () => {
    onChange({ fields: [...effectiveFields, { key: 'New stat', value: '' }] });
  };

  return (
    <div
      className={
        isEditingLayout
          ? 'flex h-full flex-col rounded-lg border border-border bg-background/60'
          : ''
      }
    >
      {isEditingLayout && (
        <div className="bg-surface/90 px-4 py-2 META_SECTION_LABEL_CLASS rounded-t-lg">
          Stat Block
        </div>
      )}

      <div className={isEditingLayout ? 'flex-1 space-y-3 p-4' : 'space-y-2'}>
        {readableFields.map((field, index) =>
          isEditingLayout ? (
            <div key={`${field.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <input
                value={field.key}
                disabled={!isEditingLayout}
                onChange={(event) => updateField(index, event.target.value, field.value)}
                {...interaction}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <input
                value={field.value}
                disabled={!isEditingLayout}
                onChange={(event) => updateField(index, field.key, event.target.value)}
                {...interaction}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          ) : (
            <div key={`${field.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <div className={META_SECTION_LABEL_CLASS}>
                {field.key.trim().length > 0 ? field.key : 'Stat'}
              </div>
              <div className="text-sm text-foreground">{field.value}</div>
            </div>
          ),
        )}

        {isEditingLayout && (
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground hover:border-primary"
          >
            Add stat field
          </button>
        )}
      </div>
    </div>
  );
}
