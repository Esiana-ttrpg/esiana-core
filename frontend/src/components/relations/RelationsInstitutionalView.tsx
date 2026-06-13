import { memo } from 'react';
import type { StructureRelationsRenderModel } from '@shared/relationshipLensProjections';

interface RelationsInstitutionalViewProps {
  model: StructureRelationsRenderModel;
  onExploreOrg: (orgId: string) => void;
  onSelectNode: (id: string, title: string) => void;
}

const OrgCard = memo(function OrgCard({
  title,
  role,
  onExplore,
  onSelect,
}: {
  title: string;
  role: string | null;
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
      <h3 className="font-medium text-foreground">{title}</h3>
      {role ? <p className="mt-1 text-xs text-muted">{role}</p> : null}
      <button
        type="button"
        className="mt-3 text-xs font-medium text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onExplore();
        }}
      >
        Explore organization
      </button>
    </article>
  );
});

export function RelationsInstitutionalView({
  model,
  onExploreOrg,
  onSelectNode,
}: RelationsInstitutionalViewProps) {
  const orgs = model.nodes.filter((node) => node.depth === 0);
  if (orgs.length === 0) {
    return (
      <p className="text-sm text-muted">
        No organizations are available for an institutional overview.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {orgs.map((org) => (
        <OrgCard
          key={org.id}
          title={org.title}
          role={org.role}
          onSelect={() => onSelectNode(org.id, org.title)}
          onExplore={() => onExploreOrg(org.id)}
        />
      ))}
    </div>
  );
}
