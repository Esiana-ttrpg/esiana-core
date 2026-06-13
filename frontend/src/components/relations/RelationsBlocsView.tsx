import { memo } from 'react';
import type { BlocSummary, SocialRelationsRenderModel } from '@shared/relationshipLensProjections';

interface RelationsBlocsViewProps {
  model: SocialRelationsRenderModel;
  onExploreBloc: (blocId: string) => void;
  onSelectBloc: (bloc: BlocSummary) => void;
}

const BlocCard = memo(function BlocCard({
  bloc,
  onExplore,
  onSelect,
}: {
  bloc: BlocSummary;
  onExplore: () => void;
  onSelect: () => void;
}) {
  return (
    <article
      className="rounded-lg border border-border bg-surface/60 p-4 transition-colors hover:border-primary/40"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-foreground">{bloc.title}</h3>
        {bloc.standingLabel && bloc.partyTrust !== null ? (
          <span className="shrink-0 text-xs text-muted">
            {bloc.standingLabel} ({bloc.partyTrust > 0 ? '+' : ''}
            {bloc.partyTrust})
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">{bloc.memberCount} members</p>
      <button
        type="button"
        className="mt-3 text-xs font-medium text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onExplore();
        }}
      >
        Explore faction
      </button>
    </article>
  );
});

export function RelationsBlocsView({
  model,
  onExploreBloc,
  onSelectBloc,
}: RelationsBlocsViewProps) {
  return (
    <div className="space-y-4">
      {model.tensions.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {model.tensions.map((tension) => (
            <li
              key={tension.id}
              className="rounded-md border border-border/50 bg-background/40 px-3 py-2 text-muted"
            >
              <span className="text-foreground">{tension.sourceBlocTitle}</span>
              {' ↔ '}
              <span className="text-foreground">{tension.stance}</span>
              {' ↔ '}
              <span className="text-foreground">{tension.targetBlocTitle}</span>
              {tension.supportingEdgeCount > 1 ? (
                <span className="ml-1 text-xs">({tension.supportingEdgeCount} ties)</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {model.blocs.map((bloc) => (
          <BlocCard
            key={bloc.id}
            bloc={bloc}
            onExplore={() => onExploreBloc(bloc.id)}
            onSelect={() => onSelectBloc(bloc)}
          />
        ))}
      </div>
    </div>
  );
}
