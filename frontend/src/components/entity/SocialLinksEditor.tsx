import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  normalizeRecordId,
  type RelationVisibility,
} from '@/lib/entityRelationTypes';
import type { CharacterSocialLink } from '@/lib/characterLineageMetadata';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { InlineEntityLinkField } from '@/components/entity/InlineEntityLinkField';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

const NARRATIVE_TYPES = [
  'alliance',
  'rival',
  'mentor',
  'patron',
  'debtor',
  'neutral',
] as const;

const POLARITIES = ['positive', 'negative', 'neutral', 'ambivalent'] as const;

interface SocialLinksEditorProps {
  campaignHandle: string;
  links: CharacterSocialLink[];
  flatPages: WikiTreeNode[];
  onChange: (links: CharacterSocialLink[]) => void;
}

export function SocialLinksEditor({
  campaignHandle,
  links,
  flatPages,
  onChange,
}: SocialLinksEditorProps) {
  const [changingTargetIndex, setChangingTargetIndex] = useState<number | null>(
    null,
  );

  function updateLink(index: number, patch: Partial<CharacterSocialLink>) {
    const next = links.map((link, i) => (i === index ? { ...link, ...patch } : link));
    onChange(next);
  }

  function addLink() {
    onChange([
      ...links,
      {
        id: normalizeRecordId(undefined),
        targetPageId: '',
        targetType: 'CHARACTER',
        narrativeType: 'neutral',
        strength: null,
        polarity: null,
        visibility: 'GM_ONLY' as RelationVisibility,
        startDate: null,
        endDate: null,
        context: null,
      },
    ]);
    setChangingTargetIndex(links.length);
  }

  function removeLink(index: number) {
    onChange(links.filter((_, i) => i !== index));
    setChangingTargetIndex((current) =>
      current === index ? null : current != null && current > index ? current - 1 : current,
    );
  }

  return (
    <div className="space-y-3">
      {links.map((link, index) => {
        const targetPage = flatPages.find((p) => p.id === link.targetPageId);
        const showPicker =
          !link.targetPageId || changingTargetIndex === index;

        return (
          <div
            key={link.id}
            className="space-y-2 rounded-md border border-border/60 bg-surface/30 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">Social link</span>
              <button
                type="button"
                className="text-muted hover:text-danger"
                onClick={() => removeLink(index)}
                aria-label="Remove social link"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            {link.targetPageId && targetPage && !showPicker ? (
              <div className="flex flex-wrap items-center gap-2">
                <EntityRelationChip
                  campaignHandle={campaignHandle}
                  pageId={targetPage.id}
                  title={targetPage.title}
                  templateType={targetPage.templateType}
                  subtitle={link.narrativeType}
                  compact
                  showPreview={false}
                />
                <button
                  type="button"
                  className="text-[10px] font-medium text-primary hover:underline"
                  onClick={() => setChangingTargetIndex(index)}
                >
                  Change target
                </button>
              </div>
            ) : null}

            {showPicker ? (
              <InlineEntityLinkField
                flatPages={flatPages}
                placeholder="Pick target entity…"
                onSelectPage={(targetPageId) => {
                  updateLink(index, { targetPageId });
                  setChangingTargetIndex(null);
                }}
              />
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs text-muted">
                Type
                <select
                  className={`${fieldClass} mt-1`}
                  value={link.narrativeType}
                  onChange={(e) => updateLink(index, { narrativeType: e.target.value })}
                >
                  {NARRATIVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-muted">
                Polarity
                <select
                  className={`${fieldClass} mt-1`}
                  value={link.polarity ?? ''}
                  onChange={(e) =>
                    updateLink(index, {
                      polarity: (e.target.value || null) as CharacterSocialLink['polarity'],
                    })
                  }
                >
                  <option value="">—</option>
                  {POLARITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs text-muted">
              Context
              <input
                className={`${fieldClass} mt-1`}
                value={link.context ?? ''}
                onChange={(e) => updateLink(index, { context: e.target.value || null })}
              />
            </label>
          </div>
        );
      })}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        onClick={addLink}
      >
        <Plus className="size-3.5" aria-hidden />
        Add social link
      </button>
    </div>
  );
}
