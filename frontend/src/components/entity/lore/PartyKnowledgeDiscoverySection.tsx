import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoreStickySubheader, loreClaimText } from '@/components/entity/lore/LoreKnowledgeUi';
import { bulkRevealContentPresence } from '@/lib/contentPresence';
import {
  fetchPartyKnowledge,
  type PartyKnowledgeResponse,
} from '@/lib/loreKnowledgeApi';
import type { LoreClaimWithSources } from '@/lib/loreKnowledgeApi';
import { DiscoveryStateBadge } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import type { PartyKnowledgeGroup } from '@shared/discoveryProjection';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

const GROUP_LABELS: Record<PartyKnowledgeGroup, string> = {
  confirmed: 'Confirmed',
  suspected: 'Rumored',
  disproven: 'Disproven',
  contested: 'Contested',
};

const GROUP_TAGS: Partial<Record<PartyKnowledgeGroup, string>> = {
  suspected: 'Rumor',
  contested: 'Disputed',
};

function revelationFootnote(claim: LoreClaimWithSources): string | null {
  const source = claim.revelation?.source;
  if (!source) return null;
  if (source.type === 'SESSION') return 'Learned in session';
  if (source.type === 'MANUAL') return 'Recorded by the GM';
  if (source.type === 'IMPORT') return 'From campaign import';
  return null;
}

function ClaimGroup({
  group,
  claims,
}: {
  group: PartyKnowledgeGroup;
  claims: LoreClaimWithSources[];
}) {
  if (claims.length === 0) return null;
  const tag = GROUP_TAGS[group];
  return (
    <section className="space-y-2">
      <LoreStickySubheader badge={tag}>{GROUP_LABELS[group]}</LoreStickySubheader>
      <ul className="space-y-3">
        {claims.map((claim) => (
          <li
            key={claim.id}
            className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2.5"
          >
            <p className={loreClaimText}>{claim.statement}</p>
            {claim.sources.length > 0 ? (
              <p className="mt-1.5 text-xs text-muted">
                {claim.sources
                  .map((source) => source.label?.trim() || source.sourceType)
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            {revelationFootnote(claim) ? (
              <p className="mt-1.5 text-[11px] text-muted">{revelationFootnote(claim)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface PartyKnowledgeDiscoverySectionProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  onRevealEntry?: () => void;
}

export function PartyKnowledgeDiscoverySection({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  onRevealEntry,
}: PartyKnowledgeDiscoverySectionProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [data, setData] = useState<PartyKnowledgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealBusy, setRevealBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPartyKnowledge(campaignHandle, pageId));
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReveal = async () => {
    setRevealBusy(true);
    try {
      await bulkRevealContentPresence(
        campaignHandle,
        [{ entityType: 'wiki_page', entityId: pageId }],
        'REVEALED',
        { workflowKey: 'manual_reveal' },
      );
      onRevealEntry?.();
      await load();
    } finally {
      setRevealBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading party knowledge…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-4 text-sm text-muted">No party knowledge recorded yet.</p>
    );
  }

  const hasClaims =
    data.groups.confirmed.length +
      data.groups.suspected.length +
      data.groups.disproven.length +
      data.groups.contested.length >
    0;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-sm font-medium text-foreground">
            What the party knows
          </h3>
          <DiscoveryStateBadge discovery={data.discovery} surface="header" compact />
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Beliefs and rumors the party has uncovered — distinct from GM canon.
        </p>
      </div>

      {!hasClaims ? (
        <p className="text-sm text-muted">
          The party has not formed any recorded beliefs about this subject yet.
        </p>
      ) : (
        <div className="space-y-5">
          <ClaimGroup group="contested" claims={data.groups.contested} />
          <ClaimGroup group="confirmed" claims={data.groups.confirmed} />
          <ClaimGroup group="suspected" claims={data.groups.suspected} />
          <ClaimGroup group="disproven" claims={data.groups.disproven} />
        </div>
      )}

      {isDMUser && data.canonDelta && data.canonDelta.length > 0 ? (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Canon contradictions
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-muted">
            {data.canonDelta.map((row) => (
              <li key={row.claimId}>
                Party: {row.partyState ?? 'unknown'} — Canon: {row.gmResolution}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isDMUser ? (
        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
          <button
            type="button"
            disabled={revealBusy}
            onClick={() => void handleReveal()}
            className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted/30 disabled:opacity-50"
          >
            {revealBusy ? 'Revealing…' : 'Reveal entry to party'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PartyKnowledgeReadSection({
  campaignHandle,
  pageId,
}: {
  campaignHandle: string;
  pageId: string;
}) {
  return (
    <PartyKnowledgeDiscoverySection
      campaignHandle={campaignHandle}
      pageId={pageId}
      isDMUser={false}
    />
  );
}
