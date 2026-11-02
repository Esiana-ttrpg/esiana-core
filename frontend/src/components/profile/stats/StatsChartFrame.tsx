import type { ReactNode } from 'react';
import type { StatsCategory } from '@shared/statsTypes';
import {
  FOCAL_ELEVATED_CLASS,
  META_SECTION_LABEL_CLASS,
  META_TABLE_HEAD_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';

export function StatsSectionHeader({
  title,
  help,
}: {
  title: string;
  help?: string;
  /** @deprecated Kept for call-site compatibility; no longer drives accents. */
  category?: StatsCategory;
}) {
  return (
    <header className="space-y-2">
      <h3 className={`${META_SECTION_LABEL_CLASS} text-base text-foreground`}>{title}</h3>
      {help ? <p className="max-w-3xl text-sm text-muted">{help}</p> : null}
    </header>
  );
}

export function StatsChartFrame({
  title,
  help,
  children,
  table,
}: {
  title: string;
  help?: string;
  children: ReactNode;
  table?: { headers: string[]; rows: string[][] };
}) {
  return (
    <article className={`${FOCAL_ELEVATED_CLASS} space-y-3 rounded-lg border border-border p-4`}>
      <div className="space-y-1">
        <h4 className={`${TYPE_META_CLASS} text-foreground`}>{title}</h4>
        {help ? <p className="text-sm text-muted">{help}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
      {table && table.rows.length > 0 ? (
        <div className="overflow-x-auto border-t border-border pt-3">
          <table className="w-full min-w-0 text-left text-sm">
            <thead>
              <tr>
                {table.headers.map((header) => (
                  <th key={header} className={`${META_TABLE_HEAD_CLASS} pr-3`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.join('|')} className="border-t border-border">
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${index}`} className="py-1.5 pr-3 text-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}

export function StatsEmptyState({ message }: { message: string }) {
  return (
    <div className={`${FOCAL_ELEVATED_CLASS} rounded-lg border border-dashed border-border px-4 py-5`}>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function StatsLoadingState({ message }: { message: string }) {
  return (
    <div className={`${FOCAL_ELEVATED_CLASS} animate-pulse space-y-3 rounded-lg border border-border p-4`}>
      <div className="h-4 w-1/3 rounded bg-border" />
      <div className="h-28 rounded bg-border" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
