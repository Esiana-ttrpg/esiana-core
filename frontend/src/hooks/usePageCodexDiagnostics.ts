import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { ContinuityIssue } from '@shared/continuityIssue';
import {
  fetchPartyKnowledge,
  type PartyKnowledgeResponse,
} from '@/lib/loreKnowledgeApi';
import {
  resolveCodexRailVariant,
  summarizePageContinuity,
  type CodexRailVariant,
  type PageContinuitySummary,
} from '@/lib/pageCodexDiagnostics';
import {
  fetchPageContinuity,
  fetchUnresolvedWikilinks,
  type UnresolvedWikilinkRow,
} from '@/lib/wikiLoreGraph';

export interface PageCodexDiagnosticsState {
  issues: ContinuityIssue[];
  unresolved: UnresolvedWikilinkRow[];
  summary: PageContinuitySummary;
  discovery: DiscoveryStateProjection | null;
  partyKnowledge: PartyKnowledgeResponse | null;
  railVariant: CodexRailVariant;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePageCodexDiagnostics(
  campaignHandle: string,
  pageId: string,
  enabled: boolean,
  isDMUser: boolean,
): PageCodexDiagnosticsState {
  const [issues, setIssues] = useState<ContinuityIssue[]>([]);
  const [unresolved, setUnresolved] = useState<UnresolvedWikilinkRow[]>([]);
  const [partyKnowledge, setPartyKnowledge] = useState<PartyKnowledgeResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!enabled || !campaignHandle || !pageId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void Promise.all([
      isDMUser
        ? fetchPageContinuity(campaignHandle, pageId)
        : Promise.resolve({ pageId, title: '', issues: [], counts: { critical: 0, warning: 0, info: 0 } }),
      isDMUser
        ? fetchUnresolvedWikilinks(campaignHandle, { sourcePageId: pageId })
        : Promise.resolve([]),
      fetchPartyKnowledge(campaignHandle, pageId).catch(() => null),
    ])
      .then(([continuity, unresolvedRows, knowledge]) => {
        setIssues(continuity.issues);
        setUnresolved(unresolvedRows);
        setPartyKnowledge(knowledge);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load diagnostics');
      })
      .finally(() => setLoading(false));
  }, [campaignHandle, enabled, isDMUser, pageId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const summary = useMemo(
    () => summarizePageContinuity(issues, unresolved, pageId),
    [issues, pageId, unresolved],
  );

  const discovery = partyKnowledge?.discovery ?? null;

  const railVariant = useMemo(
    () =>
      resolveCodexRailVariant({
        isDMUser,
        summary,
        discovery,
        presenceState: partyKnowledge?.presenceState,
      }),
    [discovery, isDMUser, partyKnowledge?.presenceState, summary],
  );

  return {
    issues,
    unresolved,
    summary,
    discovery,
    partyKnowledge,
    railVariant,
    loading,
    error,
    reload,
  };
}
