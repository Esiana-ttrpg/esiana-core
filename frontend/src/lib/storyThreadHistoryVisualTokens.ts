import type {
  StoryThreadHistoryMilestone,
  StoryThreadMilestoneKind,
  StoryThreadVisualEmphasis,
} from '@shared/storyThreadHistoryProjection';
import type { ForeshadowingStage } from '@shared/narrativeForeshadowingTracker';

export function milestoneUiLabel(kind: StoryThreadMilestoneKind): string {
  const labels: Record<StoryThreadMilestoneKind, string> = {
    introduced: 'Setup',
    reinforced: 'Reminder',
    payoff: 'Payoff',
    resolved: 'Resolution',
  };
  return labels[kind];
}

export const FORESHADOWING_STAGE_LABELS: Record<ForeshadowingStage, string> = {
  introduced: 'Setup only',
  reinforced: 'Reminded',
  payoff_pending: 'Payoff pending',
  resolved: 'Resolved',
  abandoned: 'Abandoned',
};

const DIAGNOSTIC_RULE_LABELS: Record<string, string> = {
  foreshadowing_introduced_only: 'No reminder yet',
  foreshadowing_stale_reinforcement: 'Stale reinforcement',
  foreshadowing_payoff_pending: 'Payoff linked, still open',
};

export function diagnosticRuleLabel(ruleId: string): string {
  return DIAGNOSTIC_RULE_LABELS[ruleId] ?? ruleId.replace(/_/g, ' ');
}

export function threadCardEmphasisClasses(
  emphasis: StoryThreadVisualEmphasis,
): {
  card: string;
  title: string;
  stepper: string;
} {
  switch (emphasis) {
    case 'dominant':
      return {
        card: 'region-depth-3 border-border/90 bg-card/50',
        title: 'font-semibold text-foreground',
        stepper: 'opacity-100',
      };
    case 'muted':
      return {
        card: 'border-border/50 bg-elevated/20 opacity-80',
        title: 'font-medium text-muted-foreground',
        stepper: 'opacity-70',
      };
    default:
      return {
        card: 'region-depth-2 border-border bg-card/30',
        title: 'font-medium text-foreground',
        stepper: 'opacity-95',
      };
  }
}

export function milestoneNodeClasses(
  milestone: StoryThreadHistoryMilestone,
  emphasis: StoryThreadVisualEmphasis,
): {
  node: string;
  label: string;
  connector: string;
} {
  const rich = emphasis === 'dominant';
  const dim = emphasis === 'muted';

  if (!milestone.reached) {
    return {
      node: 'border-dashed border-border/60 bg-transparent',
      label: 'text-muted-foreground/70',
      connector: 'bg-border/40',
    };
  }

  if (milestone.kind === 'payoff') {
    return {
      node: rich
        ? 'border-violet-400/60 bg-violet-500/20 ring-1 ring-violet-400/30'
        : 'border-violet-500/50 bg-violet-500/15',
      label: 'font-medium text-violet-100',
      connector: rich ? 'bg-violet-400/40' : 'bg-violet-500/30',
    };
  }

  if (milestone.kind === 'resolved') {
    return {
      node: dim
        ? 'border-emerald-500/25 bg-emerald-500/5'
        : 'border-emerald-500/35 bg-emerald-500/10',
      label: 'text-emerald-200/80',
      connector: 'bg-emerald-500/20',
    };
  }

  return {
    node: rich ? 'border-primary/50 bg-primary/10' : 'border-border bg-elevated/60',
    label: 'text-foreground',
    connector: rich ? 'bg-primary/30' : 'bg-border/70',
  };
}

export function formatSessionsSinceLastTouch(input: {
  sessionsSinceLastTouch: number | null;
  lastTouchMilestoneKind: StoryThreadMilestoneKind | null;
}): string | null {
  const { sessionsSinceLastTouch, lastTouchMilestoneKind } = input;
  if (sessionsSinceLastTouch == null || lastTouchMilestoneKind == null) return null;

  const milestoneLabel = milestoneUiLabel(lastTouchMilestoneKind).toLowerCase();

  if (sessionsSinceLastTouch === 0) {
    return `Touched this session (${milestoneLabel})`;
  }

  if (sessionsSinceLastTouch === 1) {
    return `Last ${milestoneLabel} 1 session ago`;
  }

  return `Last ${milestoneLabel} ${sessionsSinceLastTouch} sessions ago`;
}

export function formatDormantCopy(sessionsSinceLastTouch: number | null): string | null {
  if (sessionsSinceLastTouch == null || sessionsSinceLastTouch < 4) return null;
  if (sessionsSinceLastTouch === 4) return 'Dormant for 4 sessions';
  return `Dormant for ${sessionsSinceLastTouch} sessions`;
}
