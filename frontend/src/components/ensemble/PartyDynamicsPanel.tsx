import type { PartyDynamicsProjection } from '@/lib/buildPartyProjection';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

interface PartyDynamicsPanelProps {
  dynamics: PartyDynamicsProjection;
  campaignHandle: string;
  flatPages: readonly WikiPageLineageSnapshot[];
}

export function PartyDynamicsPanel({
  dynamics,
  campaignHandle,
  flatPages,
}: PartyDynamicsPanelProps) {
  const hasConnections = dynamics.sharedConnections.length > 0;
  const hasTensions = dynamics.tensionNotes.length > 0;

  if (!hasConnections && !hasTensions) return null;

  return (
    <section className="grid gap-6 sm:grid-cols-2">
      {hasConnections ? (
        <div className="space-y-2">
          <h2 className="font-serif text-lg font-semibold text-foreground">Connected through</h2>
          <ul className="flex flex-wrap gap-2">
            {dynamics.sharedConnections.map((row) => {
              const page = flatPages.find((p) => p.id === row.pageId);
              return (
              <li key={`${row.kind}-${row.pageId}`}>
                <EntityRelationChip
                  campaignHandle={campaignHandle}
                  pageId={row.pageId}
                  title={row.label}
                  templateType={page?.templateType ?? 'DEFAULT'}
                  subtitle={`${row.memberCount} members`}
                  flatPages={flatPages}
                  showPreview
                />
              </li>
            );
            })}
          </ul>
        </div>
      ) : null}

      {hasTensions ? (
        <div className="space-y-2">
          <h2 className="font-serif text-lg font-semibold text-foreground">Tensions</h2>
          <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
            {dynamics.tensionNotes.map((note) => (
              <li key={note} className="border-l-2 border-amber-500/40 pl-3">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
