import type { WikiPageVisibility } from '@/lib/createEntityConfig';

export const CREATE_VISIBILITY_OPTIONS: Array<{
  value: WikiPageVisibility;
  label: string;
}> = [
  { value: 'Party', label: 'Players can see' },
  { value: 'DM_Only', label: 'GM only' },
];

interface CreateVisibilityFieldProps {
  value: WikiPageVisibility;
  onChange: (value: WikiPageVisibility) => void;
  disabled?: boolean;
  /** When Public is stored on an existing draft, coerce display to Party in create UI. */
  coercePublicToParty?: boolean;
}

export function CreateVisibilityField({
  value,
  onChange,
  disabled = false,
  coercePublicToParty = true,
}: CreateVisibilityFieldProps) {
  const displayValue =
    coercePublicToParty && value === 'Public' ? 'Party' : value;

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-foreground">Visibility</legend>
      <p className="text-xs text-muted">Should players be able to see this yet?</p>
      <div className="space-y-2">
        {CREATE_VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
          >
            <input
              type="radio"
              name="create-visibility"
              value={option.value}
              checked={displayValue === option.value}
              onChange={() => onChange(option.value)}
              className="border-border text-primary focus:ring-primary/40"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
