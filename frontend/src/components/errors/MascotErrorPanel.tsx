import type { ReactNode } from 'react';
import { BlahajNibbleHeading } from './BlahajNibbleHeading';
import { BLAHAJ_SOURCE_URL } from './errorCopy';

interface MascotErrorPanelProps {
  code?: string | number;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function MascotErrorPanel({
  code,
  title,
  description,
  action,
  className = '',
}: MascotErrorPanelProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center ${className}`}
      role="alert"
    >
      <BlahajNibbleHeading code={code} title={title} />
      {description ? (
        <p className="mt-4 max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
      <p className="mt-8 max-w-lg text-[10px] leading-relaxed text-muted/80">
        BLÅHAJ shark art © 2022 Evangelos &quot;GeopJr&quot; Paterakis ·{' '}
        <a
          href={BLAHAJ_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-muted hover:underline"
        >
          BSD-2-Clause
        </a>
      </p>
    </div>
  );
}
