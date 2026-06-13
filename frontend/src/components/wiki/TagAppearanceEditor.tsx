import { useEffect, useState } from 'react';
import { TagChip } from './TagChip';
import { IconAppearancePicker } from '@/components/ui/IconAppearancePicker';
import { uploadWikiTagIcon, updateWikiTag } from '@/lib/wiki';
import type { WikiTag } from '@/types/wiki';

const PRESET_COLORS = [
  '#a855f7',
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#64748b',
];

interface TagAppearanceEditorProps {
  campaignHandle: string;
  tag: WikiTag;
  onUpdated: (tag: WikiTag) => void;
}

export function TagAppearanceEditor({
  campaignHandle,
  tag,
  onUpdated,
}: TagAppearanceEditorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(tag);

  useEffect(() => {
    setDraft(tag);
  }, [tag]);

  async function applyUpdate(patch: {
    icon?: string | null;
    color?: string | null;
  }) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateWikiTag(campaignHandle, tag.id, patch);
      setDraft(updated);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleLucidePick(name: string) {
    await applyUpdate({ icon: `lucide:${name}` });
  }

  async function handleColorPick(color: string | null) {
    await applyUpdate({ color });
  }

  async function handleReset() {
    await applyUpdate({ icon: null, color: null });
  }

  async function handleUpload(file: File) {
    setSaving(true);
    setError(null);
    try {
      const updated = await uploadWikiTagIcon(campaignHandle, tag.id, file);
      setDraft(updated);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload icon');
    } finally {
      setSaving(false);
    }
  }

  const activeLucide =
    draft.icon?.startsWith('lucide:') ? draft.icon.slice('lucide:'.length) : null;

  return (
    <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Tag appearance
        </h3>
        <TagChip
          name={draft.name}
          label={draft.label}
          icon={draft.icon}
          iconAssetUrl={draft.iconAssetUrl}
          color={draft.color}
        />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={saving}
              onClick={() => void handleColorPick(color)}
              className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                draft.color === color ? 'border-foreground' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Set color ${color}`}
            />
          ))}
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleColorPick(null)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface"
          >
            Clear color
          </button>
        </div>
      </div>

      <IconAppearancePicker
        activeLucide={activeLucide}
        saving={saving}
        error={error}
        onLucidePick={(name) => void handleLucidePick(name)}
        onUpload={(file) => void handleUpload(file)}
        onReset={() => void handleReset()}
      />
    </div>
  );
}
