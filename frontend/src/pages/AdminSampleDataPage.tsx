import { useCallback, useEffect, useState } from 'react';
import { Database, FlaskConical } from 'lucide-react';
import {
  controlClasses,
  primaryButtonClasses,
  selectClasses,
} from '@/components/admin/adminFormStyles';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiError } from '@/lib/api';
import {
  adminGenerateSampleCampaign,
  fetchAdminSampleDataStatus,
  type SampleDataProfileCard,
} from '@/lib/sampleData';

export function AdminSampleDataPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<SampleDataProfileCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('Sample Campaign');
  const [profileId, setProfileId] = useState('');
  const [seed, setSeed] = useState('');
  const [density, setDensity] = useState<'quiet' | 'active' | 'obsessive'>('active');
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await fetchAdminSampleDataStatus();
      setEnabled(status.enabled);
      setProfiles(status.profiles);
      if (status.profiles.length > 0 && !profileId) {
        setProfileId(status.profiles[0].profileId);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setEnabled(false);
        setProfiles([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load sample data settings');
      }
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    if (!profileId || !name.trim()) return;
    setSubmitting(true);
    setResultMessage(null);
    setError(null);
    try {
      const result = await adminGenerateSampleCampaign({
        name: name.trim(),
        profileId,
        ...(seed.trim() ? { seed: seed.trim() } : {}),
        density,
      });
      setResultMessage(
        `Created campaign "${result.campaign.name}" (${result.campaign.handle}). Background task ${result.taskId} is seeding content.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate sample campaign');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading sample data tools…" />;
  }

  if (enabled === false) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            <FlaskConical className="size-6 text-primary" />
            Sample Data
          </h1>
          <p className="mt-2 text-sm text-muted">
            Developer fixtures for QA, capacity profiling, and plugin testing. Not shown to end users unless
            explicitly enabled.
          </p>
        </header>
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          Sample Data is disabled. Set <code className="text-foreground">ENABLE_SAMPLE_DATA=true</code>{' '}
          in the backend environment and restart the server to use this tool.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <FlaskConical className="size-6 text-primary" />
          Sample Data
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Generate deterministic test campaigns using core size profiles. Content Packs are
          managed separately under Plugins.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {resultMessage && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
          {resultMessage}
        </div>
      )}

      <form onSubmit={handleGenerate} className="max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Database className="size-4 text-primary" />
          Generate campaign
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Campaign name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={controlClasses}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Profile</span>
          <select
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
            className={selectClasses}
            required
          >
            {profiles.map((profile) => (
              <option key={profile.profileId} value={profile.profileId}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Seed (optional)</span>
          <input
            type="text"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder="Uses profile default when blank"
            className={controlClasses}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Activity density</span>
          <select
            value={density}
            onChange={(event) =>
              setDensity(event.target.value as 'quiet' | 'active' | 'obsessive')
            }
            className={selectClasses}
          >
            <option value="quiet">Quiet</option>
            <option value="active">Active</option>
            <option value="obsessive">Obsessive</option>
          </select>
        </label>

        <button type="submit" disabled={submitting} className={primaryButtonClasses}>
          {submitting ? 'Creating…' : 'Generate sample campaign'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Available profiles</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => (
            <li
              key={profile.profileId}
              className="rounded-xl border border-border bg-background/40 p-4 text-sm"
            >
              <p className="font-medium text-foreground">{profile.label}</p>
              <p className="mt-1 text-xs text-muted">{profile.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
