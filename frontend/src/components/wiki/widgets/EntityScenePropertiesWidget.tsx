import { SceneMetadataEditor } from '@/components/scene/SceneMetadataEditor';
import { SceneBeatHeading } from '@/components/scene/SceneBeatHeading';
import { parseSceneMetadata } from '@/lib/sceneMetadata';
import type { WikiTreeNode } from '@/types/wiki';

interface EntityScenePropertiesWidgetProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityScenePropertiesWidget({
  campaignHandle,
  pageId,
  pageTitle,
  metadata,
  flatPages,
  isEditingPage,
  onMetadataSaved,
}: EntityScenePropertiesWidgetProps) {
  if (!isEditingPage) {
    const scene = parseSceneMetadata(metadata);
    if (scene.beatType || scene.summary) {
      return (
        <div className="space-y-2">
          <SceneBeatHeading
            title={pageTitle}
            beatType={scene.beatType}
            meta={scene.sceneStatus ?? undefined}
          />
          {scene.summary ? <p className="text-sm text-muted">{scene.summary}</p> : null}
        </div>
      );
    }
    return (
      <p className="text-sm text-muted">
        Scene orchestration fields are available in edit mode.
      </p>
    );
  }

  return (
    <SceneMetadataEditor
      campaignHandle={campaignHandle}
      pageId={pageId}
      pageTitle={pageTitle}
      metadata={metadata}
      flatPages={flatPages}
      onSaved={onMetadataSaved}
      bare
    />
  );
}
