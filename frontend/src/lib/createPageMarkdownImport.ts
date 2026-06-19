import { apiFetch } from './api';
import type { CreateEntityFormState, WikiPageVisibility } from './createEntityConfig';
import type { WikiTagInput } from '@/types/wiki';

export type CreatePageImportFormPatch = Partial<
  Pick<
    CreateEntityFormState,
    'name' | 'description' | 'visibility' | 'characterRole' | 'fieldValues' | 'parentAncestryId'
  >
>;

export type CreatePageImportPrefill = {
  title: string;
  description: string;
  visibility?: WikiPageVisibility;
  tags: WikiTagInput[];
  formPatch: CreatePageImportFormPatch;
  metadata: Record<string, unknown>;
};

export type CreatePageImportPreviewResult = {
  prefill: CreatePageImportPrefill;
  warnings: string[];
};

export async function previewCreatePageMarkdownImport(
  campaignHandle: string,
  input: {
    markdown: string;
    categoryTitle: string;
    filename?: string;
  },
): Promise<CreatePageImportPreviewResult> {
  return apiFetch<CreatePageImportPreviewResult>(
    `/campaigns/${campaignHandle}/wiki/import-markdown-preview`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
