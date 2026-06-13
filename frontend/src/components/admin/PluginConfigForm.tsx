import type { PluginConfigTemplateField } from '@/lib/pluginManifest';
import { FieldLabel } from '@/components/admin/AdminSectionCard';
import { controlClasses, textareaClasses } from '@/components/admin/adminFormStyles';

function configValue(
  config: Record<string, unknown>,
  key: string,
  type: PluginConfigTemplateField['type'],
): string | boolean {
  const value = config[key];
  if (type === 'checkbox') {
    return typeof value === 'boolean' ? value : false;
  }
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? value : '';
}

export function PluginConfigForm({
  template,
  config,
  onChange,
}: {
  template: PluginConfigTemplateField[];
  config: Record<string, unknown>;
  onChange: (key: string, value: string | boolean) => void;
}) {
  if (template.length === 0) {
    return (
      <p className="text-sm text-muted">
        No configuration fields defined for this plugin.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {template.map((field) => {
        if (field.type === 'checkbox') {
          return (
            <label
              key={field.key}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 sm:col-span-2"
            >
              <input
                type="checkbox"
                checked={configValue(config, field.key, field.type) as boolean}
                onChange={(e) => onChange(field.key, e.target.checked)}
                className="size-4 rounded border-border text-primary0"
              />
              <span className="text-sm text-foreground">{field.label}</span>
            </label>
          );
        }

        if (field.type === 'select' && field.options?.length) {
          return (
            <div key={field.key}>
              <FieldLabel>{field.label}</FieldLabel>
              <select
                value={configValue(config, field.key, 'text') as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={controlClasses}
              >
                <option value="">Select…</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        const isTextarea = field.type === 'textarea';
        const InputTag = isTextarea ? 'textarea' : 'input';
        const inputType =
          field.type === 'password'
            ? 'password'
            : field.type === 'url'
              ? 'url'
              : field.type === 'number'
                ? 'number'
                : 'text';

        return (
          <div
            key={field.key}
            className={isTextarea ? 'sm:col-span-2' : undefined}
          >
            <FieldLabel>{field.label}</FieldLabel>
            <InputTag
              {...(isTextarea
                ? { rows: 3 }
                : { type: inputType, autoComplete: 'off' })}
              value={configValue(config, field.key, field.type) as string}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={isTextarea ? textareaClasses : controlClasses}
            />
          </div>
        );
      })}
    </div>
  );
}
