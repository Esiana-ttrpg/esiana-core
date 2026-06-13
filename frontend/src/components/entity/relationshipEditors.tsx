import { Plus } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { RELATION_VISIBILITIES } from '@/lib/entityRelationTypes';
import type { CharacterOrgAffiliation } from '@/lib/characterLineageMetadata';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface OrgAffiliationsEditorProps {
  affiliations: CharacterOrgAffiliation[];
  orgPages: WikiTreeNode[];
  onAdd: () => void;
  onUpdate: (affId: string, patch: Partial<CharacterOrgAffiliation>) => void;
  onRemove: (affId: string) => void;
}

export function OrgAffiliationsEditor({
  affiliations,
  orgPages,
  onAdd,
  onUpdate,
  onRemove,
}: OrgAffiliationsEditorProps) {
  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-surface/30 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Organization affiliations
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={orgPages.length === 0}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] hover:border-primary/40 disabled:opacity-50"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>
      {affiliations.length === 0 ? (
        <p className="text-[10px] text-muted">No temporal affiliations.</p>
      ) : null}
      {affiliations.map((aff) => (
        <div
          key={aff.id}
          className="grid gap-1 rounded border border-border/60 p-2"
        >
          <select
            className={fieldClass}
            value={aff.orgId}
            onChange={(e) => onUpdate(aff.id, { orgId: e.target.value })}
          >
            {orgPages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
          <input
            className={fieldClass}
            placeholder="Role"
            value={aff.role ?? ''}
            onChange={(e) => onUpdate(aff.id, { role: e.target.value })}
          />
          <select
            className={fieldClass}
            value={aff.visibility}
            onChange={(e) =>
              onUpdate(aff.id, {
                visibility: e.target.value as CharacterOrgAffiliation['visibility'],
              })
            }
          >
            {RELATION_VISIBILITIES.map((vis) => (
              <option key={vis} value={vis}>
                {vis}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onRemove(aff.id)}
            className="text-[10px] text-muted hover:text-red-400"
          >
            Remove affiliation
          </button>
        </div>
      ))}
    </div>
  );
}

interface FamilyPickerEditorProps {
  familyPages: WikiTreeNode[];
  value: string | null;
  onChange: (nextId: string | null) => void;
}

export function FamilyPickerEditor({
  familyPages,
  value,
  onChange,
}: FamilyPickerEditorProps) {
  return (
    <div className="rounded-md border border-border/50 bg-surface/30 p-2">
      <label id="character-field-familyId" className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Family
        </span>
        <IdentityPagePicker
          flatPages={familyPages}
          value={value}
          placeholder="Search families…"
          onChange={onChange}
        />
      </label>
    </div>
  );
}
