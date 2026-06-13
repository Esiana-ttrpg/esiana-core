import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitBranch, Loader2 } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { useRelationsProjection } from '@/hooks/useRelationsProjection';
import { RelationsNarrativeSummary } from '@/components/relations/RelationsNarrativeSummary';
import { RelationsTruncationBanner } from '@/components/relations/RelationsTruncationBanner';
import { RelationsBlocsView } from '@/components/relations/RelationsBlocsView';
import { RelationsReputationView } from '@/components/relations/RelationsReputationView';
import { RelationsConnectionsCanvas } from '@/components/relations/RelationsConnectionsCanvas';
import { RelationsDetailPanel, type RelationsDetailSelection } from '@/components/relations/RelationsDetailPanel';
import { RelationsStructureView } from '@/components/relations/RelationsStructureView';
import { RelationsInstitutionalView } from '@/components/relations/RelationsInstitutionalView';
import { RelationsKinshipView } from '@/components/relations/RelationsKinshipView';
import { resolveSocialViewKey } from '@/lib/relationshipLensRenderers';
import type {
  RelationsLens,
  SocialRelationsRenderModel,
} from '@shared/relationshipLensProjections';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const LENS_OPTIONS: { id: RelationsLens; label: string }[] = [
  { id: 'social', label: 'Social Dynamics' },
  { id: 'structure', label: 'Structure & Hierarchy' },
  { id: 'kinship', label: 'Kinship & Legacy' },
];

const SOCIAL_MODES = [
  { id: 'blocs', label: 'Blocs' },
  { id: 'reputation', label: 'Reputation' },
  { id: 'conflicts', label: 'Conflicts' },
  { id: 'connections', label: 'Connections' },
  { id: 'influence', label: 'Influence' },
] as const;

const STRUCTURE_MODES = [
  { id: 'chain', label: 'Chain of Command' },
  { id: 'institutional', label: 'Institutional Map' },
] as const;

const KINSHIP_MODES = [
  { id: 'generations', label: 'Generations' },
  { id: 'succession', label: 'Succession' },
] as const;

