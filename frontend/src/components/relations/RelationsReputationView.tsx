import type { SocialRelationsRenderModel } from '@shared/relationshipLensProjections';

interface RelationsReputationViewProps {
  model: SocialRelationsRenderModel;
  onSelectBloc: (blocId: string, title: string) => void;
}

export function RelationsReputationView({ model, onSelectBloc }: RelationsReputationViewProps) {
  if (model.partyStandings.length === 0) {
    return (
      <p className="text-sm text-muted">No party standing recorded with major factions yet.</p>
    );
  }
  return (
    <ul className="space-y-3">
      {model.partyStandings.map((standing, index) => {
        const angle = (index / Math.max(model.partyStandings.length, 1)) * 360;
        return (
          <li key={standing.blocId}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3 text-left transition-colors hover:border-primary/40"
              onClick={() => onSelectBloc(standing.blocId, standing.blocTitle)}
            >
              <span>
                <span className="font-medium text-foreground">{standing.blocTitle}</span>
                <span className="ml-2 text-xs text-muted" style={{ opacity: 0.7 }}>
                  {Math.round(angle)}°
                </span>
              </span>
              <span className="text-sm text-muted">
                {standing.label} · Trust {standing.trust > 0 ? '+' : ''}
                {standing.trust}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
