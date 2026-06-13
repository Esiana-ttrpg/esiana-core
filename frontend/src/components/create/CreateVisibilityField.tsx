import type { WikiPageVisibility } from '@/lib/createEntityConfig';

export const CREATE_VISIBILITY_OPTIONS: Array<{
  value: WikiPageVisibility;
  label: string;
}> = [
  { value: 'Party', label: 'Player visible' },
  { value: 'DM_Only', label: 'Hidden from players' },
  { value: 'Public', label: 'Everyone in campaign' },
];

interface CreateVisibilityFieldProps {
  value: WikiPageVisibility;
  onChange: (value: WikiPageVisibility) => void;
  disabled?: boolean;
}

export function CreateVisibilityField({
  value,
  onChange,
  disabled = false,
}: CreateVisibilityFieldProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-foreground">Visibility</legend>
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
              checked={value === option.value}
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
