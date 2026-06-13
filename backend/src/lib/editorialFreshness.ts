/**
 * Editorial freshness labels (not analytics).
 */

export function formatEditorialFreshness(updatedAt: Date, now = new Date()): string {
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 48) {
    return 'Updated recently';
  }

  const diffDays = diffHours / 24;
  if (diffDays < 7) {
    return 'Expanded this week';
  }

  if (diffDays < 30) {
    const days = Math.floor(diffDays);
    return days === 1 ? 'Updated yesterday' : `Updated ${days} days ago`;
  }

  const diffMonths = diffDays / 30;
  if (diffMonths < 12) {
    const months = Math.floor(diffMonths);
    return months === 1 ? 'Dormant for 1 month' : `Dormant for ${months} months`;
  }

  return 'Dormant for over a year';
}

export function formatRelativeEditAge(updatedAt: Date, now = new Date()): string {
  const diffMs = now.getTime() - updatedAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}
