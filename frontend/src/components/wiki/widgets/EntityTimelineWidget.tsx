import { CharacterLineageEditor } from '@/components/entity/CharacterLineageEditor';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { Calendar } from 'lucide-react';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { formatTimelineSummary } from '@/components/entity/CollapsibleTimelineSection';
import { isCharacterEntityPage } from '@shared/resolveCanonicalEntityCategory';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityTimelineWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  templateType: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityTimelineWidget({
  blockId,
  campaignHandle,
  pageId,
  templateType,
  metadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
}: EntityTimelineWidgetProps) {
  const lineage = parseCharacterLineageMetadata(metadata);
  const summary = formatTimelineSummary({
    birthDate: lineage.birthDate,
    deathDate: lineage.deathDate,
    successionStart: lineage.successionStart,
    successionEnd: lineage.successionEnd,
  });
  const hasDates = Boolean(summary?.trim());

  if (
    isEditingPage &&
    isCharacterEntityPage(
      { id: pageId, title: '', parentId: null, templateType, metadata },
      flatPages,
    )
  ) {
    return (
      <CharacterLineageEditor
        blockId={blockId}
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        flatPages={flatPages}
        onSaved={onMetadataSaved}
        section="timeline"
        bare
      />
    );
  }

  if (!hasDates) {
    return (
      <BlockEmptyState
        icon={Calendar}
        title="No timeline established"
        description="Birth, death, and succession dates appear here."
      />
    );
  }

  return <p className="text-sm text-foreground">{summary}</p>;
}
