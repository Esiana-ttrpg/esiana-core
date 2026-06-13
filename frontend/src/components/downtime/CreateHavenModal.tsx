import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  DEFAULT_HAVEN_TYPE,
  HAVEN_DISCOVERY_STATES,
  HAVEN_OWNERSHIP_TYPES,
  HAVEN_PRIMARY_THEMES,
  HAVEN_SCALES,
  HAVEN_TYPES,
  formatHavenDiscoveryLabel,
  formatHavenOwnershipLabel,
  formatHavenThemeLabel,
  formatHavenTypeLabel,
  formatHavenScaleLabel,
  type HavenDiscoveryState,
  type HavenOwnershipType,
  type HavenPrimaryTheme,
  type HavenScale,
  type HavenType,
} from '@shared/havenMetadata';
import { createDowntimeHaven } from '@/lib/downtime';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface CreateHavenModalProps {
  open: boolean;
  campaignHandle: string;
  onClose: () => void;
  onCreated?: () => void;
}

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';
const sectionClass = 'space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0';

function formatScaleLabel(scale: HavenScale): string {
  return formatHavenScaleLabel(scale) ?? scale;
}

export function CreateHavenModal({
  open,
  campaignHandle,
  onClose,
  onCreated,
}: CreateHavenModalProps) {
  const navigate = useNavigate();
  const { flatPages } = useWiki();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [havenType, setHavenType] = useState<HavenType>(DEFAULT_HAVEN_TYPE);
  const [scale, setScale] = useState<HavenScale | ''>('');
  const [ownershipType, setOwnershipType] = useState<HavenOwnershipType | ''>('');
  const [primaryTheme, setPrimaryTheme] = useState<HavenPrimaryTheme | ''>('');
  const [discoveryState, setDiscoveryState] = useState<HavenDiscoveryState | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setHavenType(DEFAULT_HAVEN_TYPE);
      setScale('');
      setOwnershipType('');
      setPrimaryTheme('');
      setDiscoveryState('');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Haven title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fields: Record<string, unknown> = { havenType };
      if (scale) fields.scale = scale;
      if (ownershipType) fields.ownershipType = ownershipType;
      if (primaryTheme) fields.primaryTheme = primaryTheme;
      if (discoveryState) fields.discoveryState = discoveryState;

      const haven = await createDowntimeHaven(campaignHandle, {
        title: trimmedTitle,
        description: description.trim() || undefined,
        fields,
      });

      onCreated?.();
      onClose();
      navigate(campaignWikiPath(campaignHandle, haven.wikiPageId, flatPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create haven.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-haven-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="create-haven-title" className="text-base font-semibold text-foreground">
            New haven
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-0 px-4 py-4">
          <div className={sectionClass}>
            <label className="block text-sm font-medium text-foreground">
              Title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={fieldClass}
                placeholder="The Lantern Rest"
                autoFocus
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${fieldClass} min-h-[72px] resize-y`}
                placeholder="A hidden sanctuary beneath the ruins…"
              />
            </label>
          </div>

          <div className={sectionClass}>
            <label className="block text-sm font-medium text-foreground">
              Haven type
              <select
                value={havenType}
                onChange={(event) => setHavenType(event.target.value as HavenType)}
                className={fieldClass}
              >
                {HAVEN_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatHavenTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Scale
                <select
                  value={scale}
                  onChange={(event) =>
                    setScale(event.target.value as HavenScale | '')
                  }
                  className={fieldClass}
                >
                  <option value="">Not set</option>
                  {HAVEN_SCALES.map((entry) => (
                    <option key={entry} value={entry}>
                      {formatScaleLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-foreground">
                Ownership
                <select
                  value={ownershipType}
                  onChange={(event) =>
                    setOwnershipType(event.target.value as HavenOwnershipType | '')
                  }
                  className={fieldClass}
                >
                  <option value="">Not set</option>
                  {HAVEN_OWNERSHIP_TYPES.map((entry) => (
                    <option key={entry} value={entry}>
                      {formatHavenOwnershipLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Theme
                <select
                  value={primaryTheme}
                  onChange={(event) =>
                    setPrimaryTheme(event.target.value as HavenPrimaryTheme | '')
                  }
                  className={fieldClass}
                >
                  <option value="">Not set</option>
                  {HAVEN_PRIMARY_THEMES.map((entry) => (
                    <option key={entry} value={entry}>
                      {formatHavenThemeLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-foreground">
                Discovery
                <select
                  value={discoveryState}
                  onChange={(event) =>
                    setDiscoveryState(event.target.value as HavenDiscoveryState | '')
                  }
                  className={fieldClass}
                >
                  <option value="">Not set</option>
                  {HAVEN_DISCOVERY_STATES.map((entry) => (
                    <option key={entry} value={entry}>
                      {formatHavenDiscoveryLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <p className="rounded bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create haven'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
