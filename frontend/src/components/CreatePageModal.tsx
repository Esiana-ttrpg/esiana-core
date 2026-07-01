import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { CreateImportMenu } from '@/components/create/CreateImportMenu';
import { CreateVisibilityField } from '@/components/create/CreateVisibilityField';
import {
  buildCreateBlocks,
  buildCreateMetadata,
  CHARACTER_ROLE_OPTIONS,
  createEmptyFormState,
  getCharacterRoleFieldKeys,
  getCollapsibleFields,
  getCreateEntityConfig,
  getPrimaryFields,
  hasCollapsibleFields,
  normalizeCharacterRole,
  type CreateEntityFormState,
  type CreateFieldDef,
  type WikiPageVisibility,
} from '@/lib/createEntityConfig';
import {
  fetchCampaignMembersForIdentity,
  memberDisplayLabel,
  updateMemberIdentityPage,
  type CampaignMemberIdentity,
} from '@/lib/campaignMemberIdentity';
import { filterAncestryPages } from '@/lib/questHubLayout';
import { createWikiPage } from '@/lib/wiki';
import { createItemLabel } from '@/lib/wikiLabels';
import type { CreatePageImportPreviewResult } from '@/lib/createPageMarkdownImport';
import type { WikiTagInput, WikiTreeNode } from '@/types/wiki';

