import { apiFetch } from './api';
import type {
  DowntimeHubPayload,
  DowntimeHavenOverviewPayload,
  DowntimeProjectOverviewPayload,
  DowntimeSectionId,
} from '@shared/downtimeHub';
import type {
  DowntimeProjectDetail,
  OperationPosture,
  ProjectBlockerEntry,
  ProjectOutcomeEntry,
  ProjectPriority,
  ProjectResourceEntry,
  ProjectStatus,
  ProjectType,
} from '@shared/projectMetadata';
import type {
  DowntimeHavenDetail,
  HavenBenefitEntry,
  HavenCrewEntry,
  HavenDiscoveryState,
  HavenIdentityHints,
  HavenOwnershipType,
  HavenPrimaryTheme,
  HavenReferenceEntry,
  HavenScale,
  HavenSpaceEntry,
  HavenStatus,
  HavenThreatEntry,
  HavenType,
  HavenUpgradeEntry,
} from '@shared/havenMetadata';

export type ProjectCreateConstraint = {
  label: string;
  kind: 'requirement' | 'obstacle';
};

export type ProjectCreateConstraintKind = ProjectCreateConstraint['kind'];

export type { DowntimeHubPayload, DowntimeSectionId };
export type { DowntimeHavenDetail } from '@shared/havenMetadata';
export type {
  DowntimeFeedCard,
  DowntimePulse,
  DowntimeSimulationSnapshot,
  DowntimePlaceholderFraming,
  DowntimeProjectOperationCard,
  DowntimeProjectOverviewPayload,
  DowntimeHubWorldEventsPayload,
} from '@shared/downtimeHub';

export type CreateDowntimeProjectInput = {
  title: string;
  operationBrief?: string;
  stakes?: string;
  constraints?: ProjectCreateConstraint[];
  operationPosture?: OperationPosture | null;
  projectType?: ProjectType;
  durationTotalMinutes?: string;
  ownerPageId?: string | null;
  /** Optional ledger-tagged project cost for completion suggestions. */
  treasuryProjectCost?: number | null;
  /** Optional treasury outcome on completion (`treasury_effect`). */
  treasuryCompletion?: {
    amount: number;
    kind: 'credit' | 'debit';
    title?: string | null;
  } | null;
};

const MINUTES_PER_DAY = 1440;

export function durationInputToMinutes(
  amount: number,
  unit: 'days' | 'weeks',
): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const days = unit === 'weeks' ? amount * 7 : amount;
  return String(Math.round(days * MINUTES_PER_DAY));
}

export function formatExpectedDurationHint(
  amount: number,
  unit: 'days' | 'weeks',
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit === 'days') {
    if (amount === 1) return 'Expected duration: about one day';
    if (amount < 7) return `Expected duration: about ${amount} days`;
    const weeks = Math.round(amount / 7);
    if (weeks === 1) return 'Expected duration: about one week';
    return `Expected duration: about ${weeks} weeks`;
  }
  if (amount === 1) return 'Expected duration: about one week';
  if (amount === 2) return 'Expected duration: about two weeks';
  return `Expected duration: about ${amount} weeks`;
}

export async function fetchDowntimeHub(
  campaignHandle: string,
  options?: {
    pageId?: string;
    section?: DowntimeSectionId | null;
  },
): Promise<DowntimeHubPayload> {
  const params = new URLSearchParams();
  if (options?.section) {
    params.set('section', options.section);
  }
  const query = params.toString();
  const base = options?.pageId
    ? `/campaigns/${campaignHandle}/wiki/downtime-hub/${options.pageId}`
    : `/campaigns/${campaignHandle}/wiki/downtime-hub`;
  const url = query ? `${base}?${query}` : base;
  return apiFetch<DowntimeHubPayload>(url);
}

