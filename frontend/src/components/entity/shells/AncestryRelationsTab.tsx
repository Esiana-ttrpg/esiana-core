import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { ReactNode } from 'react';
import { EntityRelationshipsWidget } from '@/components/wiki/widgets/EntityRelationshipsWidget';
import type { WikiPageBlock, WikiTreeNode } from '@/types/wiki';
interface AncestryRelationsTabProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  pageMetadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  displayBlocks: WikiPageBlock[];
  wikiPageRenderer: ReactNode;
}

export function AncestryRelationsTab({
  campaignHandle,
  pageId,
  templateType,
  pageMetadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
  displayBlocks,
  wikiPageRenderer,
}: AncestryRelationsTabProps) {
  const relationsBlock = displayBlocks.find((b) => b.type === 'entity-relationships');
  const backlinkBlocks = displayBlocks.filter((b) => b.type === 'wiki-backlinks');
  const hasBacklinks = backlinkBlocks.length > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
        <h3 className={`mb-3 ${META_SECTION_LABEL_CLASS}`}>
          Graph relationships
        </h3>
        <EntityRelationshipsWidget
          blockId={relationsBlock?.id ?? 'entity-relationships'}
          campaignHandle={campaignHandle}
          pageId={pageId}
          templateType={templateType}
          metadata={pageMetadata}
          flatPages={flatPages}
          isEditingPage={isEditingPage}
          onMetadataSaved={onMetadataSaved}
        />
      </section>

      {hasBacklinks ? (
        <section>
          <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
            Connected knowledge
          </h3>
          {wikiPageRenderer}
        </section>
      ) : null}
    </div>
  );
}
