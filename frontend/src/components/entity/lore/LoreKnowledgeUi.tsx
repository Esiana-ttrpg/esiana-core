import type { ReactNode } from 'react';
import {
  BookOpen,
  Cloud,
  Gem,
  MessageCircle,
  Megaphone,
  Notebook,
  Scroll,
  Sparkles,
  Undo2,
} from 'lucide-react';
import type { CirculationEdgeKind } from '@shared/rumorEngine';
import { CirculationEdgeKinds } from '@shared/rumorEngine';
import type { LoreSourceType } from '@/lib/loreKnowledgeProjection';
import {
  formatLoreAccountKindLabel,
  type LoreAccountKind,
} from '@/lib/loreKnowledgeProjection';

const SOURCE_ICON_CLASS = 'size-3.5 shrink-0 opacity-70';

export const loreSectionLabel =
  'font-serif text-[11px] font-medium tracking-[0.12em] text-muted [font-variant:small-caps]';

export const loreClaimText = 'text-[15px] leading-[1.55] text-foreground/95';

export const loreNarrativeText =
  'text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap pl-3 border-l-2 border-border/40';

export const loreInterpretationCardClass =
  'rounded-lg border border-border/30 bg-muted/10 px-4 py-3 shadow-inner';

export const loreFieldClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/60';

/** @deprecated Use loreFieldClass */
export const fieldClass = loreFieldClass;

export function LoreSliceError({ message }: { message: string }) {
  return (
    <p className="text-xs text-muted" role="status">
      {message}
    </p>
  );
}

export function LoreSemanticStackSkeleton() {
  return (
    <div
      className="mb-4 min-h-[4.5rem] animate-pulse space-y-2 rounded-lg border border-border/30 bg-muted/5 px-4 py-3"
      aria-busy="true"
      aria-label="Loading lore sections"
    >
      <div className="h-3 w-32 rounded bg-muted/40" />
      <div className="h-3 w-48 rounded bg-muted/30" />
      <div className="h-3 w-40 rounded bg-muted/30" />
    </div>
  );
}

