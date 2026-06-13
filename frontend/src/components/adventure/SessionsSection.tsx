import type { AdventureHubPayload } from '@/lib/adventure';
import { STORYBOARD_PRESETS } from '@shared/storyboardProjection';
import { patchStoryboardLayout } from '@/lib/adventure';
import type { StoryboardViewV1 } from '@/lib/sceneMetadata';

interface SessionsSectionProps {
  campaignHandle: string;
  data?: AdventureHubPayload['sessions'];
  canManage?: boolean;
  currentLayout?: StoryboardViewV1;
  onPresetApplied?: () => void;
}

export function SessionsSection({
  campaignHandle,
  data,
  canManage = false,
  currentLayout,
  onPresetApplied,
}: SessionsSectionProps) {
  const readyScenes =
    (data?.readyScenes as Array<{ id: string; title: string; sceneStatus?: string }>) ?? [];

  async function applyPreset(presetId: string) {
    const preset = STORYBOARD_PRESETS.find((p) => p.id === presetId);
    if (!preset || !currentLayout) return;
    await patchStoryboardLayout(campaignHandle, {
      ...currentLayout,
      lanes: preset.lanes,
      activeMode: preset.activeMode ?? 'session_prep',
    });
    onPresetApplied?.();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Sessions</h2>
        <p className="text-sm text-muted-foreground">
          Session prep — ready scenes, player threads, escalation risks
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Ready scenes</h3>
        <ul className="space-y-1">
          {readyScenes.map((scene) => (
            <li key={scene.id} className="rounded border border-border px-3 py-2 text-sm">
              {scene.title}
              {scene.sceneStatus ? (
                <span className="ml-2 text-xs text-muted-foreground">{scene.sceneStatus}</span>
              ) : null}
            </li>
          ))}
          {readyScenes.length === 0 ? (
            <li className="text-sm text-muted-foreground">No scenes marked READY yet.</li>
          ) : null}
        </ul>
      </section>

      {canManage ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Storyboard presets</h3>
          <p className="text-xs text-muted-foreground">
            Non-destructive lane scaffolds — applies act lanes to the storyboard layout only.
          </p>
          <ul className="space-y-2">
            {STORYBOARD_PRESETS.map((preset) => (
              <li key={preset.id} className="rounded border border-border p-3">
                <div className="font-medium text-sm">{preset.label}</div>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-primary hover:underline"
                  disabled={!currentLayout}
                  onClick={() => void applyPreset(preset.id)}
                >
                  Apply lanes to storyboard
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