interface CreatePageModalProps {
  open: boolean;
  campaignHandle: string;
  parentId: string;
  categoryTitle: string;
  flatPages?: WikiTreeNode[];
  initialTitle?: string | null;
  initialMetadata?: Record<string, string>;
  /** Merged into POST metadata on submit (after form-built fields). */
  defaultMetadata?: Record<string, unknown>;
  onClose: () => void;
  onCreated: (page: WikiTreeNode) => void;
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60';

export function CreatePageModal({
  open,
  campaignHandle,
  parentId,
  categoryTitle,
  flatPages = [],
  initialTitle = null,
  initialMetadata,
  defaultMetadata,
  onClose,
  onCreated,
}: CreatePageModalProps) {
  const itemLabel = createItemLabel(categoryTitle);
  const isCharacterCategory = categoryTitle === 'Characters';
  const config = useMemo(() => getCreateEntityConfig(categoryTitle), [categoryTitle]);
  const primaryFields = useMemo(() => getPrimaryFields(categoryTitle), [categoryTitle]);
  const ancestryPages = useMemo(() => filterAncestryPages(flatPages), [flatPages]);

  const [form, setForm] = useState<CreateEntityFormState>(() =>
    createEmptyFormState(categoryTitle, initialTitle, initialMetadata),
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<CampaignMemberIdentity[]>([]);
  const [importedMetadata, setImportedMetadata] = useState<Record<string, unknown> | null>(
    null,
  );
  const [importedTags, setImportedTags] = useState<WikiTagInput[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const collapsibleFields = useMemo(
    () => getCollapsibleFields(categoryTitle, form.characterRole),
    [categoryTitle, form.characterRole],
  );
  const showAdditionalDetails = hasCollapsibleFields(categoryTitle, form.characterRole);

  useEffect(() => {
    if (!open) return;
    setForm(createEmptyFormState(categoryTitle, initialTitle, initialMetadata));
    setDetailsOpen(false);
    setError(null);
    setImportedMetadata(null);
    setImportedTags([]);
    setImportWarnings([]);
  }, [open, categoryTitle, initialTitle, initialMetadata]);

  useEffect(() => {
    if (!open || !isCharacterCategory) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    void fetchCampaignMembersForIdentity(campaignHandle)
      .then((loaded) => {
        if (!cancelled) setMembers(loaded);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isCharacterCategory, campaignHandle]);

  if (!open) return null;

  function setFieldValue(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      fieldValues: { ...prev.fieldValues, [key]: value },
    }));
  }

  function handleCharacterRoleChange(nextRole: string) {
    const role = normalizeCharacterRole(nextRole);
    setForm((prev) => ({
      ...prev,
      characterRole: role,
      memberUserId: null,
      fieldValues: Object.fromEntries(
        getCharacterRoleFieldKeys(role).map((key) => [key, '']),
      ),
    }));
  }

  function handleApplyImport(result: CreatePageImportPreviewResult) {
    const { prefill, warnings } = result;
    const patch = prefill.formPatch;
    const nextRole = patch.characterRole
      ? normalizeCharacterRole(patch.characterRole)
      : form.characterRole;

    setImportedMetadata(prefill.metadata);
    setImportedTags(prefill.tags);
    setImportWarnings(warnings);

    const roleFieldKeys =
      categoryTitle === 'Characters' ? getCharacterRoleFieldKeys(nextRole) : [];
    const baseFieldValues =
      categoryTitle === 'Characters'
        ? Object.fromEntries(roleFieldKeys.map((key) => [key, '']))
        : { ...form.fieldValues };

    setForm((prev) => ({
      ...prev,
      name: patch.name ?? prefill.title ?? prev.name,
      description: patch.description ?? prefill.description ?? prev.description,
      visibility: patch.visibility ?? prefill.visibility ?? prev.visibility,
      characterRole: nextRole,
      fieldValues: {
        ...baseFieldValues,
        ...patch.fieldValues,
      },
      parentAncestryId:
        patch.parentAncestryId !== undefined ? patch.parentAncestryId : prev.parentAncestryId,
    }));

    if (hasCollapsibleFields(categoryTitle, nextRole)) {
      const fields = getCollapsibleFields(categoryTitle, nextRole);
      const hasValues = fields.some((field) => patch.fieldValues?.[field.key]?.trim());
      if (hasValues) setDetailsOpen(true);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalTitle = form.name.trim();
    if (!finalTitle) {
      setError('Name is required.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const metadata = {
        ...(defaultMetadata ?? {}),
        ...(initialMetadata ?? {}),
        ...(importedMetadata ?? {}),
        ...buildCreateMetadata(categoryTitle, form),
      };
      const page = await createWikiPage(campaignHandle, {
        title: finalTitle,
        parentId,
        metadata,
        templateType: config.templateType,
        visibility: form.visibility,
        blocks: buildCreateBlocks(categoryTitle, form.description),
        ...(importedTags.length > 0 ? { tags: importedTags } : {}),
      });

      if (
        isCharacterCategory &&
        form.characterRole === 'party-member' &&
        form.memberUserId
      ) {
        try {
          await updateMemberIdentityPage(campaignHandle, form.memberUserId, page.id);
        } catch {
          // Character was created; player can be linked from the codex page.
        }
      }

      onCreated(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create page.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderPresetSelect(field: CreateFieldDef) {
    const value = form.fieldValues[field.key] ?? '';
    const options = field.options ?? [];
    const isCustom =
      value.length > 0 && !options.some((option) => option.value === value && option.value !== 'Other');
    const selectValue = isCustom ? 'Other' : value;

    return (
      <label key={field.key} className="block space-y-1">
        <span className="text-sm text-muted">{field.label}</span>
        <select
          value={selectValue}
          onChange={(event) => {
            const next = event.target.value;
            if (next === 'Other') {
              setFieldValue(field.key, isCustom ? value : '');
            } else {
              setFieldValue(field.key, next);
            }
          }}
          className={inputClass}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
              {option.disabled ? ' (coming soon)' : ''}
            </option>
          ))}
        </select>
        {selectValue === 'Other' ? (
          <input
            value={value}
            onChange={(event) => setFieldValue(field.key, event.target.value)}
            className={inputClass}
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
          />
        ) : null}
      </label>
    );
  }

  function renderMemberSelect(field: CreateFieldDef) {
    return (
      <label key={field.key} className="block space-y-1">
        <span className="text-sm text-muted">{field.label}</span>
        <select
          value={form.memberUserId ?? ''}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              memberUserId: event.target.value.trim() ? event.target.value : null,
            }))
          }
          className={inputClass}
        >
          <option value="">Select a player…</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {memberDisplayLabel(member)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderField(field: CreateFieldDef) {
    if (field.kind === 'member-select') {
      return renderMemberSelect(field);
    }

    if (field.kind === 'page-picker') {
      return (
        <label key={field.key} className="block space-y-1">
          <span className="text-sm text-muted">{field.label}</span>
          <IdentityPagePicker
            flatPages={ancestryPages}
            lookupPages={flatPages}
            value={form.parentAncestryId}
            placeholder={field.placeholder ?? 'Search…'}
            onChange={(next) => setForm((prev) => ({ ...prev, parentAncestryId: next }))}
          />
        </label>
      );
    }

    if (field.kind === 'preset-select') {
      return renderPresetSelect(field);
    }

    return (
      <label key={field.key} className="block space-y-1">
        <span className="text-sm text-muted">{field.label}</span>
        <input
          value={form.fieldValues[field.key] ?? ''}
          onChange={(event) => setFieldValue(field.key, event.target.value)}
          className={inputClass}
          placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
        />
      </label>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-page-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="create-page-title"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <Plus className="size-5 text-primary" />
            Create {itemLabel}
          </h2>
          <div className="flex items-center gap-2">
            <CreateImportMenu
              campaignHandle={campaignHandle}
              categoryTitle={categoryTitle}
              disabled={submitting}
              onApply={handleApplyImport}
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted hover:bg-elevated"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {importWarnings.length > 0 ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              <p className="font-medium">Import notes</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                {importWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm text-muted">Name *</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClass}
              placeholder={`Name your ${itemLabel.toLowerCase()}`}
              autoFocus
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-muted">Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className={`${inputClass} min-h-[4.5rem] resize-y`}
              placeholder="A sentence of context — who they are, where they fit, what stands out"
              rows={3}
            />
          </label>

          {config.showCharacterRole ? (
            <label className="block space-y-1">
              <span className="text-sm text-muted">Character role</span>
              <select
                value={form.characterRole}
                onChange={(event) => handleCharacterRoleChange(event.target.value)}
                className={inputClass}
              >
                {CHARACTER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {primaryFields.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">{primaryFields.map(renderField)}</div>
          ) : null}

          {showAdditionalDetails ? (
            <div className="rounded-xl border border-border bg-background/50">
              <button
                type="button"
                onClick={() => setDetailsOpen((prev) => !prev)}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground hover:bg-elevated/40"
              >
                {detailsOpen ? (
                  <ChevronDown className="size-4 text-muted" aria-hidden />
                ) : (
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                )}
                Additional Details
              </button>
              {detailsOpen ? (
                <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-2">
                  {collapsibleFields.map(renderField)}
                </div>
              ) : null}
            </div>
          ) : null}

          <CreateVisibilityField
            value={form.visibility}
            onChange={(visibility: WikiPageVisibility) =>
              setForm((prev) => ({ ...prev, visibility }))
            }
            disabled={submitting}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus className="size-4" />
              {submitting ? 'Creating…' : `Create ${itemLabel}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-border bg-elevated px-4 py-2.5 text-sm text-foreground hover:bg-elevated"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
