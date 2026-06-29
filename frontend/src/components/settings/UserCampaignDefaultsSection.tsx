import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import {
  SAFETY_DEFAULT_KEYS,
  SAFETY_DEFAULT_LABELS,
  TABLE_DEFAULT_KEYS,
  TABLE_DEFAULT_LABELS,
} from '@shared/userCampaignDefaults';
import { CampaignThemeMultiSelect } from '@/components/campaign/CampaignThemeMultiSelect';
import { CampaignIntegrationsEditor } from '@/components/campaign/CampaignIntegrationsEditor';
import { GmStyleTagMultiSelect } from '@/components/settings/GmStyleTagMultiSelect';
import { ToggleChipGroup } from '@/components/settings/ToggleChipGroup';
import { SettingsStickyActions } from '@/components/settings/SettingsStickyActions';
import { FieldHint, FieldLabel } from '@/components/settings/settingsFormHelpers';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { textareaClasses } from '@/components/ui/formStyles';
import {
  fetchUserCampaignDefaults,
  patchUserCampaignDefaults,
} from '@/lib/userCampaignDefaults';
import type {
  UserCampaignDefaultsBundle,
  UserCampaignDefaultsPrefs,
} from '@/types/userCampaignDefaults';

const DEFAULT_PITCH_MAX = 2000;

const TABLE_OPTIONS = TABLE_DEFAULT_KEYS.map((key) => ({
  key,
  label: TABLE_DEFAULT_LABELS[key],
}));

const SAFETY_OPTIONS = SAFETY_DEFAULT_KEYS.map((key) => ({
  key,
  label: SAFETY_DEFAULT_LABELS[key],
}));

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return 'Not edited yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not edited yet';
  return `Last edited ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export function UserCampaignDefaultsSection() {
  const [bundle, setBundle] = useState<UserCampaignDefaultsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<UserCampaignDefaultsPrefs>({});
  const [gmStyleTags, setGmStyleTags] = useState<string[]>([]);
  const [defaultPitch, setDefaultPitch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUserCampaignDefaults()
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setPrefs(data.prefs);
        setGmStyleTags(data.gmStyleTags);
        setDefaultPitch(data.defaultPitch ?? '');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load campaign defaults.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateTableDefault(key: string, enabled: boolean) {
    setPrefs((current) => ({
      ...current,
      tableDefaults: {
        ...(current.tableDefaults ?? {}),
        [key]: enabled,
      },
    }));
  }

  function updateSafetyDefault(key: string, enabled: boolean) {
    setPrefs((current) => ({
      ...current,
      safetyDefaults: {
        ...(current.safetyDefaults ?? {}),
        [key]: enabled,
      },
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await patchUserCampaignDefaults({
        prefs,
        gmStyleTags,
        defaultPitch,
      });
      setBundle(updated);
      setPrefs(updated.prefs);
      setGmStyleTags(updated.gmStyleTags);
      setDefaultPitch(updated.defaultPitch ?? '');
      setMessage('Campaign defaults saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save campaign defaults.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading campaign defaults…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <header className="space-y-1">
        <h2 className={TYPE_DISPLAY_CLASS}>How I usually run games</h2>
        <p className="text-sm text-muted">
          Reusable table preferences and recruitment documents. Import these when creating a new
          campaign.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>GM Style Tags</FieldLabel>
        <FieldHint>Shown on your public profile. Lightweight signals for applicants.</FieldHint>
        <GmStyleTagMultiSelect values={gmStyleTags} onChange={setGmStyleTags} />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Table Defaults</FieldLabel>
        <ToggleChipGroup
          idPrefix="table-default"
          options={TABLE_OPTIONS}
          values={prefs.tableDefaults ?? {}}
          onChange={updateTableDefault}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Safety Defaults</FieldLabel>
        <ToggleChipGroup
          idPrefix="safety-default"
          options={SAFETY_OPTIONS}
          values={prefs.safetyDefaults ?? {}}
          onChange={updateSafetyDefault}
        />
        <label className="block pt-2">
          <FieldLabel>Additional safety notes</FieldLabel>
          <textarea
            value={prefs.recruitmentPrefs?.safetyToolsText ?? ''}
            onChange={(e) =>
              setPrefs((current) => ({
                ...current,
                recruitmentPrefs: {
                  ...(current.recruitmentPrefs ?? {}),
                  safetyToolsText: e.target.value,
                },
              }))
            }
            rows={3}
            placeholder="Optional freeform safety tools or table agreements…"
            className={textareaClasses}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Default genre themes</FieldLabel>
        <FieldHint>Applied to new campaigns when you import recruitment preferences.</FieldHint>
        <CampaignThemeMultiSelect
          compact
          values={prefs.recruitmentPrefs?.genreThemes ?? []}
          onChange={(genreThemes) =>
            setPrefs((current) => ({
              ...current,
              recruitmentPrefs: {
                ...(current.recruitmentPrefs ?? {}),
                genreThemes,
              },
            }))
          }
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Default chat and tabletop links</FieldLabel>
        <FieldHint>Applied to new campaigns when you import recruitment preferences.</FieldHint>
        <CampaignIntegrationsEditor
          value={prefs.recruitmentPrefs?.campaignIntegrations ?? null}
          onChange={(campaignIntegrations) =>
            setPrefs((current) => ({
              ...current,
              recruitmentPrefs: {
                ...(current.recruitmentPrefs ?? {}),
                campaignIntegrations,
              },
            }))
          }
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Default Recruitment Docs</FieldLabel>
        <FieldHint>Edit templates in a focused editor. They are copied into new campaigns on import.</FieldHint>
        <ul className="divide-y divide-border rounded-lg border border-border bg-background/40">
          {(bundle?.templateResources ?? []).map((resource) => (
            <li key={resource.kind}>
              <Link
                to={`/settings/campaign-defaults/${resource.routeSlug}`}
                className="flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/60"
              >
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">
                    Edit {resource.label}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatUpdatedAt(resource.updatedAt)}
                    {resource.hasContent ? '' : ' · Empty template'}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Default recruitment pitch</FieldLabel>
        <FieldHint>Pre-fills your seat request message when applying to LFG listings.</FieldHint>
        <textarea
          value={defaultPitch}
          onChange={(e) => setDefaultPitch(e.target.value)}
          rows={6}
          maxLength={DEFAULT_PITCH_MAX}
          placeholder="Introduce yourself — experience, character ideas, schedule, and what you are looking for in a table…"
          className={textareaClasses}
        />
        <p className="text-xs tabular-nums text-muted">
          {defaultPitch.length}/{DEFAULT_PITCH_MAX}
        </p>
      </section>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}

      <SettingsStickyActions>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save campaign defaults'}
        </button>
      </SettingsStickyActions>
    </form>
  );
}
