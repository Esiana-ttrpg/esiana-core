import type { ContinueCandidate } from '@/lib/hubPrioritization';

interface HubWelcomeStripProps {
  displayName: string | null | undefined;
  email: string | null | undefined;
  managedCount: number;
  joinedCount: number;
  unreadCount: number;
  sessionsThisWeek?: number;
  topContinue?: ContinueCandidate | null;
}

function resolveGreetingName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (displayName?.trim()) return displayName.trim();
  if (email?.includes('@')) return email.split('@')[0] ?? 'there';
  return 'there';
}

export function HubWelcomeStrip({
  displayName,
  email,
  managedCount,
  joinedCount,
  unreadCount,
  sessionsThisWeek = 0,
  topContinue,
}: HubWelcomeStripProps) {
  const name = resolveGreetingName(displayName, email);
  const totalTables = managedCount + joinedCount;

  const statParts: string[] = [];
  if (sessionsThisWeek > 0) {
    statParts.push(
      `${sessionsThisWeek} session${sessionsThisWeek === 1 ? '' : 's'} this week`,
    );
  }
  if (totalTables > 0) {
    statParts.push(`${totalTables} active campaign${totalTables === 1 ? '' : 's'}`);
  }
  if (unreadCount > 0) {
    statParts.push(`${unreadCount} unread`);
  }

  const needsAttention =
    topContinue != null &&
    ((topContinue.unreadCount ?? 0) > 0 || topContinue.score >= 50);

  return (
    <div className="rounded-xl border border-border/80 bg-surface/60 px-4 py-3 sm:px-5">
      <p className="text-sm text-foreground">
        Welcome back, <span className="font-semibold">{name}</span>
      </p>
      {statParts.length > 0 ? (
        <p className="mt-1 text-xs text-muted">{statParts.join(' · ')}</p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Jump back into a campaign or open the codex to follow a thread.
        </p>
      )}
      {needsAttention ? (
        <p className="mt-1 text-xs font-medium text-primary">
          {(topContinue!.unreadCount ?? 0) > 0
            ? '1 table needs your attention'
            : '1 table needs your attention'}
        </p>
      ) : null}
    </div>
  );
}
