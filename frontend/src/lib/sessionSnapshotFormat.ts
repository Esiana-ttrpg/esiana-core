import { resolveIdentityDisplay } from '@/hooks/useIdentityDisplay';
import type {
  CombinedSessionNotesPayload,
  SessionAuthorColumn,
} from '@/types/wiki';

export function visibleColumns(
  payload: CombinedSessionNotesPayload,
): SessionAuthorColumn[] {
  return payload.columns.filter((col) => !col.masked && col.hasNotes);
}

export function sortColumnsChronologically(
  columns: SessionAuthorColumn[],
): SessionAuthorColumn[] {
  return [...columns].sort((a, b) => {
    const keyCmp = a.sortKey.localeCompare(b.sortKey);
    if (keyCmp !== 0) return keyCmp;
    return a.label.localeCompare(b.label);
  });
}

export function formatSessionSnapshotMarkdown(
  payload: CombinedSessionNotesPayload,
  opts: { campaignName: string },
): { title: string; markdown: string; warnings: string[] } {
  const warnings: string[] = [];
  const { session } = payload;
  const title = session.title || 'Session notes';

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Campaign:** ${opts.campaignName}`);
  if (session.fantasyDateLabel) {
    lines.push(`**In-world date:** ${session.fantasyDateLabel}`);
  } else {
    lines.push('**In-world date:** Unknown');
    warnings.push('No fantasy calendar date was recorded for this session.');
  }
  lines.push(
    `**Played:** ${new Date(session.sessionCreatedAt).toLocaleString()}`,
  );
  if (session.locationTitle) {
    lines.push(`**Location:** ${session.locationTitle}`);
  }
  lines.push('');

  if (payload.entitiesMentioned.length > 0) {
    lines.push('## Entities mentioned');
    lines.push('');
    for (const entity of payload.entitiesMentioned) {
      lines.push(`- ${entity.title}`);
    }
    lines.push('');
  }

  const ordered = sortColumnsChronologically(visibleColumns(payload));
  if (ordered.length === 0) {
    warnings.push('No player notes with content were included in this snapshot.');
  }

  for (const column of ordered) {
    const heading = resolveIdentityDisplay(column).primaryLabel;
    lines.push(`## ${heading}${column.isDmRole ? ' (DM)' : ''}`);
    lines.push('');
    lines.push(column.markdown);
    lines.push('');
  }

  return {
    title,
    markdown: lines.join('\n').trimEnd(),
    warnings,
  };
}
