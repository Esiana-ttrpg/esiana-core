export const SAFETY_CATEGORIES = ['recording_privacy', 'content', 'other'] as const;
export const SAFETY_STATUSES = ['open', 'in_review', 'resolved', 'declined'] as const;
export const SAFETY_CONTENT_TYPES = ['recording', 'session', 'page'] as const;
export function safetyTransitionAllowed(previous: string, next: string, manager: boolean, reason?: string): boolean {
  if (previous === next) return false;
  if (!manager) return (previous === 'resolved' || previous === 'declined') && next === 'open';
  if ((next === 'declined' || next === 'resolved') && !reason?.trim()) return false;
  return SAFETY_STATUSES.includes(next as typeof SAFETY_STATUSES[number]);
}
