import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import type { ForeshadowingChainEntry } from '../../../shared/narrativeForeshadowingTracker.js';
import {
  buildForeshadowingChainEntry,
  detectForeshadowingIssues,
  type ForeshadowingThreadRow,
} from '../../../shared/narrativeForeshadowingTracker.js';
import { buildNarrativeForeshadowingIssues } from './buildNarrativeForeshadowingIssues.js';
import { loadNarrativeDiagnosticSubjects } from './narrativeDeadEndScan.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';

function canRunForeshadowingScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

export async function buildNarrativeForeshadowingContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  filterPageId?: string;
}): Promise<ContinuityIssue[]> {
  const { chains, findings } = await loadForeshadowingAnalysis(input);
  void chains;
  const filtered = input.filterPageId
    ? findings.filter((f) => f.threadPageId === input.filterPageId)
    : findings;
  return buildNarrativeForeshadowingIssues(filtered, input.scope);
}

export async function loadForeshadowingAnalysis(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
}): Promise<{
  chains: ForeshadowingChainEntry[];
  findings: ReturnType<typeof detectForeshadowingIssues>;
}> {
  if (!canRunForeshadowingScan(input.role)) {
    return { chains: [], findings: [] };
  }

  const loaded = await loadNarrativeDiagnosticSubjects(input.campaignId, input.role);
  const threadRows: ForeshadowingThreadRow[] = loaded.subjects
    .filter((s) => s.subjectKind === 'open_thread' && s.thread)
    .map((s) => ({
      threadPageId: s.subjectPageId,
      title: s.subjectTitle,
      thread: s.thread!,
      updatedAtMs: s.updatedAt.getTime(),
    }));

  const chains = threadRows.map(buildForeshadowingChainEntry);
  const findings = detectForeshadowingIssues({ threads: threadRows });

  return { chains, findings };
}
