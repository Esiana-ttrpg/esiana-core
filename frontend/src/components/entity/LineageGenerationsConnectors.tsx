import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import type { LineageLink } from '@/lib/characterLineageMetadata';
import { isRelationVisibleToViewer } from '@/lib/entityRelationTypes';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

const MAX_LINEAGE_EDGES = 48;
const MAX_CARDS_PER_ROW = 24;

interface GenerationRow {
  year: number;
  members: WikiPageLineageSnapshot[];
}

interface LineageEdge {
  parentId: string;
  childId: string;
  priority: number;
}

function linkPriority(link: LineageLink): number {
  if (link.isBiological && link.relationshipType === 'BIOLOGICAL') return 0;
  if (link.isLegal) return 1;
  return 2;
}

function buildLineageEdges(
  generations: GenerationRow[],
  allFamilyMembers: WikiPageLineageSnapshot[],
  isDMUser: boolean,
): LineageEdge[] {
  const memberIds = new Set(allFamilyMembers.map((m) => m.id));
  const yearByMember = new Map<string, number>();
  for (const row of generations) {
    for (const member of row.members) {
      yearByMember.set(member.id, row.year);
    }
  }

  const edges: LineageEdge[] = [];
  for (const member of allFamilyMembers) {
    const childYear = yearByMember.get(member.id) ?? 0;
    const lineage = parseCharacterLineageMetadata(member.metadata);
    for (const link of lineage.parentLinks) {
      if (!isRelationVisibleToViewer(link.visibility, isDMUser)) continue;
      if (!link.isPublic && !isDMUser) continue;
      if (!memberIds.has(link.targetCharacterId)) continue;
      const parentYear = yearByMember.get(link.targetCharacterId) ?? 0;
      if (parentYear >= childYear && childYear > 0 && parentYear > 0) continue;
      edges.push({
        parentId: link.targetCharacterId,
        childId: member.id,
        priority: linkPriority(link),
      });
    }
  }

  edges.sort((a, b) => a.priority - b.priority || a.parentId.localeCompare(b.parentId));
  return edges;
}

interface LineageGenerationsConnectorsProps {
  generations: GenerationRow[];
  allFamilyMembers: WikiPageLineageSnapshot[];
  isDMUser?: boolean;
  renderCard: (member: WikiPageLineageSnapshot) => ReactNode;
}

export function LineageGenerationsConnectors({
  generations,
  allFamilyMembers,
  isDMUser: isDMUserProp,
  renderCard,
}: LineageGenerationsConnectorsProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [truncatedCount, setTruncatedCount] = useState(0);
  const [connectorsDisabled, setConnectorsDisabled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWidthRef = useRef(0);

  const allEdges = useMemo(
    () => buildLineageEdges(generations, allFamilyMembers, isDMUser),
    [generations, allFamilyMembers, isDMUser],
  );

  const edges = useMemo(() => {
    if (allEdges.length > MAX_LINEAGE_EDGES) {
      return allEdges.slice(0, MAX_LINEAGE_EDGES);
    }
    return allEdges;
  }, [allEdges]);

  useEffect(() => {
    setTruncatedCount(Math.max(0, allEdges.length - edges.length));
    if (allEdges.length > MAX_LINEAGE_EDGES) {
      setConnectorsDisabled(false);
    }
  }, [allEdges.length, edges.length]);

  const measureAndDraw = useCallback(() => {
    const container = containerRef.current;
    if (!container || connectorsDisabled || edges.length === 0) {
      setPaths([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === lastWidthRef.current && paths.length > 0) {
      return;
    }
    lastWidthRef.current = containerRect.width;

    const nextPaths: string[] = [];
    for (const edge of edges) {
      const parentEl = container.querySelector<HTMLElement>(
        `[data-lineage-id="${edge.parentId}"]`,
      );
      const childEl = container.querySelector<HTMLElement>(
        `[data-lineage-id="${edge.childId}"]`,
      );
      if (!parentEl || !childEl) continue;

      const parentRect = parentEl.getBoundingClientRect();
      const childRect = childEl.getBoundingClientRect();
      const x1 = parentRect.left + parentRect.width / 2 - containerRect.left;
      const y1 = parentRect.bottom - containerRect.top;
      const x2 = childRect.left + childRect.width / 2 - containerRect.left;
      const y2 = childRect.top - containerRect.top;
      const midY = (y1 + y2) / 2;
      nextPaths.push(`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
    }

    if (nextPaths.length === 0 && edges.length > 0) {
      setConnectorsDisabled(true);
      setPaths([]);
      return;
    }

    setPaths(nextPaths);
  }, [connectorsDisabled, edges, paths.length]);

  const scheduleMeasure = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        measureAndDraw();
      });
    }, 100);
  }, [measureAndDraw]);

  useEffect(() => {
    scheduleMeasure();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => scheduleMeasure());
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleMeasure, generations, edges]);

  return (
    <div ref={containerRef} className="relative space-y-4">
      {!connectorsDisabled && paths.length > 0 ? (
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {paths.map((d, index) => (
            <path
              key={`${d}-${index}`}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-border"
              opacity={0.65}
            />
          ))}
        </svg>
      ) : null}

      {generations.map((row) => {
        const displayMembers = row.members.slice(0, MAX_CARDS_PER_ROW);
        const rowOverflow = row.members.length - displayMembers.length;
        return (
          <div key={row.year} className="relative z-10 space-y-2">
            <h3 className="text-[10px] font-medium uppercase text-muted">
              {row.year > 0 ? `Born ~Year ${row.year}` : 'Unknown generation'}
            </h3>
            <div
              className="grid gap-3"
              style={{ gridAutoFlow: 'column', gridAutoColumns: 'minmax(10rem, 1fr)' }}
            >
              {displayMembers.map((member) => (
                <div key={member.id} data-lineage-id={member.id} className="min-w-[10rem]">
                  {renderCard(member)}
                </div>
              ))}
            </div>
            {rowOverflow > 0 ? (
              <p className="text-[10px] text-muted">{rowOverflow} more in this generation</p>
            ) : null}
          </div>
        );
      })}

      {truncatedCount > 0 ? (
        <p className="text-[10px] text-muted">{truncatedCount} more lineage links</p>
      ) : null}
    </div>
  );
}
