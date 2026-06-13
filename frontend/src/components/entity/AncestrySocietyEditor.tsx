import {
  PageIdListEditor,
  codexFieldClass,
  codexFieldId,
} from '@/components/entity/codexMetadataEditorShared';
import type { AncestrySociety } from '@/lib/ancestryMetadata';
import { filterAncestryPages, filterLocationPages } from '@/lib/questHubLayout';
import type { WikiTreeNode } from '@/types/wiki';

interface AncestrySocietyEditorProps {
  society: AncestrySociety;
  flatPages: WikiTreeNode[];
  pageId: string;
  onChange: (next: AncestrySociety) => void;
  onRemove?: () => void;
  focusField?: string | null;
}

export function AncestrySocietyEditor({
  society,
  flatPages,
  pageId,
  onChange,
  onRemove,
  focusField,
}: AncestrySocietyEditorProps) {
  const ancestryPages = filterAncestryPages(flatPages, pageId);
  const locationPages = filterLocationPages(flatPages);

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-surface/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <label className="min-w-0 flex-1 space-y-1" id={codexFieldId(focusField, `society:${society.id}:name`)}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Society name</span>
          <input
            className={codexFieldClass}
            value={society.name}
            onChange={(e) => onChange({ ...society, name: e.target.value })}
          />
        </label>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-xs text-destructive hover:underline"
          >
            Remove
          </button>
        ) : null}
      </div>

      <label className="block space-y-1" id={codexFieldId(focusField, `society:${society.id}:summary`)}>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Summary</span>
        <textarea
          className={`${codexFieldClass} min-h-[3rem] resize-y`}
          value={society.summary ?? ''}
          onChange={(e) => onChange({ ...society, summary: e.target.value || null })}
        />
      </label>

      <label className="block space-y-1" id={codexFieldId(focusField, `society:${society.id}:customs`)}>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Customs</span>
        <textarea
          className={`${codexFieldClass} min-h-[3rem] resize-y`}
          value={society.customs ?? ''}
          onChange={(e) => onChange({ ...society, customs: e.target.value || null })}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1" id={codexFieldId(focusField, `society:${society.id}:values`)}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Values</span>
          <input
            className={codexFieldClass}
            value={society.values ?? ''}
            onChange={(e) => onChange({ ...society, values: e.target.value || null })}
          />
        </label>
        <label className="space-y-1" id={codexFieldId(focusField, `society:${society.id}:reputation`)}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Reputation</span>
          <input
            className={codexFieldClass}
            value={society.reputation ?? ''}
            onChange={(e) => onChange({ ...society, reputation: e.target.value || null })}
          />
        </label>
      </div>

      <label className="block space-y-1" id={codexFieldId(focusField, `society:${society.id}:religion`)}>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Religion</span>
        <input
          className={codexFieldClass}
          value={society.religion ?? ''}
          onChange={(e) => onChange({ ...society, religion: e.target.value || null })}
        />
      </label>

      <PageIdListEditor
        label="Related locations"
        ids={society.relatedLocationIds}
        pickerPages={locationPages}
        flatPages={flatPages}
        placeholder="Search locations…"
        onChange={(next) => onChange({ ...society, relatedLocationIds: next })}
      />

      <PageIdListEditor
        label="Associated lineages"
        ids={society.associatedLineageIds}
        pickerPages={ancestryPages}
        flatPages={flatPages}
        placeholder="Search lineages…"
        onChange={(next) => onChange({ ...society, associatedLineageIds: next })}
      />
    </div>
  );
}
