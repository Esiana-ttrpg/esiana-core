import { TiptapWidget } from './TiptapWidget';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { BookOpen } from 'lucide-react';
import type { WidgetInteractionHandlers } from './widgetInteraction';

interface EntityBiographyWidgetProps extends WidgetInteractionHandlers {
  content: Record<string, unknown>;
  onChange: (newContent: Record<string, unknown>) => void;
  isEditingPage: boolean;
}

export function EntityBiographyWidget({
  content,
  onChange,
  isEditingPage,
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

  if (isEditingPage && isEmpty) {
    return (
      <div className="space-y-3">
        <BlockEmptyState
          icon={BookOpen}
          compact
          title="Biography"
          description="Write the character's story, background, and arc."
        />
        <TiptapWidget
          content={content}
          onChange={onChange}
          isEditingLayout={isEditingPage}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
        />
      </div>
    );
  }

  return (
    <TiptapWidget
      content={content}
      onChange={onChange}
      isEditingLayout={isEditingPage}
      onInteractionStart={onInteractionStart}
      onInteractionEnd={onInteractionEnd}
    />
  );
}
