import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import { LINEAGE_METADATA_KEYS } from '@/lib/characterLineageMetadata';
import { Loader2 } from 'lucide-react';
import { ChronologyDateFields } from '@/components/entity/ChronologyDateFields';
import { CollapsibleTimelineSection } from '@/components/entity/CollapsibleTimelineSection';
import { LineageLinksEditor } from '@/components/entity/LineageLinksEditor';
import { InlineEntityLinkField } from '@/components/entity/InlineEntityLinkField';
import {
  FamilyPickerEditor,
  OrgAffiliationsEditor,
} from '@/components/entity/relationshipEditors';
import { SocialLinksEditor } from '@/components/entity/SocialLinksEditor';
import {
  normalizeRecordId,
} from '@/lib/entityRelationTypes';
import {
  parseCharacterLineageMetadata,
  type CharacterLineageFields,
  type CharacterOrgAffiliation,
  type LineageLink,
  type LineageRole,
} from '@/lib/characterLineageMetadata';
import {
  filterFamilyPages,
  filterNpcPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import { updateCharacterLineageMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

const LINEAGE_ROLES: Exclude<LineageRole, null>[] = [
  'HEAD',
  'HEIR',
  'PARTICIPANT',
  'BASTARD',
];

export type CharacterLineageSection = 'relationships' | 'timeline' | 'dynastic';

interface CharacterLineageEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  section?: CharacterLineageSection | 'all';
  bare?: boolean;
}

export function CharacterLineageEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  flatPages,
  onSaved,
  focusField,
  section = 'all',
  bare = false,
}: CharacterLineageEditorProps) {
  const source = useMemo(() => parseCharacterLineageMetadata(metadata), [metadata]);
  const sectionKey =
    section === 'relationships'
      ? 'relationships'
      : section === 'timeline'
        ? 'timeline'
        : 'lineage';
  const draftBlockId = blockId ?? `entity-${sectionKey}:${pageId}`;
  const { draft, setDraft, dirty, markCommitted } = useBlockDraft({
    blockId: draftBlockId,
    source,
    serialize: (value) => JSON.stringify(value),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const familyPages = filterFamilyPages(flatPages);
  const npcPages = filterNpcPages(flatPages).filter((p) => p.id !== pageId);
  const orgPages = filterOrganizationPages(flatPages);

  const showRelationships = section === 'all' || section === 'relationships';
  const showTimeline = section === 'all' || section === 'timeline';
  const showDynastic = section === 'all' || section === 'dynastic';

  useEffect(() => {
    if (!focusField || focusField !== 'familyId') return;
    const el = document.getElementById('character-field-familyId');
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [focusField]);

  const persist = useCallback(
    async (patch: Partial<CharacterLineageFields>) => {
      const merged = { ...draft, ...patch };
      setDraft(merged);
      setSaving(true);
      setError(null);
      try {
        const result = await updateCharacterLineageMetadata(campaignHandle, pageId, patch);
        const next = parseCharacterLineageMetadata(result.metadata);
        markCommitted(next);
        onSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save lineage data');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, draft, markCommitted, onSaved, pageId, setDraft],
  );

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(source, draft, LINEAGE_METADATA_KEYS);
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  function addParentLink() {
    const target = npcPages[0]?.id;
    if (!target) return;
    const link: LineageLink = {
      id: normalizeRecordId(undefined),
      targetCharacterId: target,
      relationshipType: 'BIOLOGICAL',
      isBiological: true,
      isLegal: true,
      isPublic: true,
      visibility: 'GM_ONLY',
    };
    void persist({ parentLinks: [...draft.parentLinks, link] });
  }

  function addSpouseLink() {
    const target = npcPages[0]?.id;
    if (!target) return;
    const link: LineageLink = {
      id: normalizeRecordId(undefined),
      targetCharacterId: target,
      relationshipType: 'MARRIAGE',
      isBiological: false,
      isLegal: true,
      isPublic: true,
      visibility: 'GM_ONLY',
    };
    void persist({ spouseLinks: [...draft.spouseLinks, link] });
  }

  function addOrgAffiliation() {
    const orgId = orgPages[0]?.id;
    if (!orgId) return;
    const aff: CharacterOrgAffiliation = {
      id: normalizeRecordId(undefined),
      orgId,
      role: null,
      startDate: null,
      endDate: null,
      visibility: 'GM_ONLY',
    };
    void persist({ orgAffiliations: [...draft.orgAffiliations, aff] });
  }

  const body = (
    <>
      {showRelationships ? (
        <div className="space-y-3">
          <InlineEntityLinkField
            flatPages={[...npcPages, ...orgPages, ...familyPages]}
            onSelectPage={(pageId) => {
              if (npcPages.some((p) => p.id === pageId)) {
                const link: LineageLink = {
                  id: normalizeRecordId(undefined),
                  targetCharacterId: pageId,
                  relationshipType: 'BIOLOGICAL',
                  isBiological: true,
                  isLegal: true,
                  isPublic: true,
                  visibility: 'GM_ONLY',
                };
                void persist({ parentLinks: [...draft.parentLinks, link] });
                return;
              }
              if (orgPages.some((p) => p.id === pageId)) {
                const aff: CharacterOrgAffiliation = {
                  id: normalizeRecordId(undefined),
                  orgId: pageId,
                  role: null,
                  startDate: null,
                  endDate: null,
                  visibility: 'GM_ONLY',
                };
                void persist({ orgAffiliations: [...draft.orgAffiliations, aff] });
              }
            }}
          />
          <FamilyPickerEditor
            familyPages={familyPages}
            value={draft.familyId}
            onChange={(nextId) => void persist({ familyId: nextId })}
          />
          <LineageLinksEditor
            title="Parents"
            links={draft.parentLinks}
            npcPages={npcPages}
            onAdd={addParentLink}
            onUpdate={(linkId, patch) =>
              void persist({
                parentLinks: draft.parentLinks.map((link) =>
                  link.id === linkId ? { ...link, ...patch } : link,
                ),
              })
            }
            onRemove={(linkId) =>
              void persist({
                parentLinks: draft.parentLinks.filter((l) => l.id !== linkId),
              })
            }
          />
          <LineageLinksEditor
            title="Spouses / partners"
            links={draft.spouseLinks}
            npcPages={npcPages}
            onAdd={addSpouseLink}
            onUpdate={(linkId, patch) =>
              void persist({
                spouseLinks: draft.spouseLinks.map((link) =>
                  link.id === linkId ? { ...link, ...patch } : link,
                ),
              })
            }
            onRemove={(linkId) =>
              void persist({
                spouseLinks: draft.spouseLinks.filter((l) => l.id !== linkId),
              })
            }
          />
          <OrgAffiliationsEditor
            affiliations={draft.orgAffiliations}
            orgPages={orgPages}
            onAdd={addOrgAffiliation}
            onUpdate={(affId, patch) =>
              void persist({
                orgAffiliations: draft.orgAffiliations.map((aff) =>
                  aff.id === affId ? { ...aff, ...patch } : aff,
                ),
              })
            }
            onRemove={(affId) =>
              void persist({
                orgAffiliations: draft.orgAffiliations.filter((a) => a.id !== affId),
              })
            }
          />
          <div className="space-y-2">
            <h3 className={META_SECTION_LABEL_CLASS}>
              Social links
            </h3>
            <p className="text-xs text-muted">
              Optional explicit ties — inferred affiliations still populate Relations views.
            </p>
            <SocialLinksEditor
              campaignHandle={campaignHandle}
              links={draft.socialLinks}
              flatPages={flatPages}
              onChange={(socialLinks) => void persist({ socialLinks })}
            />
          </div>
        </div>
      ) : null}

      {showTimeline ? (
        <CollapsibleTimelineSection
          birthDate={draft.birthDate}
          deathDate={draft.deathDate}
          successionStart={draft.successionStart}
          successionEnd={draft.successionEnd}
        >
          <ChronologyDateFields
            label="Birth"
            value={draft.birthDate}
            onChange={(next) => void persist({ birthDate: next })}
          />
          <ChronologyDateFields
            label="Death"
            value={draft.deathDate}
            onChange={(next) => void persist({ deathDate: next })}
          />
          <ChronologyDateFields
            label="Succession start"
            value={draft.successionStart}
            onChange={(next) => void persist({ successionStart: next })}
          />
          <ChronologyDateFields
            label="Succession end"
            value={draft.successionEnd}
            onChange={(next) => void persist({ successionEnd: next })}
          />
        </CollapsibleTimelineSection>
      ) : null}

      {showDynastic ? (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Lineage role
            </span>
            <select
              className={fieldClass}
              value={draft.lineageRole ?? ''}
              onChange={(e) =>
                void persist({
                  lineageRole: (e.target.value || null) as LineageRole,
                })
              }
            >
              <option value="">—</option>
              {LINEAGE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              House branch
            </span>
            <input
              className={fieldClass}
              value={draft.houseBranch ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, houseBranch: e.target.value }))}
              onBlur={() => void persist({ houseBranch: draft.houseBranch?.trim() || null })}
            />
          </label>
          <label className="block space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Bloodline status
            </span>
            <select
              className={fieldClass}
              value={draft.bloodlineStatus ?? ''}
              onChange={(e) =>
                void persist({
                  bloodlineStatus: (e.target.value || null) as CharacterLineageFields['bloodlineStatus'],
                })
              }
            >
              <option value="">—</option>
              <option value="LEGITIMATE">Legitimate</option>
              <option value="BASTARD">Bastard</option>
              <option value="ADOPTED">Adopted</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Legitimacy
            </span>
            <select
              className={fieldClass}
              value={draft.legitimacy ?? ''}
              onChange={(e) =>
                void persist({
                  legitimacy: (e.target.value || null) as CharacterLineageFields['legitimacy'],
                })
              }
            >
              <option value="">—</option>
              <option value="RECOGNIZED">Recognized</option>
              <option value="DISPUTED">Disputed</option>
              <option value="DENIED">Denied</option>
            </select>
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
    <section className="space-y-3 rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={META_SECTION_LABEL_CLASS}>
          Lineage & affiliations
        </h3>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted" />}
      </div>
      {body}
    </section>
  );
}
