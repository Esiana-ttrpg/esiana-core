import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import type { DashboardQuestPage } from '@/lib/dashboardConfig';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import {
  dashboardQuestStatusBadgeClass,
  dashboardQuestStatusLabel,
} from './questLedgerStyles';

interface QuestLedgerWidgetProps {
  campaignHandle: string;
  quests: DashboardQuestPage[];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function QuestLedgerWidget({
  campaignHandle,
  quests,
  customizeMode,
  onHide,
}: QuestLedgerWidgetProps) {
  const { flatPages } = useWiki();

  return (
    <DashboardWidgetShell
      title="Quest Ledger"
      icon={<ScrollText className="size-4 text-emerald-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {quests.length === 0 ? (
        <p className="text-sm text-muted">
          No quest pages found. Add main quests under the Adventure wiki category.
        </p>
      ) : (
        <ul className="space-y-2">
          {quests.map((quest) => (
            <li key={quest.id}>
              <Link
                to={campaignWikiPath(campaignHandle, quest.id, flatPages)}
                className="block rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 font-medium leading-snug">
                    {quest.title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${dashboardQuestStatusBadgeClass(quest.questStatus)}`}
                  >
                    {dashboardQuestStatusLabel(quest.questStatus)}
                  </span>
                </div>

                {quest.progress.total > 0 && (
                  <div className="mt-2">
                    <div className="mb-0.5 flex justify-between text-[10px] text-muted">
                      <span>Checklist</span>
                      <span>
                        {quest.progress.completed}/{quest.progress.total}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-emerald-500/80 transition-all"
                        style={{ width: `${quest.progress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {quest.snippet ? (
                  <p className="mt-1.5 line-clamp-2 text-[11px] text-muted">
                    {quest.snippet}
                  </p>
                ) : null}

                <span className="mt-1.5 block text-[10px] text-muted">
                  Updated{' '}
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                    new Date(quest.updatedAt),
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
