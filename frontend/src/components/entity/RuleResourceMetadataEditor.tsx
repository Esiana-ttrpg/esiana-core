import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import {
  CodexEditorShell,
  codexFieldClass,
  codexFieldId,
  useCodexMetadataDraft,
} from '@/components/entity/codexMetadataEditorShared';
import {
  parseRuleResourceMetadata,
  type RuleResourceMetadataFields,
} from '@/lib/ruleResourceMetadata';
import { updateRuleResourceMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

interface RuleResourceMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'all';
  bare?: boolean;
  focusField?: string | null;
}

export function RuleResourceMetadataEditor({
  campaignHandle,
  pageId,
  metadata,
  onSaved,
  section = 'all',
  bare = false,
  focusField,
}: RuleResourceMetadataEditorProps) {
  const source = useMemo(() => parseRuleResourceMetadata(metadata), [metadata]);
  const draftBlockId = `rule-resource-metadata:${pageId}`;
  const [draft, setDraft, , markCommitted, dirty] = useCodexMetadataDraft(
    metadata,
    parseRuleResourceMetadata,
    draftBlockId,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState('');

  const persist = useCallback(async (patch: Partial<RuleResourceMetadataFields>) => {
    const previous = { ...draft };
    setDraft((prev) => ({
      ...prev,
      ...patch,
      topicTags: patch.topicTags ?? prev.topicTags,
    }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateRuleResourceMetadata(campaignHandle, pageId, patch);
      const next = parseRuleResourceMetadata(result.metadata);
      markCommitted(next);
      setTagsDraft(next.topicTags.join(', '));
      onSaved(result.metadata);
    } catch (err) {
      setDraft(previous);
      setError(err instanceof Error ? err.message : 'Failed to save rules/resources data');
    } finally {
      setSaving(false);
    }
  }, [campaignHandle, draft, markCommitted, onSaved, pageId, setDraft]);

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(
        source,
        draft,
        Object.keys(source) as (keyof RuleResourceMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  if (section !== 'all' && section !== 'identity') return null;

  return (
    <CodexEditorShell saving={saving} error={error} bare={bare}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'resourceType')}>
          <span className={META_FIELD_LABEL_CLASS}>Type</span>
          <input
            className={codexFieldClass}
            value={draft.resourceType ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, resourceType: e.target.value }))}
            onBlur={() => void persist({ resourceType: draft.resourceType })}
          />
        </label>
        <label className="space-y-1" id={codexFieldId(focusField, 'scope')}>
          <span className={META_FIELD_LABEL_CLASS}>Scope</span>
          <input
            className={codexFieldClass}
            value={draft.scope ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, scope: e.target.value }))}
            onBlur={() => void persist({ scope: draft.scope })}
          />
        </label>
        <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'summary')}>
          <span className={META_FIELD_LABEL_CLASS}>Summary</span>
          <textarea
            className={`${codexFieldClass} min-h-[4rem] resize-y`}
            value={draft.summary ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, summary: e.target.value }))}
            onBlur={() => void persist({ summary: draft.summary })}
          />
        </label>
        <label className="space-y-1 sm:col-span-2" id={codexFieldId(focusField, 'topicTags')}>
          <span className={META_FIELD_LABEL_CLASS}>Topic tags</span>
          <input
            className={codexFieldClass}
            value={tagsDraft || draft.topicTags.join(', ')}
            onChange={(e) => setTagsDraft(e.target.value)}
            onBlur={() => {
              const topicTags = tagsDraft
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
              void persist({ topicTags });
            }}
            placeholder="Comma-separated tags"
          />
        </label>
      </div>
    </CodexEditorShell>
  );
}
