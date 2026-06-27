import type { ReactNode } from 'react';
import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className={META_FIELD_LABEL_CLASS}>{children}</span>;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}
