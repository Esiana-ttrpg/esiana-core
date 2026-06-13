import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import type { WorldDevelopmentSettings } from '@shared/worldDevelopmentMetadata';
import type { WorldDevelopmentSourceSignalsSummary } from '@shared/worldDevelopmentPresentation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchWorldDevelopmentSettings,
  saveWorldDevelopmentSettings,
} from '@/lib/worldDevelopmentApi';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import { platformGuidePath } from '@/lib/platformGuides';
import { WorldDevelopmentSettingsForm } from '@/components/worldDevelopment/WorldDevelopmentSettingsForm';

interface WorldDevelopmentSettingsTabProps {
  campaignHandle: string;
}

export function WorldDevelopmentSettingsTab({ campaignHandle }: WorldDevelopmentSettingsTabProps) {
  const [settings, setSettings] = useState<WorldDevelopmentSettings | null>(null);
  const [sourceSignals, setSourceSignals] = useState<WorldDevelopmentSourceSignalsSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorldDevelopmentSettings(campaignHandle);
      setSettings(data.settings);
      setSourceSignals(data.sourceSignals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleChange(patch: Partial<WorldDevelopmentSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await saveWorldDevelopmentSettings(campaignHandle, settings);
      setSettings(result.settings);
      const refreshed = await fetchWorldDevelopmentSettings(campaignHandle);
      setSourceSignals(refreshed.sourceSignals);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading World Development settings…" />;
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Settings unavailable.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Globe className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">World Development</h2>
        </div>

        <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-sm font-semibold text-foreground">About World Development</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            World Development generates narrative suggestions based on faction trajectories, world
            state, and campaign activity.
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            It does not replace Game Master authorship.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to={platformGuidePath('world-development')}
              className="text-sm text-primary hover:underline"
            >
              Read guide
            </Link>
            <Link
              to={campaignProgressionPath(campaignHandle, 'developments')}
              className="text-sm text-primary hover:underline"
            >
              Open Developments inbox →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded border border-emerald-700 bg-emerald-950/50 p-3 text-sm text-emerald-200">
            World Development settings saved.
          </div>
        ) : null}

        <WorldDevelopmentSettingsForm
          settings={settings}
          sourceSignals={sourceSignals}
          saving={saving}
          onChange={handleChange}
          onSave={() => void handleSave()}
        />
      </div>
    </div>
  );
}
