import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KinshipEdge,
  KinshipRelationsRenderModel,
  KinshipMode,
} from '@shared/relationshipLensProjections';
import {
  groupKinshipByGeneration,
  kinshipConnectorEdges,
} from '@/lib/relationshipLensRenderers';

function isSuccessionEdge(edge: KinshipEdge): boolean {
  const upper = edge.relationshipType.trim().toUpperCase();
  return upper === 'SUCCESSOR' || upper === 'HEIR';
}

interface RelationsKinshipViewProps {
  model: KinshipRelationsRenderModel;
  mode?: KinshipMode;
  onSelectMember: (id: string, title: string) => void;
}

export function RelationsKinshipView({
  model,
  mode = 'generations',
  onSelectMember,
}: RelationsKinshipViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const rafRef = useRef<number | null>(null);

  const generations = useMemo(
    () => groupKinshipByGeneration(model.members),
    [model.members],
  );

  const memberIds = useMemo(
    () => new Set(model.members.map((m) => m.id)),
    [model.members],
  );

  const connectorEdges = useMemo(() => {
    const edges = kinshipConnectorEdges(model.edges, memberIds);
    if (mode === 'succession') {
      const successionIds = new Set(
        model.edges.filter(isSuccessionEdge).flatMap((e) => [e.sourceId, e.targetId]),
      );
      return edges.filter(
        (edge) => successionIds.has(edge.parentId) && successionIds.has(edge.childId),
      );
    }
    return edges;
  }, [model.edges, memberIds, mode]);

  const successionMemberIds = useMemo(
    () =>
      new Set(
        model.edges
          .filter(isSuccessionEdge)
          .flatMap((edge) => [edge.sourceId, edge.targetId]),
      ),
    [model.edges],
  );

  const measureAndDraw = useCallback(() => {
    const container = containerRef.current;
    if (!container || connectorEdges.length === 0) {
      setPaths([]);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const nextPaths: string[] = [];
    for (const edge of connectorEdges) {
      const parentEl = container.querySelector<HTMLElement>(
        `[data-kinship-id="${edge.parentId}"]`,
      );
      const childEl = container.querySelector<HTMLElement>(
        `[data-kinship-id="${edge.childId}"]`,
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
    setPaths(nextPaths);
  }, [connectorEdges]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => measureAndDraw());
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measureAndDraw());
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [measureAndDraw, generations]);

  if (model.members.length === 0) {
    return (
      <p className="text-sm text-muted">
        No lineage links recorded for this focus. Explore a house from the codex or set a family focus.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="relative space-y-6">
      {paths.length > 0 ? (
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

      {generations.map((row) => (
        <div key={row.generation} className="relative z-10 space-y-2">
          <h3 className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Generation {row.generation + 1}
          </h3>
          <div
            className="grid gap-3"
            style={{ gridAutoFlow: 'column', gridAutoColumns: 'minmax(9rem, 1fr)' }}
          >
            {row.members.map((member) => (
              <button
                key={member.id}
                type="button"
                data-kinship-id={member.id}
                className={`min-w-[9rem] rounded-lg border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/50 ${
                  mode === 'succession' && successionMemberIds.has(member.id)
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/60 bg-surface/50'
                }`}
                onClick={() => onSelectMember(member.id, member.title)}
              >
                <span className="font-medium">{member.title}</span>
                {member.lineageRole ? (
                  <span className="mt-0.5 block text-[10px] text-muted">{member.lineageRole}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}

      {mode === 'succession' && model.edges.filter(isSuccessionEdge).length > 0 ? (
        <ul className="space-y-1 text-xs text-muted">
          {model.edges.filter(isSuccessionEdge).slice(0, 8).map((edge) => {
            const src = model.members.find((m) => m.id === edge.sourceId);
            const tgt = model.members.find((m) => m.id === edge.targetId);
            return (
              <li key={edge.id} className="text-foreground/90">
                {src?.title ?? edge.sourceId} → {edge.relationshipType.toLowerCase()} →{' '}
                {tgt?.title ?? edge.targetId}
              </li>
            );
          })}
        </ul>
      ) : null}
      {mode === 'generations' && model.edges.some((e) => e.linkKind === 'spouse') ? (
        <p className="text-xs text-muted">
          Spouse bonds are listed in the detail panel; parent-child ties appear as generation connectors.
        </p>
      ) : null}
    </div>
  );
}
