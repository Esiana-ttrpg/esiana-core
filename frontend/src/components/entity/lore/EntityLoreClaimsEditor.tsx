import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { LoreCitationList } from '@/components/entity/lore/LoreCitationList';
import { LoreClaimCirculationControls } from '@/components/entity/lore/LoreClaimCirculationControls';
import { LoreSourcePicker } from '@/components/entity/lore/LoreSourcePicker';
import {
  CONFIDENCE_OPTIONS,
  KNOWLEDGE_STATE_OPTIONS,
  LoreConfidenceDot,
  LoreSliceError,
  LoreStickySubheader,
  VISIBILITY_OPTIONS,
  loreClaimText,
  loreFieldClass,
  loreSectionLabel,
} from '@/components/entity/lore/LoreKnowledgeUi';
import { listCalendarEvents, type CalendarEventRecord } from '@/lib/calendarEventsApi';
import type { LoreClaimSourceRecord } from '@/lib/loreKnowledgeProjection';
import {
  createLoreClaim,
  deleteLoreClaim,
  fetchLoreClaims,
  type LoreClaimWithSources,
} from '@/lib/loreKnowledgeApi';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityLoreClaimsEditorProps {
  campaignHandle: string;
  pageId: string;
  flatPages?: LorePageLookup[] | WikiTreeNode[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
}

function asLorePageLookup(
  pages: LorePageLookup[] | WikiTreeNode[],
): LorePageLookup[] {
  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
  }));
}

function emptySource(): Partial<LoreClaimSourceRecord> {
  return {
    role: 'SUPPORTS',
    sourceType: 'OTHER',
    sourceEntityType: 'WIKI_PAGE',
    sourceEntityId: '',
    label: '',
    visibility: 'GM_ONLY',
  };
}

