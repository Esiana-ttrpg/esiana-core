import type { PageContinuitySummary } from '@/lib/pageCodexDiagnostics';
import {
  resolveCodexDiagnosticsChipTone,
  type CodexDiagnosticsChipTone,
} from '@/lib/pageCodexDiagnostics';

const TONE_CLASS: Record<CodexDiagnosticsChipTone, string> = {
  ok: 'border-border/60 bg-surface/60 text-muted hover:border-border hover:text-foreground',
  info: 'border-border bg-surface/60 text-muted hover:border-primary/30',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:border-amber-500/60',
  critical:
    'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200 hover:border-red-500/60',
};

interface CodexDiagnosticsChipProps {
  summary: PageContinuitySummary | null;
  loading?: boolean;
  error?: string | null;
  isCodexRailOpen?: boolean;
  onClick: () => void;
}

export function CodexDiagnosticsChip({
  summary,
  loading = false,
  error = null,
  isCodexRailOpen = false,
  onClick,
}: CodexDiagnosticsChipProps) {
  if (error) return null;

  const tone = summary
    ? resolveCodexDiagnosticsChipTone(summary)
    : ('ok' as CodexDiagnosticsChipTone);
  const count = summary?.totalIssueCount ?? 0;
  const label =
    loading && !summary
      ? 'Codex…'
      : count === 0
        ? 'Codex • OK'
        : `Codex • ${count} issue${count === 1 ? '' : 's'}`;

  const ariaLabel =
    count === 0
      ? 'Codex diagnostics: no issues on this page'
      : `Codex diagnostics: ${count} issue${count === 1 ? '' : 's'} on this page`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading && !summary}
      aria-pressed={isCodexRailOpen && count > 0}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex h-8 max-w-[9rem] items-center rounded-full border px-2.5 text-[11px] font-medium transition-all disabled:opacity-50 ${TONE_CLASS[tone]}`}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}
