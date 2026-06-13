/** Format a human trust line for ongoing campaigns. */
export function formatRecruitmentContinuityLine(params: {
  currentSession: number;
  createdAt: string;
  sessionDuration?: string | null;
  estimatedLength?: string | null;
}): string | null {
  const parts: string[] = [];
  if (params.currentSession > 0) {
    parts.push(`Session ${params.currentSession}`);
  }

  const created = new Date(params.createdAt);
  if (!Number.isNaN(created.getTime())) {
    const monthYear = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(created);
    parts.push(`Ongoing campaign since ${monthYear}`);
  }

  const duration = params.sessionDuration?.trim();
  if (duration) {
    parts.push(duration.startsWith('~') ? duration : `~${duration}`);
  } else if (params.estimatedLength?.trim()) {
    parts.push(params.estimatedLength.trim());
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}

export type ScheduleOverlapLabel = 'strong' | 'partial' | 'unknown';

export function formatScheduleOverlapLabel(label: ScheduleOverlapLabel): string {
  switch (label) {
    case 'strong':
      return 'Strong';
    case 'partial':
      return 'Partial';
    default:
      return 'Unknown';
  }
}
