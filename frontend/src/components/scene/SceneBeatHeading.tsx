import type { ReactNode } from 'react';
import type { SceneBeatType } from '@/lib/sceneMetadata';
import { SceneBeatChip } from '@/components/scene/SceneBeatChip';

interface SceneBeatHeadingProps {
  title: string;
  beatType?: SceneBeatType | string | null;
  meta?: ReactNode;
  className?: string;
  titleClassName?: string;
}

/** Beat-first scan layout: dramatic role before scene title. */
export function SceneBeatHeading({
  title,
  beatType,
  meta,
  className = '',
  titleClassName = 'text-sm font-medium text-foreground',
}: SceneBeatHeadingProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {beatType ? <SceneBeatChip beatType={beatType} emphasis="primary" /> : null}
      <div className={titleClassName}>{title}</div>
      {meta ? <div className="text-[10px] text-muted-foreground">{meta}</div> : null}
    </div>
  );
}
