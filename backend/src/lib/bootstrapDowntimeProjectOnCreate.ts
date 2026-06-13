import {
  buildDowntimeProjectCreateMarkdown,
  constraintsToProjectEntries,
  type ProjectCreateConstraint,
} from './buildDowntimeProjectCreateMarkdown.js';
import {
  DOWNTIME_OPERATION_POSTURE_METADATA_KEY,
  normalizeOperationPosture,
} from '../../../shared/projectMetadata.js';
import {
  DOWNTIME_PROJECT_TEMPLATE_TYPE,
  parseDowntimeProjectFields,
  type DowntimeProjectFields,
} from './projectMetadata.js';
import { buildDowntimeProjectDefaultBlocks } from './pageTemplates.js';

export type DowntimeProjectCreateBootstrapInput = {
  title: string;
  operationBrief?: string | null;
  stakes?: string | null;
  constraints?: ProjectCreateConstraint[];
  operationPosture?: string | null;
  fields?: Partial<DowntimeProjectFields>;
  blocks?: Array<Record<string, unknown>> | null;
};

export type DowntimeProjectCreateBootstrapResult =
  | {
      ok: true;
      title: string;
      templateType: typeof DOWNTIME_PROJECT_TEMPLATE_TYPE;
      blocks: Array<Record<string, unknown>>;
      fields: DowntimeProjectFields;
      wikiMetadata: Record<string, unknown>;
    }
  | { ok: false; status: number; error: string };

export { buildDowntimeProjectCreateMarkdown };

export function bootstrapDowntimeProjectOnCreate(
  input: DowntimeProjectCreateBootstrapInput,
): DowntimeProjectCreateBootstrapResult {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    return { ok: false, status: 400, error: 'Project title is required.' };
  }

  const constraints = Array.isArray(input.constraints) ? input.constraints : [];
  const { resources: constraintResources, blockers: constraintBlockers } =
    constraintsToProjectEntries(constraints);

  const base = parseDowntimeProjectFields(input.fields ?? {});
  const fieldResources = input.fields?.resources;
  const fieldBlockers = input.fields?.blockers;

  const mergedResources =
    fieldResources !== undefined
      ? [
          ...constraintResources,
          ...fieldResources.filter(
            (entry) =>
              entry.sourceKind === 'ledger' &&
              !constraintResources.some(
                (existing) =>
                  'id' in existing &&
                  'id' in entry &&
                  existing.id === entry.id,
              ),
          ),
        ]
      : constraintResources.length > 0
        ? constraintResources
        : base.resources;

  const mergedBlockers =
    fieldBlockers !== undefined
      ? fieldBlockers
      : constraintBlockers.length > 0
        ? constraintBlockers
        : base.blockers;

  const fields = parseDowntimeProjectFields({
    ...base,
    ...(input.fields ?? {}),
    resources: mergedResources.length > 0 ? mergedResources : base.resources,
    blockers: mergedBlockers.length > 0 ? mergedBlockers : base.blockers,
    outcomes:
      input.fields?.outcomes !== undefined ? input.fields.outcomes : base.outcomes,
    semanticsVersion: base.semanticsVersion,
    status: base.status,
  });

  const markdown = buildDowntimeProjectCreateMarkdown({
    operationBrief: input.operationBrief,
    stakes: input.stakes,
    constraints,
  });

  const blocks =
    Array.isArray(input.blocks) && input.blocks.length > 0
      ? input.blocks
      : (buildDowntimeProjectDefaultBlocks({ markdown }) as Array<Record<string, unknown>>);

  const posture = normalizeOperationPosture(input.operationPosture);
  const wikiMetadata: Record<string, unknown> = {};
  if (posture) {
    wikiMetadata[DOWNTIME_OPERATION_POSTURE_METADATA_KEY] = posture;
  }

  return {
    ok: true,
    title,
    templateType: DOWNTIME_PROJECT_TEMPLATE_TYPE,
    blocks,
    fields,
    wikiMetadata,
  };
}
