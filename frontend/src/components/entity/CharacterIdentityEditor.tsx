import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import { CHARACTER_IDENTITY_KEYS } from '@/lib/characterMetadata';
import { Loader2 } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  parseCharacterMetadata,
  type CharacterIdentityFields,
  type CharacterLifeStatus,
} from '@/lib/characterMetadata';
import {
  ALL_PARTY_PARTICIPATION_ROLES,
  PARTY_PARTICIPATION_ROLE_LABELS,
  type PartyParticipationRole,
} from '@shared/partyParticipation';
import {
  filterAncestryPages,
  filterLocationPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import {
  mapCharacterLifeStatusToNarrativeStatus,
  PageNarrativeStatuses,
} from '@shared/pageNarrativeStatus';
import { patchPageNarrativeStatus } from '@/lib/pageNarrativeStatusApi';
import { updateCharacterMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

const LIFE_STATUSES: CharacterLifeStatus[] = [
  'ALIVE',
  'DECEASED',
  'MISSING',
  'EXILED',
  'UNKNOWN',
];

export type CharacterIdentitySection =
  | 'identity'
  | 'presence'
  | 'participation'
  | 'appearance';

interface CharacterIdentityEditorProps {
  campaignHandle: string;
  pageId: string;
  /** Wiki layout block id for draft isolation. */
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  section?: CharacterIdentitySection | 'all';
  bare?: boolean;
}

export function CharacterIdentityEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  flatPages,
  onSaved,
  focusField,
  section = 'all',
  bare = false,
}: CharacterIdentityEditorProps) {
  const source = useMemo(() => parseCharacterMetadata(metadata), [metadata]);
  const draftBlockId = blockId ?? `entity-hero:${pageId}`;
  const { draft, setDraft, dirty, markCommitted } = useBlockDraft({
    blockId: draftBlockId,
    source,
    serialize: (value) => JSON.stringify(value),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgPages = filterOrganizationPages(flatPages);
  const locationPages = filterLocationPages(flatPages);
  const ancestryPages = filterAncestryPages(flatPages);
  const rootAncestryPages = useMemo(
    () =>
      ancestryPages.filter(
        (p) => parseAncestryMetadata(p.metadata).entityKind === 'root',
      ),
    [ancestryPages],
  );
  const lineageAncestryPages = useMemo(
    () =>
      ancestryPages.filter((p) => {
        const meta = parseAncestryMetadata(p.metadata);
        if (meta.entityKind !== 'lineage') return false;
        if (!draft.ancestryId) return true;
        return meta.parentAncestryId === draft.ancestryId;
      }),
    [ancestryPages, draft.ancestryId],
  );

  const showIdentity = section === 'all' || section === 'identity';
  const showPresence = section === 'all' || section === 'presence';
  const showParticipation = section === 'all' || section === 'participation';
  const showAppearance = section === 'all' || section === 'appearance';

  useEffect(() => {
    if (!focusField) return;
    const el = document.getElementById(`character-field-${focusField}`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const input = el.querySelector<HTMLElement>('input, textarea, select, button');
      input?.focus();
    });
  }, [focusField]);

  const persist = useCallback(
    async (patch: Partial<CharacterIdentityFields>) => {
      const merged: CharacterIdentityFields = {
        ...draft,
        ...patch,
        partyParticipation: patch.partyParticipation
          ? { ...draft.partyParticipation, ...patch.partyParticipation }
          : draft.partyParticipation,
        appearance: patch.appearance
          ? { ...draft.appearance, ...patch.appearance }
          : draft.appearance,
      };
      setDraft(merged);
      setSaving(true);
      setError(null);
      try {
        const result = await updateCharacterMetadata(campaignHandle, pageId, patch);
        if (patch.status !== undefined) {
          const mapped = patch.status
            ? mapCharacterLifeStatusToNarrativeStatus(patch.status)
            : PageNarrativeStatuses.ACTIVE;
          if (mapped) {
            await patchPageNarrativeStatus(campaignHandle, pageId, { status: mapped });
          }
        }
        const next = parseCharacterMetadata(result.metadata);
        markCommitted(next);
        onSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save identity data');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, draft, markCommitted, onSaved, pageId, setDraft],
  );

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(source, draft, CHARACTER_IDENTITY_KEYS);
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  const body = (
    <>
      {showIdentity ? (
        <>
          <div id="character-field-title" className="grid gap-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Title
              </span>
              <input
                className={fieldClass}
                placeholder="Captain, Heir Apparent…"
                value={draft.title ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                onBlur={() => void persist({ title: draft.title?.trim() || null })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Profession / role
              </span>
              <input
                className={fieldClass}
                placeholder="Scout, merchant…"
                value={draft.profession ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, profession: e.target.value }))}
                onBlur={() => void persist({ profession: draft.profession?.trim() || null })}
              />
            </label>
          </div>

          <label id="character-field-pronouns" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Pronouns
            </span>
            <input
              className={fieldClass}
              placeholder="she/they, xe/xem…"
              value={draft.appearance.pronouns ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  appearance: { ...p.appearance, pronouns: e.target.value },
                }))
              }
              onBlur={() =>
                void persist({
                  appearance: {
                    ...draft.appearance,
                    pronouns: draft.appearance.pronouns?.trim() || null,
                  },
                })
              }
            />
          </label>

          <label id="character-field-knownFor" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Known for
            </span>
            <textarea
              className={`${fieldClass} min-h-[60px] resize-y`}
              placeholder="Led the defense of Rivendale…"
              value={draft.knownFor ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, knownFor: e.target.value }))}
              onBlur={() => void persist({ knownFor: draft.knownFor?.trim() || null })}
            />
          </label>

          <label id="character-field-activeArc" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Active arc
            </span>
            <input
              className={fieldClass}
              placeholder="Reclaiming a broken oath…"
              value={draft.activeArc ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, activeArc: e.target.value }))}
              onBlur={() => void persist({ activeArc: draft.activeArc?.trim() || null })}
            />
          </label>

          <label id="character-field-motivation" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Motivation
            </span>
            <input
              className={fieldClass}
              placeholder="Protect the refugees at any cost…"
              value={draft.motivation ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, motivation: e.target.value }))}
              onBlur={() => void persist({ motivation: draft.motivation?.trim() || null })}
            />
          </label>

          <label id="character-field-ancestryId" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Ancestry
            </span>
            <IdentityPagePicker
              flatPages={rootAncestryPages}
              value={draft.ancestryId}
              placeholder="Search root ancestries…"
              onChange={(nextId) => {
                const patch: Partial<CharacterIdentityFields> = { ancestryId: nextId };
                if (
                  nextId &&
                  draft.lineageId &&
                  parseAncestryMetadata(
                    flatPages.find((p) => p.id === draft.lineageId)?.metadata,
                  ).parentAncestryId !== nextId
                ) {
                  patch.lineageId = null;
                }
                void persist(patch);
              }}
            />
          </label>

          <label id="character-field-lineageId" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Lineage
            </span>
            <IdentityPagePicker
              flatPages={lineageAncestryPages}
              value={draft.lineageId}
              placeholder="Search lineages…"
              onChange={(nextId) => {
                if (!nextId) {
                  void persist({ lineageId: null });
                  return;
                }
                const meta = parseAncestryMetadata(
                  flatPages.find((p) => p.id === nextId)?.metadata,
                );
                void persist({
                  lineageId: nextId,
                  ancestryId: meta.parentAncestryId ?? draft.ancestryId,
                });
              }}
            />
          </label>

          {draft.ancestry?.trim() && !draft.ancestryId && !draft.lineageId ? (
            <p className="text-[10px] text-muted">
              Legacy note: {draft.ancestry} — pick ancestry pages above to link.
            </p>
          ) : null}
        </>
      ) : null}

      {showParticipation ? (
        <div
          id="character-field-partyParticipation"
          className="space-y-2 rounded-md border border-border/60 bg-background/40 p-2.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Participation
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-3.5 rounded border-border"
              checked={draft.partyParticipation.active}
              onChange={(e) =>
                void persist({
                  partyParticipation: {
                    ...draft.partyParticipation,
                    active: e.target.checked,
                  },
                })
              }
            />
            <span className="text-xs text-foreground">Active party character</span>
          </label>
          {draft.partyParticipation.active ? (
            <label className="block space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Role
              </span>
              <select
                className={fieldClass}
                value={draft.partyParticipation.role}
                onChange={(e) =>
                  void persist({
                    partyParticipation: {
                      ...draft.partyParticipation,
                      role: e.target.value as PartyParticipationRole,
                    },
                  })
                }
              >
                {ALL_PARTY_PARTICIPATION_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {PARTY_PARTICIPATION_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="text-[10px] leading-snug text-muted">
            Player assignment is configured separately in campaign settings or the
            codex rail.
          </p>
        </div>
      ) : null}

      {showPresence ? (
        <div id="character-field-status" className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Life status
            </span>
            <select
              className={fieldClass}
              value={draft.status ?? ''}
              onChange={(e) =>
                void persist({
                  status: (e.target.value || null) as CharacterLifeStatus | null,
                })
              }
            >
              <option value="">Infer from dates</option>
              {LIFE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label id="character-field-primaryAffiliationId" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Primary affiliation
            </span>
            <IdentityPagePicker
              flatPages={orgPages}
              value={draft.primaryAffiliationId}
              placeholder="Search organizations…"
              onChange={(nextId) => void persist({ primaryAffiliationId: nextId })}
            />
          </label>
          <label id="character-field-currentLocationId" className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Current location
            </span>
            <IdentityPagePicker
              flatPages={locationPages}
              value={draft.currentLocationId}
              placeholder="Search locations…"
              onChange={(nextId) => void persist({ currentLocationId: nextId })}
            />
          </label>
        </div>
      ) : null}

      {showAppearance ? (
        <div id="character-field-appearance.summary" className="space-y-2">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Identity Summary
            </span>
            <textarea
              className={`${fieldClass} min-h-[60px] resize-y`}
              placeholder="A soft-spoken academy mage haunted by prophetic dreams."
              value={draft.appearance.summary ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  appearance: { ...p.appearance, summary: e.target.value },
                }))
              }
              onBlur={() =>
                void persist({
                  appearance: {
                    ...draft.appearance,
                    summary: draft.appearance.summary?.trim() || null,
                  },
                })
              }
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (bare) {
    return (
      <div className="relative space-y-3">
        {saving ? (
          <Loader2 className="absolute right-0 top-0 size-3.5 animate-spin text-muted" />
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Character identity
        </h3>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted" />}
      </div>
      {body}
    </section>
  );
}
