import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  bulkRevealContentPresence,
  ContentRevelationStates,
  type ContentRevelationState,
} from '@/lib/contentPresence';
import {
  discoveryControlLabel,
  formatDiscoveryStateLabel,
  formatRichDiscoveryStateLabel,
} from '@/lib/wikiPageHeaderMeta';
import {
  fetchPartyKnowledge,
  type PartyKnowledgeResponse,
} from '@/lib/loreKnowledgeApi';
import { DiscoveryStateBadge } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface CodexDiscoverySectionProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  railCompact: boolean;
  partyKnowledge?: PartyKnowledgeResponse | null;
  partyKnowledgeLoading?: boolean;
  onPartyKnowledgeChanged?: () => void;
  highlightDiscovery?: boolean;
  onOpenDiscoverySubview?: () => void;
}

export function CodexDiscoverySection({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  railCompact,
  partyKnowledge: externalKnowledge,
  partyKnowledgeLoading,
  onPartyKnowledgeChanged,
  highlightDiscovery = false,
  onOpenDiscoverySubview,
}: CodexDiscoverySectionProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const usesExternalKnowledge = externalKnowledge !== undefined;

  const [presenceState, setPresenceState] = useState<ContentRevelationState>(
    ContentRevelationStates.REVEALED,
  );
  const [availableFromEpochMinute, setAvailableFromEpochMinute] = useState('');
  const [partyKnowledge, setPartyKnowledge] = useState<PartyKnowledgeResponse | null>(
    externalKnowledge ?? null,
  );
  const [loading, setLoading] = useState(!usesExternalKnowledge);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usesExternalKnowledge) {
      setPartyKnowledge(externalKnowledge);
      if (externalKnowledge?.presenceState) {
        setPresenceState(externalKnowledge.presenceState as ContentRevelationState);
      }
      setAvailableFromEpochMinute(
        externalKnowledge?.availableFromEpochMinute != null
          ? String(externalKnowledge.availableFromEpochMinute)
          : '',
      );
      return;
    }

    if (!isDMUser || !pageId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchPartyKnowledge(campaignHandle, pageId)
      .then((res) => {
        if (cancelled) return;
        setPartyKnowledge(res);
        if (res.presenceState) {
          setPresenceState(res.presenceState as ContentRevelationState);
        }
        setAvailableFromEpochMinute(
          res.availableFromEpochMinute != null
            ? String(res.availableFromEpochMinute)
            : '',
        );
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load discovery');
          setPresenceState(ContentRevelationStates.REVEALED);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, externalKnowledge, isDMUser, pageId, usesExternalKnowledge]);

  async function persistPresence(
    nextState: ContentRevelationState,
    gateValue: string,
  ) {
    const trimmedGate = gateValue.trim();
    const parsedGate = trimmedGate ? Number(trimmedGate) : null;
    await bulkRevealContentPresence(
      campaignHandle,
      [{ entityType: 'wiki_page', entityId: pageId }],
      nextState,
      {
        availableFromEpochMinute:
          parsedGate != null && Number.isFinite(parsedGate) ? Math.trunc(parsedGate) : null,
      },
    );
    if (usesExternalKnowledge) {
      onPartyKnowledgeChanged?.();
      return;
    }
    const refreshed = await fetchPartyKnowledge(campaignHandle, pageId);
    setPartyKnowledge(refreshed);
  }

  async function handlePresenceChange(next: ContentRevelationState) {
    const previous = presenceState;
    setPresenceState(next);
    setUpdating(true);
    setError(null);
    try {
      await persistPresence(next, availableFromEpochMinute);
    } catch (err) {
      setPresenceState(previous);
      setError(err instanceof Error ? err.message : 'Unable to update discovery');
    } finally {
      setUpdating(false);
    }
  }

  async function handleGateBlur() {
    setUpdating(true);
    setError(null);
    try {
      await persistPresence(presenceState, availableFromEpochMinute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update schedule');
    } finally {
      setUpdating(false);
    }
  }

  if (!isDMUser) return null;

  const claimCount = partyKnowledge?.claims?.length ?? 0;
  const contested = partyKnowledge?.isContested ?? false;
  const partyPreview = partyKnowledge?.discovery;
  const resolvedLoading = usesExternalKnowledge
    ? (partyKnowledgeLoading ?? false)
    : loading;

  return (
    <section
      className={`rounded-lg border bg-surface/40 space-y-2 ${
        highlightDiscovery
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border'
      } ${railCompact ? 'p-2' : 'p-3'}`}
    >
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Eye className="size-3.5 text-primary" aria-hidden />
        Discovery
      </h3>

      {resolvedLoading ? (
        <p className="text-xs text-muted">Loading discovery state…</p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Party presence
            </span>
            <select
              value={presenceState}
              disabled={updating}
              onChange={(e) =>
                void handlePresenceChange(e.target.value as ContentRevelationState)
              }
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 disabled:opacity-50"
              aria-label="Party discovery state"
              title={formatDiscoveryStateLabel(presenceState)}
            >
              <option value={ContentRevelationStates.REVEALED}>
                {discoveryControlLabel(ContentRevelationStates.REVEALED)}
              </option>
              <option value={ContentRevelationStates.HIDDEN}>
                {discoveryControlLabel(ContentRevelationStates.HIDDEN)}
              </option>
              <option value={ContentRevelationStates.DRAFT}>
                {discoveryControlLabel(ContentRevelationStates.DRAFT)}
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Available from (epoch minute)
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={availableFromEpochMinute}
              disabled={updating}
              onChange={(e) => setAvailableFromEpochMinute(e.target.value)}
              onBlur={() => void handleGateBlur()}
              placeholder="Optional schedule gate"
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 disabled:opacity-50"
            />
          </label>

          {partyPreview ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>Party preview:</span>
              <DiscoveryStateBadge discovery={partyPreview} surface="codex" compact />
              <span>{formatRichDiscoveryStateLabel(partyPreview.state)}</span>
              {!partyPreview.available && partyPreview.gatedUntil ? (
                <span>until epoch {partyPreview.gatedUntil}</span>
              ) : null}
            </div>
          ) : null}

          {claimCount > 0 ? (
            <p className="text-xs text-muted">
              {claimCount} recorded belief{claimCount === 1 ? '' : 's'}
              {contested ? ' · contested' : ''}
            </p>
          ) : (
            <p className="text-xs text-muted">No party beliefs recorded yet.</p>
          )}

          {highlightDiscovery && onOpenDiscoverySubview ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={onOpenDiscoverySubview}
            >
              Open Discovery subview →
            </button>
          ) : null}

          {error ? (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