export async function createDowntimeProject(
  campaignHandle: string,
  input: CreateDowntimeProjectInput,
): Promise<DowntimeProjectDetail> {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
  };

  if (input.operationBrief?.trim()) {
    body.operationBrief = input.operationBrief.trim();
  }
  if (input.stakes?.trim()) {
    body.stakes = input.stakes.trim();
  }
  if (input.constraints && input.constraints.length > 0) {
    body.constraints = input.constraints;
  }
  if (input.operationPosture) {
    body.operationPosture = input.operationPosture;
  }

  const fields: Record<string, unknown> = {};
  if (input.projectType) fields.projectType = input.projectType;
  if (input.durationTotalMinutes) fields.durationTotalMinutes = input.durationTotalMinutes;
  if (input.ownerPageId) fields.ownerPageId = input.ownerPageId;

  const extraResources: Array<Record<string, unknown>> = [];
  const extraOutcomes: Array<Record<string, unknown>> = [];

  if (input.treasuryProjectCost != null && input.treasuryProjectCost > 0) {
    extraResources.push({
      id: `treasury-cost-${Date.now()}`,
      label: 'Project treasury cost',
      quantity: null,
      unit: null,
      satisfied: true,
      linkedPageId: null,
      sourceKind: 'ledger',
      ledgerAmount: Math.floor(input.treasuryProjectCost),
      ledgerImpactKind: 'debit',
    });
  }

  if (input.treasuryCompletion != null && input.treasuryCompletion.amount > 0) {
    extraOutcomes.push({
      id: `treasury-outcome-${Date.now()}`,
      outcomeKind: 'treasury_effect',
      description: null,
      linkedPageIds: [],
      status: 'pending',
      treasuryEffect: {
        amount: Math.floor(input.treasuryCompletion.amount),
        kind: input.treasuryCompletion.kind,
        category: input.treasuryCompletion.kind === 'credit' ? 'income' : 'project',
        title: input.treasuryCompletion.title?.trim() || null,
      },
    });
  }

  if (extraResources.length > 0) {
    fields.resources = extraResources;
  }
  if (extraOutcomes.length > 0) {
    fields.outcomes = extraOutcomes;
  }

  if (Object.keys(fields).length > 0) {
    body.fields = fields;
  }

  const response = await apiFetch<{ project: DowntimeProjectDetail }>(
    `/campaigns/${campaignHandle}/downtime/projects`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );

  return response.project;
}

export async function fetchDowntimeProject(
  campaignHandle: string,
  projectId: string,
): Promise<DowntimeProjectDetail> {
  const response = await apiFetch<{ project: DowntimeProjectDetail }>(
    `/campaigns/${campaignHandle}/downtime/projects/${projectId}`,
  );
  return response.project;
}

export async function fetchDowntimeProjectByWikiPage(
  campaignHandle: string,
  wikiPageId: string,
): Promise<DowntimeProjectDetail> {
  const response = await apiFetch<{ project: DowntimeProjectDetail }>(
    `/campaigns/${campaignHandle}/downtime/projects/by-wiki/${wikiPageId}`,
  );
  return response.project;
}

export async function fetchDowntimeProjectOverview(
  campaignHandle: string,
  projectId: string,
): Promise<DowntimeProjectOverviewPayload> {
  const response = await apiFetch<{ overview: DowntimeProjectOverviewPayload }>(
    `/campaigns/${campaignHandle}/downtime/projects/${projectId}/overview`,
  );
  return response.overview;
}

export type UpdateDowntimeProjectInput = {
  title?: string;
  status?: ProjectStatus;
  projectType?: ProjectType;
  priority?: ProjectPriority | null;
  operationPosture?: OperationPosture | null;
  durationTotalMinutes?: string;
  ownerPageId?: string | null;
  havenPageId?: string | null;
  resources?: ProjectResourceEntry[];
  blockers?: ProjectBlockerEntry[];
  outcomes?: ProjectOutcomeEntry[];
};

export async function updateDowntimeProject(
  campaignHandle: string,
  projectId: string,
  input: UpdateDowntimeProjectInput,
): Promise<DowntimeProjectDetail> {
  const response = await apiFetch<{ project: DowntimeProjectDetail }>(
    `/campaigns/${campaignHandle}/downtime/projects/${projectId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return response.project;
}

export async function deleteDowntimeProject(
  campaignHandle: string,
  projectId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/downtime/projects/${projectId}`, {
    method: 'DELETE',
  });
}

