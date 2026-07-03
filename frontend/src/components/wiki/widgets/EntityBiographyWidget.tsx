import { TiptapWidget } from './TiptapWidget';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import type { WidgetInteractionHandlers } from './widgetInteraction';

interface EntityBiographyWidgetProps extends WidgetInteractionHandlers {
  content: Record<string, unknown>;
  onChange: (newContent: Record<string, unknown>) => void;
  isEditingPage: boolean;
  prosePrimary?: boolean;
  workshopFromPageId?: string;
  templateType?: string;
  pageCanEdit?: boolean;
  confirmWorkshopLeave?: boolean;
}

export function EntityBiographyWidget({
  content,
  onChange,
  isEditingPage,
  prosePrimary = false,
  workshopFromPageId,
  templateType,
  pageCanEdit,
  confirmWorkshopLeave,
  onInteractionStart,
  onInteractionEnd,
}: EntityBiographyWidgetProps) {
  const markdown =
    typeof (content as { markdown?: unknown }).markdown === 'string'
      ? (content as { markdown: string }).markdown
      : '';
  const isEmpty = !markdown.trim();

  if (!isEditingPage && isEmpty) {
    return (
      <BlockEmptyState
        compact
        title="No biography yet"
        description="Biography will appear here once written."
      />
    );
  }

  return (
    <TiptapWidget
      content={content}
      onChange={onChange}
      isEditingLayout={isEditingPage}
      prosePrimary={prosePrimary}
      workshopFromPageId={workshopFromPageId}
      templateType={templateType}
      pageCanEdit={pageCanEdit}
      confirmWorkshopLeave={confirmWorkshopLeave}
      onInteractionStart={onInteractionStart}
      onInteractionEnd={onInteractionEnd}
    />
  );
}
