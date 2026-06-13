import { Link } from 'react-router-dom';
import type { StoryboardProjectedEdge } from '@shared/storyboardEdgeDerivation';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';

interface StoryboardEdgeInspectorProps {
  edge: StoryboardProjectedEdge | null;
  campaignHandle: string;
  sourceTitle?: string;
}

export function StoryboardEdgeInspector({
  edge,
  campaignHandle,
  sourceTitle,
}: StoryboardEdgeInspectorProps) {
  const { flatPages } = useWiki();

  if (!edge) {
    return (
      <p className="text-[10px] text-muted-foreground/70">
        Select an edge to see why it is connected.
      </p>
    );
  }

  const editHref = campaignWikiPath(campaignHandle, edge.sourceId, flatPages);

  return (
    <div className="rounded border border-border bg-card/50 px-2.5 py-2 text-xs">
      <p className="font-mono text-[10px] text-primary">{edge.relationKind}</p>
      <p className="mt-1 text-muted-foreground">
        Derived from: <span className="font-mono text-foreground">{edge.derivationSource}</span>
      </p>
      <p className="mt-1 text-foreground">{edge.explanation}</p>
      {sourceTitle ? (
        <p className="mt-1 text-[10px] text-muted-foreground">Source: {sourceTitle}</p>
      ) : null}
      <Link
        to={editHref}
        className="mt-2 inline-block text-[10px] text-primary hover:underline"
      >
        {edge.editable ? 'Edit sequence on source scene' : 'Edit source entity'}
      </Link>
    </div>
  );
}