export function EntityLoreClaimsEditor({
  campaignHandle,
  pageId,
  flatPages = [],
  memberRole,
  allowPlayerChronologyManagement = false,
}: EntityLoreClaimsEditorProps) {
  const lorePages = asLorePageLookup(flatPages);
  const [claims, setClaims] = useState<LoreClaimWithSources[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    statement: '',
    confidence: 'UNVERIFIED',
    visibility: 'GM_ONLY',
    gmResolution: '',
    knowledgeState: 'UNDISCOVERED',
    sources: [emptySource()],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClaims(await fetchLoreClaims(campaignHandle, pageId));
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    void (async () => {
      try {
        const bundle = await fetchTimeTracking(campaignHandle);
        const master =
          bundle.calendars.find((c) => c.isMasterTime) ?? bundle.calendars[0];
        if (!master) {
          if (!cancelled) setCalendarEvents([]);
          return;
        }
        const events = await listCalendarEvents(campaignHandle, master.id);
        if (!cancelled) setCalendarEvents(events);
      } catch {
        if (!cancelled) setCalendarEvents([]);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  async function handleCreate() {
    if (!draft.statement.trim()) return;
    await createLoreClaim(campaignHandle, pageId, {
      statement: draft.statement.trim(),
      confidence: draft.confidence as LoreClaimWithSources['confidence'],
      visibility: draft.visibility as LoreClaimWithSources['visibility'],
      gmResolution: draft.gmResolution.trim() || null,
      knowledgeState: draft.knowledgeState as LoreClaimWithSources['knowledgeState'],
      sources: draft.sources.filter((s) => s.label?.trim() || s.sourceEntityId?.trim()),
    });
    setShowForm(false);
    setDraft({
      statement: '',
      confidence: 'UNVERIFIED',
      visibility: 'GM_ONLY',
      gmResolution: '',
      knowledgeState: 'UNDISCOVERED',
      sources: [emptySource()],
    });
    await load();
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted" />;

  return (
    <div className="space-y-4">
      <p className={`${loreSectionLabel} normal-case tracking-normal`}>
        Claim-centric provenance — link statements to evidence, not prose paragraphs.
      </p>

      {claims.map((claim) => (
        <article
          key={claim.id}
          className="rounded-lg border border-border/30 bg-muted/10 px-4 py-3 shadow-inner"
        >
          <LoreStickySubheader variant="content">
            <div className="flex items-start gap-2">
              <LoreConfidenceDot confidence={claim.confidence} />
              <span className={loreClaimText}>&ldquo;{claim.statement}&rdquo;</span>
            </div>
          </LoreStickySubheader>
          <LoreCitationList
            sources={claim.sources}
            flatPages={lorePages}
            events={calendarEvents}
            campaignHandle={campaignHandle}
          />
          <LoreClaimCirculationControls
            campaignHandle={campaignHandle}
            subjectPageId={pageId}
            claim={claim}
            flatPages={lorePages}
            calendarEvents={calendarEvents}
          />
          {claim.knowledgeState && claim.knowledgeState !== 'UNDISCOVERED' ? (
            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">
              Party knowledge: {claim.knowledgeState.toLowerCase()}
            </p>
          ) : null}
          {claim.gmResolution ? (
            <details className="mt-3 rounded border border-border/40 px-2 py-1">
              <summary className={`cursor-pointer ${loreSectionLabel}`}>
                GM canon resolution
              </summary>
              <p className="mt-1 text-sm text-muted">{claim.gmResolution}</p>
            </details>
          ) : null}
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-destructive"
            onClick={() => void deleteLoreClaim(campaignHandle, claim.id).then(load)}
          >
            <Trash2 className="size-3.5" />
            Remove claim
          </button>
        </article>
      ))}

      {showForm ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border/70 p-4">
          <textarea
            className={`${loreFieldClass} min-h-20 text-[15px] leading-relaxed`}
            placeholder='Claim statement (e.g. "The Ash King died at Merrow.")'
            value={draft.statement}
            onChange={(e) => setDraft((d) => ({ ...d, statement: e.target.value }))}
          />
          <select
            className={loreFieldClass}
            value={draft.confidence}
            onChange={(e) => setDraft((d) => ({ ...d, confidence: e.target.value }))}
          >
            {CONFIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={loreFieldClass}
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value }))}
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={loreFieldClass}
            value={draft.knowledgeState}
            onChange={(e) =>
              setDraft((d) => ({ ...d, knowledgeState: e.target.value }))
            }
          >
            {KNOWLEDGE_STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {draft.sources.map((source, idx) => (
            <LoreSourcePicker
              key={idx}
              flatPages={asLorePageLookup(flatPages ?? [])}
              calendarEvents={calendarEvents}
              eventsLoading={eventsLoading}
              value={source}
              onChange={(next) => {
                const updated = [...draft.sources];
                updated[idx] = next;
                setDraft((d) => ({ ...d, sources: updated }));
              }}
            />
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              setDraft((d) => ({ ...d, sources: [...d.sources, emptySource()] }))
            }
          >
            + Add source
          </button>
          <textarea
            className={`${loreFieldClass} min-h-12`}
            placeholder="GM canon resolution (optional)"
            value={draft.gmResolution}
            onChange={(e) => setDraft((d) => ({ ...d, gmResolution: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              onClick={() => void handleCreate()}
            >
              Save claim
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          onClick={() => setShowForm(true)}
        >
          <Plus className="size-4" />
          Add lore claim
        </button>
      )}
    </div>
  );
}

interface LoreClaimsReadPanelProps {
  campaignHandle: string;
  pageId: string;
  claims: LoreClaimWithSources[];
  flatPages?: LorePageLookup[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  error?: string;
}

export function LoreClaimsReadPanel({
  campaignHandle,
  pageId,
  claims,
  flatPages = [],
  memberRole,
  allowPlayerChronologyManagement = false,
  error,
}: LoreClaimsReadPanelProps) {
  const lorePages = asLorePageLookup(flatPages);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const bundle = await fetchTimeTracking(campaignHandle);
        const master =
          bundle.calendars.find((c) => c.isMasterTime) ?? bundle.calendars[0];
        if (!master) return;
        setCalendarEvents(await listCalendarEvents(campaignHandle, master.id));
      } catch {
        setCalendarEvents([]);
      }
    })();
  }, [campaignHandle]);

  if (claims.length === 0 && !error) return null;

  return (
    <details className="rounded-lg border border-border/50 bg-muted/5 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Sources &amp; provenance ({claims.length})
      </summary>
      <div className="mt-3 space-y-4">
        {error ? <LoreSliceError message={error} /> : null}
        {claims.map((claim) => (
          <div key={claim.id}>
            <p className={loreClaimText}>&ldquo;{claim.statement}&rdquo;</p>
            <LoreCitationList
              sources={claim.sources}
              flatPages={lorePages}
              events={calendarEvents}
              campaignHandle={campaignHandle}
            />
            <LoreClaimCirculationControls
              campaignHandle={campaignHandle}
              subjectPageId={pageId}
              claim={claim}
              flatPages={lorePages}
              calendarEvents={calendarEvents}
            />
          </div>
        ))}
      </div>
    </details>
  );
}