export function LoreStickySubheader({
  children,
  badge,
  className = '',
  variant = 'label',
}: {
  children: ReactNode;
  badge?: string;
  className?: string;
  /** `label` = small-caps section title; `content` = claim excerpt or custom block */
  variant?: 'label' | 'content';
}) {
  return (
    <div
      className={`sticky top-[2.25rem] z-[5] -mx-1 flex items-start gap-2 bg-background/80 px-1 py-1.5 backdrop-blur-[2px] ${className}`}
    >
      {variant === 'label' ? (
        <span className={loreSectionLabel}>{children}</span>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
      {badge ? (
        <span className="shrink-0 rounded-full border border-border/50 bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function LoreSourceTypeIcon({ sourceType }: { sourceType: LoreSourceType }) {
  switch (sourceType) {
    case 'JOURNAL':
      return <Notebook className={SOURCE_ICON_CLASS} aria-hidden />;
    case 'NPC_TESTIMONY':
      return <MessageCircle className={SOURCE_ICON_CLASS} aria-hidden />;
    case 'EVENT_RECORD':
      return <Scroll className={SOURCE_ICON_CLASS} aria-hidden />;
    case 'ARTIFACT':
      return <Gem className={SOURCE_ICON_CLASS} aria-hidden />;
    case 'RUMOR':
      return <Cloud className={`${SOURCE_ICON_CLASS} opacity-40`} aria-hidden />;
    case 'DIVINE_VISION':
      return <Sparkles className={SOURCE_ICON_CLASS} aria-hidden />;
    default:
      return <BookOpen className={SOURCE_ICON_CLASS} aria-hidden />;
  }
}

export function LoreAccountBadge({ kind }: { kind: LoreAccountKind }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted">
      {formatLoreAccountKindLabel(kind)}
    </span>
  );
}

export function LoreConfidenceDot({ confidence }: { confidence: string }) {
  const tone =
    confidence === 'VERIFIED'
      ? 'bg-emerald-500/70'
      : confidence === 'PARTIAL'
        ? 'bg-amber-500/60'
        : confidence === 'CONTESTED'
          ? 'bg-orange-500/50'
          : 'bg-muted-foreground/40';
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${tone}`}
      title={confidence.toLowerCase()}
      aria-hidden
    />
  );
}

export const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'PARTY', label: 'Party' },
  { value: 'GM_ONLY', label: 'GM only' },
  { value: 'SECRET', label: 'Secret' },
] as const;

export const USAGE_TYPE_OPTIONS = [
  { value: 'OFFICIAL', label: 'Official' },
  { value: 'COLLOQUIAL', label: 'Colloquial' },
  { value: 'PEJORATIVE', label: 'Pejorative' },
  { value: 'RELIGIOUS', label: 'Religious' },
  { value: 'FOREIGN_LANGUAGE', label: 'Foreign language' },
  { value: 'SECRET', label: 'Secret designation' },
  { value: 'MYTHIC', label: 'Mythic' },
] as const;

export const ACCOUNT_KIND_OPTIONS = [
  { value: 'WIDELY_ACCEPTED', label: 'Widely accepted' },
  { value: 'REGIONAL_BELIEF', label: 'Regional belief' },
  { value: 'MYTHIC_TRADITION', label: 'Mythic tradition' },
  { value: 'SUPPRESSED', label: 'Suppressed record' },
  { value: 'PROPAGANDA', label: 'Propaganda' },
  { value: 'UNVERIFIED', label: 'Unverified' },
] as const;

export const CONFIDENCE_OPTIONS = [
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'CONTESTED', label: 'Contested' },
] as const;

export const KNOWLEDGE_STATE_OPTIONS = [
  { value: 'UNDISCOVERED', label: 'Undiscovered' },
  { value: 'SUSPECTED', label: 'Suspected (rumor)' },
  { value: 'KNOWN', label: 'Known' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'DISPROVEN', label: 'Disproven' },
] as const;

export const SOURCE_TYPE_OPTIONS = [
  { value: 'JOURNAL', label: 'Journal' },
  { value: 'NPC_TESTIMONY', label: 'NPC testimony' },
  { value: 'EVENT_RECORD', label: 'Event record' },
  { value: 'ARTIFACT', label: 'Artifact' },
  { value: 'RUMOR', label: 'Rumor' },
  { value: 'DIVINE_VISION', label: 'Divine vision' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SOURCE_ROLE_OPTIONS = [
  { value: 'SUPPORTS', label: 'Supports' },
  { value: 'CONTRADICTS', label: 'Contradicts' },
  { value: 'REFERENCES', label: 'References' },
] as const;

export function LoreCirculationExpectationNote({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-xs leading-relaxed text-muted border-l-2 border-border/50 pl-2.5 ${className}`}
    >
      This creates a chronology-visible rumor circulation event. Circulations are immutable
      historical records. Mistakes can be corrected via retraction.
    </p>
  );
}

export function LoreCirculationEdgeBadge({ edgeKind }: { edgeKind: CirculationEdgeKind }) {
  const isRetraction = edgeKind === CirculationEdgeKinds.RETRACTION;
  const Icon = isRetraction ? Undo2 : Megaphone;
  const label = isRetraction ? 'Retraction' : 'Circulation';
  const eventLabel = isRetraction ? 'Retracted' : 'Circulated';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
        isRetraction
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
          : 'border-border/60 bg-muted/20 text-foreground'
      }`}
      title={label}
    >
      <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
      <span className="sr-only">{label}</span>
      <span>{eventLabel}</span>
    </span>
  );
}

export function LoreClaimManagerActionRow({
  onCirculate,
  onToggleHistory,
  historyOpen,
  className = '',
}: {
  onCirculate: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
  className?: string;
}) {
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/20"
        onClick={onCirculate}
      >
        Circulate…
      </button>
      <button
        type="button"
        className="rounded-md px-2.5 py-1 text-xs text-muted hover:text-foreground hover:bg-muted/20"
        onClick={onToggleHistory}
      >
        {historyOpen ? 'Hide circulation history' : 'View circulation history'}
      </button>
    </div>
  );
}
