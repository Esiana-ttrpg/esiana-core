import type { SceneBeatType } from '@/lib/sceneMetadata';
import {
  formatSceneBeatLabel,
  sceneBeatChipClass,
  sceneBeatHint,
} from '@/lib/sceneBeatVisualTokens';

interface SceneBeatChipProps {
  beatType: SceneBeatType | string;
  emphasis?: 'primary' | 'inline';
  title?: string;
  className?: string;
}

export function SceneBeatChip({
  beatType,
  emphasis = 'inline',
  title,
  className = '',
}: SceneBeatChipProps) {
  const label = formatSceneBeatLabel(beatType);
  if (!label) return null;

  const hint = title ?? sceneBeatHint(beatType) ?? undefined;
  const sizeClass =
    emphasis === 'primary'
      ? 'px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide'
      : 'px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide';

  return (
    <span
      className={`inline-flex items-center rounded border ${sizeClass} ${sceneBeatChipClass(beatType)} ${className}`}
      title={hint}
    >
      {label}
    </span>
  );
}
