import type { AncestryHubSection as AncestrySection } from '@/lib/ancestryHubGrouping';
import type { CategoryIndexChild } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';
import { AncestryCodexTile } from './AncestryCodexTile';

interface AncestryHubSectionProps {
  section: AncestrySection;
  flatPages: WikiTreeNode[];
  pageById: Map<string, WikiTreeNode>;
  selectedAncestryId: string | null;
  showTaxonomyTree: boolean;
  onSelectAncestry: (id: string) => void;
  onOpenAncestry: (id: string) => void;
}

export function AncestryHubSection({
  section,
  flatPages,
  pageById,
  selectedAncestryId,
  showTaxonomyTree,
  onSelectAncestry,
  onOpenAncestry,
}: AncestryHubSectionProps) {
  const lineageCount = section.taxonomyGroups.reduce(
    (sum, group) => sum + group.lineages.length,
    0,
  );

  function renderTile(child: CategoryIndexChild, nested = false) {
    return (
      <AncestryCodexTile
        key={child.id}
        child={child}
        flatPages={flatPages}
        pageById={pageById}
        selected={selectedAncestryId === child.id}
        nested={nested}
        onSelect={onSelectAncestry}
        onOpen={onOpenAncestry}
      />
    );
  }

  return (
    <section className="space-y-3">
      {section.label ? (
        <header className="bestiary-section-header bestiary-section-header--default">
          <h2 className="text-lg font-semibold text-focal-foreground">
            {section.label}
          </h2>
          {showTaxonomyTree && lineageCount > 0 ? (
            <p className="mt-0.5 text-sm text-muted">
              {lineageCount} lineage{lineageCount === 1 ? '' : 's'}
            </p>
          ) : !showTaxonomyTree ? (
            <p className="mt-0.5 text-sm text-muted">
              {section.entries.length}{' '}
              {section.entries.length === 1 ? 'ancestry' : 'ancestries'}
            </p>
          ) : null}
        </header>
      ) : null}

      {showTaxonomyTree ? (
        <div className="space-y-4" role="listbox" aria-label={section.label}>
          {section.taxonomyGroups.map((group) => (
            <div key={group.root.id} className="space-y-2">
              {renderTile(group.root)}
              {group.lineages.length > 0 ? (
                <div className="space-y-2">
                  {group.lineages.map((lineage) => renderTile(lineage, true))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="bestiary-codex-grid"
          role="listbox"
          aria-label={section.label || 'Ancestries'}
        >
          {section.entries.map((child) => renderTile(child))}
        </div>
      )}
    </section>
  );
}
