export type DashboardSessionState = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'skipped' | 'draft';

export function dashboardSessionState(session: {
  status?: string; plannedStartAt: string | null; plannedEndAt?: string | null;
}, now = Date.now()): DashboardSessionState {
  if (session.status === 'COMPLETED') return 'completed';
  if (session.status === 'CANCELLED') return 'cancelled';
  if (session.status === 'SKIPPED') return 'skipped';
  if (session.status === 'DRAFT') return 'draft';
  const start = Date.parse(session.plannedStartAt ?? '');
  const end = Date.parse(session.plannedEndAt ?? '');
  return start <= now && end > now ? 'ongoing' : 'scheduled';
}

export interface DashboardSessionFollowUp {
  myNotes: { state: 'added' | 'not_added' | 'unavailable'; href: string | null; canEdit: boolean };
  contributors: Array<{ userId: string; label: string; href: string }>;
  notesHref: string;
  /** Null means audio is disabled, not that a recording is missing. */
  media: {
    audio: { available: boolean; href: string | null; durationMs: number | null };
    transcript: { state: 'unavailable' | 'not_requested' | 'queued' | 'processing' | 'ready' | 'failed'; href: string | null };
  } | null;
}
