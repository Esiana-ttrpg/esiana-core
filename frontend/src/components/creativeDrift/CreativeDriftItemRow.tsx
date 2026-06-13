import { Link } from 'react-router-dom';
import type {
  CreativeDriftFinding,
  DriftDispositionKind,
} from '@shared/creativeDrift';
import { COOLING_BAND_UI_LABELS } from '@shared/creativeDrift';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { patchCreativeDriftDisposition, snoozeUntilDays } from '@/lib/creativeDrift';
import {
  UNRESOLVED_ACTIONS,
  formatLastActive,
} from '@/lib/unresolvedCopy';

interface CreativeDriftItemRowProps {
  campaignHandle: string;
  finding: CreativeDriftFinding;
  onUpdated: () => void;
  onAttachToThread: (entityPageId: string) => void;
}

function resolvePageId(finding: CreativeDriftFinding): string {
  if (finding.subjectKind === 'branch_node') return finding.subjectId;
  return finding.subjectId;
}

function shouldShowCoolingBand(finding: CreativeDriftFinding): boolean {
  if (finding.bucket === 'unused_entities' || finding.bucket === 'dormant_plotlines') {
    return true;
  }
  return finding.coolingBand !== 'recent';
}

function formatStatusLine(finding: CreativeDriftFinding): string {
  const parts = [finding.statusLabel];
  if (shouldShowCoolingBand(finding)) {
    parts.push(COOLING_BAND_UI_LABELS[finding.coolingBand]);
  }
  return parts.join(' \u2022 ');
}

export function CreativeDriftItemRow({
  campaignHandle,
  finding,
  onUpdated,
  onAttachToThread,
}: CreativeDriftItemRowProps) {
  const { flatPages } = useWiki();
  const pageId = resolvePageId(finding);

  async function applyDisposition(
    disposition: DriftDispositionKind,
    snoozeUntil?: string,
  ) {
    await patchCreativeDriftDisposition(campaignHandle, {
      fingerprint: finding.fingerprint,
      disposition,
      snoozeUntil: snoozeUntil ?? null,
    });
    onUpdated();
  }

  return (
    <li className="rounded-lg border border-border/50 bg-elevated/20 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            to={campaignWikiPath(campaignHandle, pageId, flatPages)}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {finding.title}
          </Link>
          <p className="text-xs text-muted">{formatStatusLine(finding)}</p>
          {finding.lastReferencedAt ? (
            <p className="text-xs text-muted">
              {formatLastActive(finding.lastReferencedAt)}
            </p>
          ) : null}
          {finding.reactivationState === 'recently_reawakened' &&
          finding.reactivationCopy ? (
            <p className="text-xs text-primary/80">{finding.reactivationCopy}</p>
          ) : null}
        </div>

        <details className="relative shrink-0">
          <summary className="cursor-pointer list-none rounded px-2 py-1 text-xs text-muted hover:bg-elevated/40 hover:text-foreground">
            Actions
          </summary>
          <div className="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-md border border-border bg-background py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-elevated/40"
              onClick={() => applyDisposition('intentional')}
            >
              {UNRESOLVED_ACTIONS.markIntentional}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-elevated/40"
              onClick={() => applyDisposition('revive_later')}
            >
              {UNRESOLVED_ACTIONS.revisitLater}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-elevated/40"
              onClick={() => applyDisposition('archived')}
            >
              {UNRESOLVED_ACTIONS.archiveToHistory}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-elevated/40"
              onClick={() => applyDisposition('snoozed', snoozeUntilDays(30))}
            >
              {UNRESOLVED_ACTIONS.snooze30Days}
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs hover:bg-elevated/40"
              onClick={() => applyDisposition('snoozed', snoozeUntilDays(90))}
            >
              {UNRESOLVED_ACTIONS.snooze90Days}
            </button>
            {finding.subjectKind === 'wiki_page' ? (
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-elevated/40"
                onClick={() => onAttachToThread(finding.subjectId)}
              >
                {UNRESOLVED_ACTIONS.reconnectToThread}
              </button>
            ) : null}
            <Link
              to={campaignWikiPath(campaignHandle, pageId, flatPages)}
              className="block px-3 py-1.5 text-xs hover:bg-elevated/40"
            >
              {UNRESOLVED_ACTIONS.convertToRumor}
            </Link>
          </div>
        </details>
      </div>
    </li>
  );
}
