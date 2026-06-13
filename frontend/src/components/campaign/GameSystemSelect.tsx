import { useMemo } from 'react';
import {
  GAME_SYSTEM_CATEGORIES,
  GAME_SYSTEMS,
  getGameSystemLabel,
} from '@shared/gameSystems';
import { controlClasses } from '@/components/ui/formStyles';

export interface GameSystemSelectProps {
  gameSystem: string | null;
  customGameSystemName?: string | null;
  onGameSystemChange: (handle: string | null) => void;
  onCustomNameChange?: (name: string | null) => void;
  selectClassName?: string;
  inputClassName?: string;
  showCustomName?: boolean;
  id?: string;
}

export function GameSystemSelect({
  gameSystem,
  customGameSystemName,
  onGameSystemChange,
  onCustomNameChange,
  selectClassName = controlClasses,
  inputClassName = controlClasses,
  showCustomName = true,
  id = 'game-system',
}: GameSystemSelectProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof GAME_SYSTEMS>();
    for (const category of GAME_SYSTEM_CATEGORIES) {
      map.set(
        category,
        GAME_SYSTEMS.filter((entry) => entry.category === category),
      );
    }
    return map;
  }, []);

  const selectedSlug = gameSystem ?? '';
  const isOther = selectedSlug === 'other';

  return (
    <div className="space-y-3">
      <select
        id={id}
        value={selectedSlug}
        onChange={(e) => {
          const next = e.target.value || null;
          onGameSystemChange(next);
          if (next !== 'other' && onCustomNameChange) {
            onCustomNameChange(null);
          }
        }}
        className={selectClassName}
      >
        <option value="">Select a game system…</option>
        {GAME_SYSTEM_CATEGORIES.map((category) => {
          const entries = grouped.get(category) ?? [];
          if (entries.length === 0) return null;
          return (
            <optgroup key={category} label={category}>
              {entries.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {showCustomName && isOther && onCustomNameChange && (
        <div>
          <label htmlFor={`${id}-custom`} className="mb-2 block text-sm text-foreground">
            Custom game system name
          </label>
          <input
            id={`${id}-custom`}
            type="text"
            value={customGameSystemName ?? ''}
            onChange={(e) => onCustomNameChange(e.target.value.trim() || null)}
            placeholder="Enter your ruleset name"
            className={inputClassName}
            required
          />
        </div>
      )}

      {selectedSlug && !isOther && (
        <p className="text-xs text-muted">
          {getGameSystemLabel(selectedSlug)}
        </p>
      )}
    </div>
  );
}

export { getGameSystemLabel };
