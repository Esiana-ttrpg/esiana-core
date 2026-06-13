import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { resolveTemplateKindFromRouteSlug } from '@shared/userCampaignDefaults';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { SettingsStickyActions } from '@/components/settings/SettingsStickyActions';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageContainer } from '@/components/layout/PageContainer';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import {
  fetchUserTemplateResource,
  saveUserTemplateResource,
} from '@/lib/userCampaignDefaults';
import type { UserTemplateResourceDetail } from '@/types/userCampaignDefaults';

export function CampaignDefaultEditorPage() {
  const { routeSlug = '' } = useParams<{ routeSlug: string }>();
  const navigate = useNavigate();
  const kind = resolveTemplateKindFromRouteSlug(routeSlug);

  const [resource, setResource] = useState<UserTemplateResourceDetail | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUserTemplateResource(kind)
      .then((data) => {
        if (cancelled) return;
        setResource(data);
        setMarkdown(data.markdown.trim() || data.starterMarkdown || '');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load template.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (!kind) {
    return <Navigate to="/settings?tab=campaignDefaults" replace />;
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!kind) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveUserTemplateResource(kind, markdown);
      setMessage('Template saved.');
      navigate('/settings?tab=campaignDefaults');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save template.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading template editor…" />;
  }

  return (
    <PageContainer className="gap-6">
      <SettingsPageLayout className="flex flex-col gap-6">
        <Link
          to="/settings?tab=campaignDefaults"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Campaign Defaults
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {resource?.editorTitle ?? 'Edit template'}
          </h1>
          <p className="text-sm text-muted">
            This template can be imported into new campaigns as recruitment documentation.
          </p>
        </header>

        {error && !resource ? (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <WikiTipTapEditor
              content={markdown}
              onChange={setMarkdown}
              wikiTree={[]}
              minHeight="min-h-[50vh]"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <SettingsStickyActions>
            <Link
              to="/settings?tab=campaignDefaults"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-elevated"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </SettingsStickyActions>
        </form>
        )}
      </SettingsPageLayout>
    </PageContainer>
  );
}
