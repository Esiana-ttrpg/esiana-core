/**
 * Project a CharacterField value to its user-facing searchable representation.
 *
 * Contract: the projected text MUST be discoverable via CAST(value AS TEXT)
 * in the candidate SQL. Scalar types project as their JSON-literal form;
 * JSON-typed fields are not searchable.
 */
export function characterFieldValueToSearchText(
  fieldType: string,
  value: unknown,
): string | null {
  if (value == null) return null;
  const type = fieldType.toUpperCase();
  if (type === 'JSON') return null;
  if (type === 'STRING' || type === 'DATE' || type === 'ENUM') {
    return typeof value === 'string' && value.trim() ? value : null;
  }
  if (type === 'NUMBER') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return String(value);
  }
  if (type === 'BOOLEAN') {
    if (typeof value !== 'boolean') return null;
    return value ? 'true' : 'false';
  }
  // Unknown type: only expose plain strings/numbers/booleans.
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return null;
}
