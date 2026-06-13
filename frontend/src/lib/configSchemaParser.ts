import type { PluginConfigTemplateField } from '@/lib/pluginManifest';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fieldTypeFromSchema(property: Record<string, unknown>): PluginConfigTemplateField['type'] {
  if (Array.isArray(property.enum) && property.enum.every((v) => typeof v === 'string')) {
    return 'select';
  }
  const type = property.type;
  if (type === 'boolean') return 'checkbox';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'string') {
    const format = typeof property.format === 'string' ? property.format : '';
    if (format === 'uri' || format === 'url') return 'url';
    if (format === 'password') return 'password';
    if (property.maxLength && Number(property.maxLength) > 120) return 'textarea';
    return 'text';
  }
  return 'text';
}

function labelForProperty(key: string, property: Record<string, unknown>): string {
  if (typeof property.title === 'string' && property.title.trim()) {
    return property.title.trim();
  }
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase())
    .trim();
}

/**
 * Convert a JSON Schema object subset into PluginConfigForm field metadata.
 */
export function configSchemaToTemplate(
  schema: Record<string, unknown> | undefined,
): PluginConfigTemplateField[] {
  if (!schema || schema.type !== 'object' || !isRecord(schema.properties)) {
    return [];
  }

  const required = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === 'string')
    : [];

  return Object.entries(schema.properties).map(([key, rawProperty]) => {
    const property = isRecord(rawProperty) ? rawProperty : {};
    const type = fieldTypeFromSchema(property);
    const field: PluginConfigTemplateField = {
      key,
      label: labelForProperty(key, property),
      type,
      ...(typeof property.description === 'string'
        ? { placeholder: property.description }
        : {}),
      ...(required.includes(key) ? { required: true } : {}),
    };

    if (property.default !== undefined) {
      if (type === 'checkbox' && typeof property.default === 'boolean') {
        field.defaultValue = property.default;
      } else if (type === 'number' && typeof property.default === 'number') {
        field.defaultValue = property.default;
      } else if (typeof property.default === 'string') {
        field.defaultValue = property.default;
      }
    }

    if (type === 'select' && Array.isArray(property.enum)) {
      field.options = property.enum.filter((v): v is string => typeof v === 'string');
    }

    return field;
  });
}

export function mergePluginConfigFields(input: {
  configTemplate?: PluginConfigTemplateField[];
  configSchema?: Record<string, unknown>;
}): PluginConfigTemplateField[] {
  const fromSchema = configSchemaToTemplate(input.configSchema);
  const manual = input.configTemplate ?? [];
  const seen = new Set<string>();
  const merged: PluginConfigTemplateField[] = [];

  for (const field of [...manual, ...fromSchema]) {
    if (seen.has(field.key)) continue;
    seen.add(field.key);
    merged.push(field);
  }

  return merged;
}
