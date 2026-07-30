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
      return 'border-[color:var(--color-status-warning-border)] bg-[color:var(--color-status-warning-bg)] text-[color:var(--color-status-warning-fg)]';
    case 'FAILED':
    case 'ABANDONED':
      return 'border-[color:var(--color-status-secret-border)] bg-[color:var(--color-status-secret-bg)] text-[color:var(--color-status-secret-fg)]';
    case 'AVAILABLE':
    default:
      return 'bg-muted/30 text-muted border-border';
  }
}
