import { Link } from 'react-router-dom';
import { AncestryInheritancePanel } from './AncestryInheritancePanel';
import {
  buildAncestryInheritanceProjection,
} from '@/lib/ancestryInheritanceProjection';
import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';

interface AncestryLineagesTabProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
}

export function AncestryLineagesTab({
  campaignHandle,
  pageId,
  flatPages,
  pageMetadata,
}: AncestryLineagesTabProps) {
  const ancestry = parseAncestryMetadata(pageMetadata);
  const projection = buildAncestryInheritanceProjection(pageId, flatPages);
  const isRoot = ancestry.entityKind === 'root';

  return (
    <div className="space-y-4">
      {projection.parentChain.length > 1 ? (
        <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Ancestry chain
          </h3>
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {projection.parentChain.map((node, index) => (
              <li key={node.pageId} className="flex items-center gap-1">
                {index > 0 ? <span className="text-muted">→</span> : null}
                <Link
                  to={campaignWikiPath(campaignHandle, node.pageId, flatPages)}
                  className={
                    node.pageId === pageId
                      ? 'font-semibold text-primary'
                      : 'text-foreground/90 hover:text-primary hover:underline'
                  }
                >
                  {node.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {isRoot ? (
        <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Child lineages
          </h3>
          {projection.childLineages.length > 0 ? (
            <ul className="space-y-2">
              {projection.childLineages.map((lineage) => {
                const meta = parseAncestryMetadata(lineage.metadata);
                return (
                  <li
                    key={lineage.id}
                    className="rounded-md border border-border/50 bg-surface/30 px-3 py-2"
                  >
                    <Link
                      to={campaignWikiPath(campaignHandle, lineage.id, flatPages)}
                      className="font-medium text-primary hover:underline"
                    >
                      {lineage.title}
                    </Link>
                    {meta.identitySummary ? (
                      <p className="mt-1 text-sm text-muted">{meta.identitySummary}</p>
                    ) : meta.knownFor ? (
                      <p className="mt-1 text-sm text-muted">{meta.knownFor}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No lineages branch from this root ancestry yet.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Inherited traits & physiology
          </h3>
          <AncestryInheritancePanel pageId={pageId} flatPages={flatPages} />
        </section>
      )}
    </div>
  );
}
