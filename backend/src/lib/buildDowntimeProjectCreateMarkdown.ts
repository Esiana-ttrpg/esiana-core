/**
 * Narrative markdown seed for new downtime project wiki pages.
 * @see docs/architecture-internal/downtime-projects.md
 */

export type ProjectCreateConstraintKind = 'requirement' | 'obstacle';

export type ProjectCreateConstraint = {
  label: string;
  kind: ProjectCreateConstraintKind;
};

export type BuildDowntimeProjectCreateMarkdownInput = {
  operationBrief?: string | null;
  stakes?: string | null;
  constraints?: ProjectCreateConstraint[];
};

const BRIEF_PLACEHOLDER =
  'Describe the undertaking — what the party or allies are trying to accomplish, and why it matters between sessions.';

const STAKES_PLACEHOLDER =
  'What shifts in the world if this succeeds, stalls, or fails?';

function normalizeLine(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function bulletSection(items: string[]): string {
  if (items.length === 0) return '';
  return items.map((item) => `- ${item}`).join('\n');
}

export function buildDowntimeProjectCreateMarkdown(
  input: BuildDowntimeProjectCreateMarkdownInput = {},
): string {
  const brief = normalizeLine(input.operationBrief);
  const stakes = normalizeLine(input.stakes);
  const constraints = Array.isArray(input.constraints) ? input.constraints : [];

  const requirements = constraints
    .filter((entry) => entry.kind === 'requirement')
    .map((entry) => normalizeLine(entry.label))
    .filter(Boolean);

  const obstacles = constraints
    .filter((entry) => entry.kind === 'obstacle')
    .map((entry) => normalizeLine(entry.label))
    .filter(Boolean);

  const sections: string[] = [
    '## Operation brief',
    '',
    brief || BRIEF_PLACEHOLDER,
    '',
    '## Stakes',
    '',
    stakes || STAKES_PLACEHOLDER,
    '',
    '## Requirements',
    '',
    bulletSection(requirements) || '',
    '',
    '## Obstacles',
    '',
    bulletSection(obstacles) || '',
    '',
    '## Notes',
    '',
  ];

  return sections.join('\n').trimEnd();
}

export function constraintsToProjectEntries(constraints: ProjectCreateConstraint[]): {
  resources: Array<{ label: string; satisfied: boolean; sourceKind: 'manual' }>;
  blockers: Array<{ label: string; resolved: boolean }>;
} {
  const resources: Array<{ label: string; satisfied: boolean; sourceKind: 'manual' }> = [];
  const blockers: Array<{ label: string; resolved: boolean }> = [];

  for (const entry of constraints) {
    const label = normalizeLine(entry.label);
    if (!label) continue;
    if (entry.kind === 'obstacle') {
      blockers.push({ label, resolved: false });
    } else {
      resources.push({ label, satisfied: false, sourceKind: 'manual' });
    }
  }

  return { resources, blockers };
}
