import type { DashboardQuestStatus } from '@/lib/dashboardConfig';

export function dashboardQuestStatusLabel(status: DashboardQuestStatus): string {
  return status.replace('_', ' ');
}

export function dashboardQuestStatusBadgeClass(
  status: DashboardQuestStatus,
): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-primary/15 text-primary border-primary/40';
    case 'COMPLETED':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
    case 'FAILED':
    case 'ABANDONED':
      return 'bg-red-500/15 text-red-400 border-red-500/40';
    case 'AVAILABLE':
    default:
      return 'bg-muted/30 text-muted border-border';
  }
}
