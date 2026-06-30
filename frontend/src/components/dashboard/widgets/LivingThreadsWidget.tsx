import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, GitBranch, Lightbulb } from 'lucide-react';
import type {
  DashboardOpenThread,
  DashboardThreadBundle,
} from '@/lib/dashboardConfig';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  THREAD_KIND_LABELS,
  THREAD_KIND_TONE_CLASS,
  THREAD_STATUS_CLASS,
  THREAD_HUB_ZONE_CLASS,
  THREAD_SIGNAL_CHIP_CLASS,
  threadSignalLabel,
} from '@/lib/threadVisualTokens';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface LivingThreadsWidgetProps {
  campaignHandle: string;
  bundle: DashboardThreadBundle;
  customizeMode?: boolean;
  onHide?: () => void;
}

function ThreadRow({
  campaignHandle,
  thread,
  variant,
}: {
  campaignHandle: string;
  thread: DashboardOpenThread;
  variant: 'authored' | 'theory' | 'resolved';
}) {
  const { flatPages } = useWiki();
  const kindClass =
    variant === 'theory'
      ? THREAD_KIND_TONE_CLASS.theory
      : THREAD_KIND_TONE_CLASS[thread.threadKind];
  const linkClass =
    variant === 'theory'
      ? 'hover:border-cyan-500/40 hover:text-cyan-100'
      : 'hover:border-amber-500/40 hover:text-amber-100';

  return (
    <li>
      <Link
        to={campaignWikiPath(campaignHandle, thread.id, flatPages)}
        className={`block rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm text-foreground transition-colors ${linkClass}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 flex-1 font-medium leading-snug">
            {thread.title}
          </span>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${THREAD_STATUS_CLASS[thread.threadStatus]}`}
          >
            {thread.threadStatus}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${kindClass}`}
          >
            {THREAD_KIND_LABELS[thread.threadKind]}
          </span>
          {thread.threadSignals?.map((signal) => (
            <span key={signal} className={THREAD_SIGNAL_CHIP_CLASS}>
              {threadSignalLabel(signal as import('@shared/threadSignals').ThreadSignalId)}
            </span>
          ))}
        </div>
        {thread.snippet ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] text-muted">
            {thread.snippet}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

export function LivingThreadsWidget({
  campaignHandle,
  bundle,
  customizeMode,
  onHide,
}: LivingThreadsWidgetProps) {
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const hasLiving = bundle.living.length > 0;
  const hasTheories = bundle.theories.length > 0;
  const hasResolved = bundle.recentlyResolved.length > 0;
  const empty = !hasLiving && !hasTheories && !hasResolved;

  return (
    <DashboardWidgetShell
      title="Living Threads"
      icon={<GitBranch className="size-4 text-amber-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {empty ? (
        <p className="text-sm text-muted">
          No open narrative threads yet. Add threads under the Narrative Threads wiki
          category.
        </p>
      ) : (
        <div className="space-y-4">
          {hasLiving ? (
            <section>
              <h4 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
                Narrative pressure
              </h4>
              <ul className="space-y-2">
                {bundle.living.map((thread) => (
                  <ThreadRow
                    key={thread.id}
                    campaignHandle={campaignHandle}
                    thread={thread}
                    variant="authored"
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {hasTheories ? (
            <section className={THREAD_HUB_ZONE_CLASS.theories}>
              <h4 className={`mb-2 flex items-center gap-1.5 ${META_SECTION_LABEL_CLASS} text-cyan-200/80`}>
                <Lightbulb className="size-3" aria-hidden />
                Player theories
              </h4>
              <ul className="space-y-2">
                {bundle.theories.map((thread) => (
                  <ThreadRow
                    key={thread.id}
                    campaignHandle={campaignHandle}
                    thread={thread}
                    variant="theory"
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {hasResolved ? (
            <section>
              <button
                type="button"
                onClick={() => setResolvedOpen((open) => !open)}
                className={`mb-2 flex w-full items-center gap-1 ${META_SECTION_LABEL_CLASS} hover:text-foreground`}
              >
                {resolvedOpen ? (
                  <ChevronDown className="size-3" aria-hidden />
                ) : (
                  <ChevronRight className="size-3" aria-hidden />
                )}
                Recently resolved ({bundle.recentlyResolved.length})
              </button>
              {resolvedOpen ? (
                <ul className="space-y-2 opacity-90">
                  {bundle.recentlyResolved.map((thread) => (
                    <ThreadRow
                      key={thread.id}
                      campaignHandle={campaignHandle}
                      thread={thread}
                      variant="resolved"
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </DashboardWidgetShell>
  );
}
