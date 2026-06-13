import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AncestrySocietyEditor } from '@/components/entity/AncestrySocietyEditor';
import {
  parseAncestryMetadata,
  type AncestrySociety,
} from '@/lib/ancestryMetadata';
import { updateAncestryMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

function newSocietyId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `society-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AncestrySocietiesTabProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function AncestrySocietiesTab({
  campaignHandle,
  pageId,
  flatPages,
  pageMetadata,
  isEditingPage,
  onMetadataSaved,
}: AncestrySocietiesTabProps) {
  const parsed = useMemo(() => parseAncestryMetadata(pageMetadata), [pageMetadata]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSocieties = useCallback(
    async (societies: AncestrySociety[]) => {
      setSaving(true);
      setError(null);
      try {
        const result = await updateAncestryMetadata(campaignHandle, pageId, { societies });
        onMetadataSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save societies');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, onMetadataSaved, pageId],
  );

  const handleSocietyChange = (index: number, next: AncestrySociety) => {
    const societies = [...parsed.societies];
    societies[index] = next;
    void persistSocieties(societies);
  };

  const handleAddSociety = () => {
    const societies = [
      ...parsed.societies,
      {
        id: newSocietyId(),
        name: 'New society',
        summary: null,
        customs: null,
        values: null,
        reputation: null,
        religion: null,
        relatedLocationIds: [],
        relatedOrganizationIds: [],
        associatedLineageIds: [],
      },
    ];
    void persistSocieties(societies);
  };

  const handleRemoveSociety = (index: number) => {
    const societies = parsed.societies.filter((_, i) => i !== index);
    void persistSocieties(societies);
  };

  if (!isEditingPage && parsed.societies.length === 0) {
    return (
      <p className="text-sm text-muted">
        No societies or cultural groups recorded for this ancestry.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {parsed.societies.length === 0 && !isEditingPage ? null : (
        <div className="space-y-3">
          {parsed.societies.map((society, index) =>
            isEditingPage ? (
              <AncestrySocietyEditor
                key={society.id}
                society={society}
                flatPages={flatPages}
                pageId={pageId}
                onChange={(next) => handleSocietyChange(index, next)}
                onRemove={() => handleRemoveSociety(index)}
              />
            ) : (
              <article
                key={society.id}
                className="rounded-lg border border-border/60 bg-surface/40 p-4"
              >
                <h3 className="text-base font-semibold text-foreground">{society.name}</h3>
                {society.summary ? (
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{society.summary}</p>
                ) : null}
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {society.customs ? (
                    <div>
                      <dt className="text-xs font-medium text-muted">Customs</dt>
                      <dd>{society.customs}</dd>
                    </div>
                  ) : null}
                  {society.values ? (
                    <div>
                      <dt className="text-xs font-medium text-muted">Values</dt>
                      <dd>{society.values}</dd>
                    </div>
                  ) : null}
                  {society.reputation ? (
                    <div>
                      <dt className="text-xs font-medium text-muted">Reputation</dt>
                      <dd>{society.reputation}</dd>
                    </div>
                  ) : null}
                  {society.religion ? (
                    <div>
                      <dt className="text-xs font-medium text-muted">Religion</dt>
                      <dd>{society.religion}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ),
          )}
        </div>
      )}

      {isEditingPage ? (
        <button
          type="button"
          onClick={handleAddSociety}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border/70 px-3 py-2 text-xs font-medium text-primary hover:border-primary/50 hover:bg-surface/40"
        >
          <Plus className="size-3.5" aria-hidden />
          Add society
        </button>
      ) : null}

      {saving ? <p className="text-xs text-muted">Saving…</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