export type CreateDowntimeHavenInput = {
  title: string;
  description?: string;
  fields?: {
    havenType?: HavenType;
    scale?: HavenScale;
    ownershipType?: HavenOwnershipType;
    primaryTheme?: HavenPrimaryTheme;
    discoveryState?: HavenDiscoveryState;
    locationPageId?: string | null;
    residentPageIds?: string[];
    factionPageIds?: string[];
  };
};

export async function createDowntimeHaven(
  campaignHandle: string,
  input: CreateDowntimeHavenInput,
): Promise<DowntimeHavenDetail> {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
  };
  if (input.description?.trim()) {
    body.description = input.description.trim();
  }
  if (input.fields && Object.keys(input.fields).length > 0) {
    body.fields = input.fields;
  }

  const response = await apiFetch<{ haven: DowntimeHavenDetail }>(
    `/campaigns/${campaignHandle}/downtime/havens`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );

  return response.haven;
}

export async function fetchDowntimeHavens(
  campaignHandle: string,
): Promise<DowntimeHavenDetail[]> {
  const response = await apiFetch<{ havens: DowntimeHavenDetail[] }>(
    `/campaigns/${campaignHandle}/downtime/havens`,
  );
  return response.havens;
}

export async function fetchDowntimeHavenByWikiPage(
  campaignHandle: string,
  wikiPageId: string,
): Promise<DowntimeHavenDetail> {
  const response = await apiFetch<{ haven: DowntimeHavenDetail }>(
    `/campaigns/${campaignHandle}/downtime/havens/by-wiki/${wikiPageId}`,
  );
  return response.haven;
}

export async function fetchDowntimeHaven(
  campaignHandle: string,
  havenId: string,
): Promise<DowntimeHavenDetail> {
  const response = await apiFetch<{ haven: DowntimeHavenDetail }>(
    `/campaigns/${campaignHandle}/downtime/havens/${havenId}`,
  );
  return response.haven;
}

export type UpdateDowntimeHavenInput = {
  title?: string;
  havenType?: HavenType;
  status?: HavenStatus;
  scale?: HavenScale | null;
  ownershipType?: HavenOwnershipType | null;
  primaryTheme?: HavenPrimaryTheme | null;
  discoveryState?: HavenDiscoveryState | null;
  locationPageId?: string | null;
  residentPageIds?: string[];
  factionPageIds?: string[];
  relatedPageIds?: string[];
  identityHints?: HavenIdentityHints;
  references?: HavenReferenceEntry[];
  spaces?: HavenSpaceEntry[];
  crew?: HavenCrewEntry[];
  passiveBenefits?: HavenBenefitEntry[];
  appendActivity?: {
    summary: string;
    tone?: 'neutral' | 'warning' | 'escalation' | null;
  };
  threats?: HavenThreatEntry[];
  upgrades?: HavenUpgradeEntry[];
  havenSimulation?: {
    enabled?: boolean;
    pausedReason?: string | null;
    axes?: Partial<Record<
      'prosperity' | 'danger' | 'morale' | 'notoriety' | 'stability' | 'security',
      number
    >>;
    lockedAxes?: Partial<
      Record<
        'prosperity' | 'danger' | 'morale' | 'notoriety' | 'stability' | 'security',
        boolean
      >
    >;
  };
  ledgerSimulationHints?: {
    ledgerUpkeepSuggestionsEnabled?: boolean;
    upkeepCost?: number | null;
    constructionCost?: number | null;
  };
};

export async function updateDowntimeHaven(
  campaignHandle: string,
  havenId: string,
  patch: UpdateDowntimeHavenInput,
): Promise<DowntimeHavenDetail> {
  const response = await apiFetch<{ haven: DowntimeHavenDetail }>(
    `/campaigns/${campaignHandle}/downtime/havens/${havenId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return response.haven;
}

export async function fetchDowntimeHavenOverview(
  campaignHandle: string,
  havenId: string,
): Promise<DowntimeHavenOverviewPayload> {
  const response = await apiFetch<{ overview: DowntimeHavenOverviewPayload }>(
    `/campaigns/${campaignHandle}/downtime/havens/${havenId}/overview`,
  );
  return response.overview;
}
