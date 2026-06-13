import {
  DOWNTIME_HAVEN_TEMPLATE_TYPE,
  parseDowntimeHavenFields,
  type DowntimeHavenFields,
} from './havenMetadata.js';
import { buildDowntimeHavenDefaultBlocks } from './pageTemplates.js';

export type DowntimeHavenCreateBootstrapInput = {
  title: string;
  description?: string | null;
  fields?: Partial<DowntimeHavenFields>;
  blocks?: Array<Record<string, unknown>> | null;
};

export type DowntimeHavenCreateBootstrapResult =
  | {
      ok: true;
      title: string;
      templateType: typeof DOWNTIME_HAVEN_TEMPLATE_TYPE;
      blocks: Array<Record<string, unknown>>;
      fields: DowntimeHavenFields;
    }
  | { ok: false; status: number; error: string };

export function bootstrapDowntimeHavenOnCreate(
  input: DowntimeHavenCreateBootstrapInput,
): DowntimeHavenCreateBootstrapResult {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    return { ok: false, status: 400, error: 'Haven title is required.' };
  }

  const base = parseDowntimeHavenFields(input.fields ?? {});
  const fields = parseDowntimeHavenFields({
    ...base,
    ...(input.fields ?? {}),
    semanticsVersion: base.semanticsVersion,
  });

  const markdown =
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : '';

  const blocks =
    Array.isArray(input.blocks) && input.blocks.length > 0
      ? input.blocks
      : (buildDowntimeHavenDefaultBlocks({ markdown }) as Array<Record<string, unknown>>);

  return {
    ok: true,
    title,
    templateType: DOWNTIME_HAVEN_TEMPLATE_TYPE,
    blocks,
    fields,
  };
}