export function RelationsPage() {
  const { campaignHandle } = useWiki();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selection, setSelection] = useState<RelationsDetailSelection>(null);

  const lens = (searchParams.get('lens') as RelationsLens) || 'social';
  const mode = searchParams.get('mode') || (lens === 'social' ? 'blocs' : 'chain');
  const level = searchParams.get('level') || 'summary';
  const focus = searchParams.get('focus') || 'party';
  const at = searchParams.get('at') || 'current';
  const includeHistorical = searchParams.get('includeHistorical') === 'true';
  const showPresets = !searchParams.has('lens') && !searchParams.has('focus');

  const projectionParams = useMemo(
    () =>
      campaignHandle
        ? {
            campaignHandle,
            lens,
            mode,
            level: level as 'summary' | 'cluster' | 'entity',
            focus,
            at,
            includeHistorical,
          }
        : null,
    [campaignHandle, lens, mode, level, focus, at, includeHistorical],
  );

  const { data, loading, error } = useRelationsProjection(projectionParams);

  const navigate = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        next.set(key, value);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const socialModel =
    data?.lens === 'social' ? (data as SocialRelationsRenderModel) : null;
  const viewKey = socialModel ? resolveSocialViewKey(socialModel) : null;

  const breadcrumb = useMemo(() => {
    const parts = ['Overview'];
    if (level === 'cluster' && focus.startsWith('bloc:')) {
      const bloc = socialModel?.blocs.find((b) => b.id === focus.slice(5));
      if (bloc) parts.push(bloc.title);
    }
    if (level === 'entity' && focus.startsWith('wiki_page:')) {
      const node = socialModel?.connectionNodes.find(
        (n) => n.id === focus.slice('wiki_page:'.length),
      );
      if (node) parts.push(node.title);
    }
    return parts.join(' → ');
  }, [focus, level, socialModel]);

  if (!campaignHandle) return null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch className="size-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold text-foreground">Relations</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted">Different lenses. One world.</p>
      </header>

      {showPresets ? (
        <section className="rounded-lg border border-border bg-surface/30 p-6">
          <h2 className="text-lg font-medium text-foreground">Explore Relationships</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PresetCard
              title="Party Dynamics"
              description="What does the world think of the party?"
              onClick={() =>
                navigate({ lens: 'social', mode: 'reputation', level: 'summary', focus: 'party' })
              }
            />
            <PresetCard
              title="Faction Politics"
              description="Major blocs, tensions, and standings"
              onClick={() =>
                navigate({ lens: 'social', mode: 'blocs', level: 'summary', focus: 'party' })
              }
            />
            <PresetCard
              title="Character Connections"
              description="Pick a character from the codex, then use View connections"
              onClick={() => navigate({ lens: 'social', mode: 'blocs', level: 'summary', focus: 'party' })}
            />
            <PresetCard
              title="Institutional Map"
              description="Organizations, subordinates, and command structure"
              onClick={() =>
                navigate({
                  lens: 'structure',
                  mode: 'institutional',
                  level: 'summary',
                  focus: 'party',
                })
              }
            />
            <PresetCard
              title="Family Legacies"
              description="Lineage and succession across generations"
              onClick={() =>
                navigate({ lens: 'kinship', mode: 'generations', level: 'summary', focus: 'party' })
              }
            />
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Focus:</span>
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={focus}
          onChange={(e) => navigate({ focus: e.target.value, level: 'summary' })}
        >
          <option value="party">The party</option>
          {socialModel?.blocs.map((b) => (
            <option key={b.id} value={`bloc:${b.id}`}>
              {b.title}
            </option>
          ))}
        </select>
        <span className="ml-2 text-muted">Time:</span>
        <select
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
          value={at === 'current' ? 'current' : 'custom'}
          onChange={(e) => {
            if (e.target.value === 'current') navigate({ at: 'current' });
          }}
        >
          <option value="current">Current</option>
          <option value="custom" disabled={at === 'current'}>
            Custom date
          </option>
        </select>
        <label className="sr-only" htmlFor="relations-at-date">
          Relations timeline date
        </label>
        <input
          id="relations-at-date"
          type="date"
          className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          value={at !== 'current' && at.includes('-') ? at : ''}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              navigate({ at: 'current' });
              return;
            }
            const [year, month, day] = value.split('-');
            navigate({ at: `${year}-${Number(month)}-${Number(day)}` });
          }}
        />
        <label className="ml-2 flex items-center gap-1.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={includeHistorical}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.checked) next.set('includeHistorical', 'true');
              else next.delete('includeHistorical');
              setSearchParams(next);
            }}
          />
          Include historical ties
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr_260px]">
        <nav className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Lens</p>
            <ul className="space-y-1">
              {LENS_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      lens === opt.id
                        ? 'bg-primary/15 font-medium text-primary'
                        : 'text-muted hover:bg-surface/60'
                    }`}
                    onClick={() =>
                      navigate({
                        lens: opt.id,
                        mode: opt.id === 'social' ? 'blocs' : opt.id === 'structure' ? 'chain' : 'generations',
                        level: 'summary',
                      })
                    }
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {lens === 'social' ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">View</p>
              <ul className="space-y-1">
                {SOCIAL_MODES.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                        mode === m.id
                          ? 'bg-primary/15 font-medium text-primary'
                          : 'text-muted hover:bg-surface/60'
                      }`}
                      onClick={() =>
                        navigate({
                          mode: m.id,
                          level: m.id === 'connections' ? 'entity' : 'summary',
                        })
                      }
                    >
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {lens === 'structure' ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">View</p>
              <ul className="space-y-1">
                {STRUCTURE_MODES.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                        mode === m.id
                          ? 'bg-primary/15 font-medium text-primary'
                          : 'text-muted hover:bg-surface/60'
                      }`}
                      onClick={() =>
                        navigate({
                          mode: m.id,
                          level: 'summary',
                          focus: m.id === 'institutional' ? 'party' : focus,
                        })
                      }
                    >
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {lens === 'kinship' ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">View</p>
              <ul className="space-y-1">
                {KINSHIP_MODES.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                        mode === m.id
                          ? 'bg-primary/15 font-medium text-primary'
                          : 'text-muted hover:bg-surface/60'
                      }`}
                      onClick={() => navigate({ mode: m.id, level: 'summary' })}
                    >
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>

        <main className="min-w-0 space-y-4">
          <p className="text-xs text-muted">{breadcrumb}</p>
          {loading && !data ? <LoadingSpinner label="Loading relations" /> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {data ? (
            <>
              <RelationsNarrativeSummary summary={data.narrativeSummary} />
              <RelationsTruncationBanner truncation={data.truncation} />
              {data.lens === 'social' && socialModel ? (
                <>
                  {viewKey === 'reputation' ? (
                    <RelationsReputationView
                      model={socialModel}
                      onSelectBloc={(id, title) =>
                        setSelection({
                          kind: 'bloc',
                          bloc: socialModel.blocs.find((b) => b.id === id) ?? {
                            id,
                            title,
                            codexType: 'ORGANIZATION',
                            memberCount: 0,
                            partyTrust: null,
                            partyNotoriety: null,
                            standingLabel: null,
                          },
                        })
                      }
                    />
                  ) : null}
                  {viewKey === 'conflicts' ? (
                    <ul className="space-y-2 text-sm">
                      {socialModel.conflicts.map((c) => (
                        <li key={c.id} className="rounded-md border border-border/50 px-3 py-2">
                          {c.description}
                        </li>
                      ))}
                      {socialModel.conflicts.length === 0 ? (
                        <li className="text-muted">No active conflicts at this focus.</li>
                      ) : null}
                    </ul>
                  ) : null}
                  {viewKey === 'influence' ? (
                    <p className="text-sm text-muted">
                      Influence overlay — territory and power density (coming soon).
                    </p>
                  ) : null}
                  {viewKey === 'connections' ? (
                    <RelationsConnectionsCanvas
                      model={socialModel}
                      onSelectNode={(id, title) =>
                        setSelection({ kind: 'entity', id, title })
                      }
                    />
                  ) : null}
                  {viewKey === 'explore' ? (
                    <ul className="space-y-2">
                      {socialModel.members.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            className="text-sm text-primary hover:underline"
                            onClick={() =>
                              navigate({
                                focus: `wiki_page:${m.id}`,
                                level: 'entity',
                                mode: 'connections',
                              })
                            }
                          >
                            {m.title}
                            {m.role ? ` · ${m.role}` : ''} — View connections
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {viewKey === 'blocs' ? (
                    <RelationsBlocsView
                      model={socialModel}
                      onExploreBloc={(blocId) =>
                        navigate({ focus: `bloc:${blocId}`, level: 'cluster', mode: 'blocs' })
                      }
                      onSelectBloc={(bloc) => setSelection({ kind: 'bloc', bloc })}
                    />
                  ) : null}
                </>
              ) : null}
              {data.lens === 'structure' ? (
                data.mode === 'institutional' && level === 'summary' && focus === 'party' ? (
                  <RelationsInstitutionalView
                    model={data}
                    onExploreOrg={(orgId) =>
                      navigate({
                        focus: `bloc:${orgId}`,
                        level: 'cluster',
                        mode: 'chain',
                      })
                    }
                    onSelectNode={(id, title) => setSelection({ kind: 'entity', id, title })}
                  />
                ) : (
                  <RelationsStructureView
                    model={data}
                    onSelectNode={(id, title) => setSelection({ kind: 'entity', id, title })}
                  />
                )
              ) : null}
              {data.lens === 'kinship' ? (
                <RelationsKinshipView
                  model={data}
                  mode={data.mode === 'succession' ? 'succession' : 'generations'}
                  onSelectMember={(id, title) => setSelection({ kind: 'entity', id, title })}
                />
              ) : null}
            </>
          ) : null}
          {loading && data ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Updating…
            </div>
          ) : null}
        </main>

        <RelationsDetailPanel campaignHandle={campaignHandle} selection={selection} />
      </div>
    </div>
  );
}

function PresetCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border bg-background/40 p-4 text-left transition-colors hover:border-primary/50"
    >
      <span className="font-medium text-foreground">{title}</span>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </button>
  );
}

export function RelationsPageWithSearch() {
  return <RelationsPage />;
}
