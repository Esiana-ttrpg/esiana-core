import { Plus, X } from 'lucide-react';
import type { MetadataField } from '@/types/wiki';

interface QuickInfoPanelProps {
  fields: MetadataField[];
  onFieldsChange: (fields: MetadataField[]) => void;
  onFieldBlur?: (key: string, value: string) => void;
}

export function QuickInfoPanel({
  fields,
  onFieldsChange,
  onFieldBlur,
}: QuickInfoPanelProps) {
  function handleKeyChange(index: number, newKey: string) {
    if (!newKey.trim()) return;
    const updated = [...fields];
    updated[index].key = newKey.trim();
    onFieldsChange(updated);
  }

  function handleValueChange(index: number, newValue: string) {
    const updated = [...fields];
    updated[index].value = newValue;
    onFieldsChange(updated);
    if (onFieldBlur) {
      onFieldBlur(updated[index].key, newValue);
    }
  }

  function handleAddField() {
    const newKey = `Field ${fields.length + 1}`;
    onFieldsChange([...fields, { key: newKey, value: '' }]);
  }

  function handleRemoveField(index: number) {
    const updated = fields.filter((_, i) => i !== index);
    onFieldsChange(updated);
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Quick Info
        </h2>
        <button
          type="button"
          onClick={handleAddField}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-elevated"
          title="Add custom field"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted italic">
          No quick info fields yet. Click "Add" to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={field.key}
                onChange={(e) => handleKeyChange(index, e.target.value)}
                className="w-1/3 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60"
                placeholder="Field name"
              />
              <input
                value={field.value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                onBlur={() => onFieldBlur?.(field.key, field.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60"
                placeholder="Value"
              />
              <button
                type="button"
                onClick={() => handleRemoveField(index)}
                className="rounded px-2 py-2 text-muted hover:bg-elevated hover:text-red-400"
                title="Remove field"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
