import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import type { BlocSummary } from '@shared/relationshipLensProjections';

export type RelationsDetailSelection =
  | { kind: 'bloc'; bloc: BlocSummary }
  | { kind: 'entity'; id: string; title: string; codexType?: string | null }
  | null;

interface RelationsDetailPanelProps {
  campaignHandle: string;
  selection: RelationsDetailSelection;
}

export function RelationsDetailPanel({ campaignHandle, selection }: RelationsDetailPanelProps) {
  const { flatPages } = useWiki();

  if (!selection) {
    return (
      <aside className="rounded-lg border border-border/60 bg-surface/30 p-4 text-sm text-muted">
        Select a faction or figure to see standing and context.
      </aside>
    );
  }

  if (selection.kind === 'bloc') {
    const { bloc } = selection;
    return (
      <aside className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
        <h3 className={TYPE_DISPLAY_CLASS}>{bloc.title}</h3>
        <p className="text-sm text-muted">{bloc.memberCount} members in this faction</p>
        {bloc.standingLabel && bloc.partyTrust !== null ? (
          <div>
            <p className={META_SECTION_LABEL_CLASS}>Standing with the party</p>
            <p className="text-sm font-medium text-foreground">
              {bloc.standingLabel} ({bloc.partyTrust > 0 ? '+' : ''}
              {bloc.partyTrust})
            </p>
          </div>
        ) : null}
        <Link
          to={campaignWikiPath(campaignHandle, bloc.id, flatPages)}
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          View details
        </Link>
      </aside>
    );
  }

  return (
    <aside className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
      <h3 className={TYPE_DISPLAY_CLASS}>{selection.title}</h3>
      {selection.codexType ? (
        <p className={META_SECTION_LABEL_CLASS}>{selection.codexType}</p>
      ) : null}
      <Link
        to={campaignWikiPath(campaignHandle, selection.id, flatPages)}
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        View details
      </Link>
    </aside>
  );
}
