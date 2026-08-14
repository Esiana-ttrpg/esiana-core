import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { readEntityCategoryFromMetadata } from '@shared/wikiTemplateType';
import { parseLocationMetadata } from '@/lib/locationMetadata';
import type { WikiTreeNode } from '@/types/wiki';

export interface LocationTreeNode {
  pageId: string;
  title: string;
  depth: number;
  isCurrent: boolean;
  children: LocationTreeNode[];
}

function isLocationCategory(page: WikiTreeNode): boolean {
  return readEntityCategoryFromMetadata(page.metadata) === 'locations';
}

export function buildLocationRelationshipTree(
  locationPageId: string,
  flatPages: readonly WikiTreeNode[],
): LocationTreeNode[] {
  const page = flatPages.find((p) => p.id === locationPageId);
  if (!page) return [];

  const ancestors: WikiTreeNode[] = [];
  let cursor: WikiTreeNode | undefined = page;
  const seen = new Set<string>();
  while (cursor?.parentId && !seen.has(cursor.parentId)) {
    seen.add(cursor.parentId);
    const parent = flatPages.find((p) => p.id === cursor!.parentId);
    if (!parent) break;
    if (isLocationCategory(parent)) {
      ancestors.unshift(parent);
    }
    cursor = parent;
  }

  function buildSubtree(rootId: string, depth: number): LocationTreeNode {
    const root = flatPages.find((p) => p.id === rootId)!;
    const childPages = flatPages
      .filter((p) => p.parentId === rootId && isLocationCategory(p))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    return {
      pageId: root.id,
      title: root.title,
      depth,
      isCurrent: root.id === locationPageId,
      children: childPages.map((c) => buildSubtree(c.id, depth + 1)),
    };
  }

  if (ancestors.length === 0) {
    return [buildSubtree(locationPageId, 0)];
  }

  const root = ancestors[0]!;
  return [buildSubtree(root.id, 0)];
}

function TreeNode({
  node,
  campaignHandle,
  flatPages,
}: {
  node: LocationTreeNode;
  campaignHandle: string;
  flatPages: readonly WikiTreeNode[];
}) {
  return (
    <li className="list-none">
      <div
        className="flex items-baseline gap-1 py-0.5"
        style={{ paddingLeft: `${node.depth * 12}px` }}
      >
        {node.depth > 0 ? (
          <span className="text-muted select-none" aria-hidden>
            └
          </span>
        ) : null}
        <Link
          to={campaignWikiPath(campaignHandle, node.pageId, flatPages)}
          className={
            node.isCurrent
              ? 'text-sm font-medium text-primary'
              : 'text-sm text-foreground hover:text-primary'
          }
        >
          {node.title}
        </Link>
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.pageId}
              node={child}
              campaignHandle={campaignHandle}
              flatPages={flatPages}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function LocationRelationshipTree({
  locationPageId,
  campaignHandle,
  flatPages,
  pageMetadata,
}: {
  locationPageId: string;
  campaignHandle: string;
  flatPages: readonly WikiTreeNode[];
  pageMetadata: unknown;
}) {
  const trees = useMemo(
    () => buildLocationRelationshipTree(locationPageId, flatPages),
    [locationPageId, flatPages],
  );
  const meta = parseLocationMetadata(pageMetadata);
  const regionPage = meta.regionPageId
    ? flatPages.find((p) => p.id === meta.regionPageId)
    : null;

  if (trees.length === 0 && !regionPage) {
    return (
      <p className="text-sm text-muted">
        Containment links appear as you nest locations under one another in the codex.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {regionPage ? (
        <p className="text-xs text-muted">
          Political region:{' '}
          <Link
            to={campaignWikiPath(campaignHandle, regionPage.id, flatPages)}
            className="text-primary hover:underline"
          >
            {regionPage.title}
          </Link>
        </p>
      ) : null}
      <ul className="font-mono text-[13px] leading-relaxed">
        {trees.map((root) => (
          <TreeNode
            key={root.pageId}
            node={root}
            campaignHandle={campaignHandle}
            flatPages={flatPages}
          />
        ))}
      </ul>
    </div>
  );
}
