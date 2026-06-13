import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import {
  usePageBlockDraftRegistry,
  useRegisterBlockDraft,
} from '@/contexts/PageBlockDraftRegistry';
import { BlockSaveStatusLine } from '@/components/wiki/BlockSaveStatusLine';
import { Loader2, Sparkles } from 'lucide-react';
import {
  AppearanceEditor,
  CodexEditorShell,
  PortraitImageEditor,
} from '@/components/entity/codexMetadataEditorShared';
import {
  AppearanceFormsWidget,
  AppearanceDetailsWidget,
} from '@/components/entity/appearance';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import type { CodexAppearanceFields } from '@/lib/codexMetadataShared';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseBestiaryMetadata } from '@/lib/bestiaryMetadata';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { updateBestiaryMetadata, updateCharacterMetadata } from '@/lib/wiki';
import type {
  AppearanceDetailsFields,
  AppearanceGalleryState,
} from '@shared/appearanceMetadata';
import { appearanceDetailsToMetadataPatch } from '@shared/appearanceMetadata';
import { EMPTY_DETAILS } from '@/components/entity/appearance/appearanceShared';
import { resolvePrimaryGalleryPortrait } from '@/lib/entityAppearanceProjection';

interface EntityAppearanceEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  surfaceProfileKey: SurfaceProfileKey;
  appearanceCapabilities: AppearanceCapabilities;
  onSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  bare?: boolean;
}

interface AppearanceDraft {
  portraitUrl: string | null;
  portraitCredit: CodexAppearanceFields['portraitCredit'];
  summary: string | null;
  tags: string[];
  gender: string | null;
  presentation: string | null;
  gallery: AppearanceGalleryState;
  details: AppearanceDetailsFields;
}

function parseAppearanceDraft(
  metadata: unknown,
  surfaceProfileKey: SurfaceProfileKey,
): AppearanceDraft {
  if (surfaceProfileKey === 'character') {
    const { appearance } = parseCharacterMetadata(metadata);
    return {
      portraitUrl: appearance.portraitUrl,
      portraitCredit: appearance.portraitCredit,
      summary: appearance.summary,
      tags: appearance.appearanceTags,
      gender: appearance.gender,
      presentation: appearance.presentation,
      gallery: appearance.gallery,
      details: {
        build: appearance.build,
        voice: appearance.voice,
        distinguishingFeatures: appearance.distinguishingFeatures,
        clothingMotifs: appearance.apparelDescription,
        visibleInjuries: appearance.visibleInjuries,
        vibeImpression: appearance.vibeImpression,
        atAGlance: appearance.atAGlance,
      },
    };
  }
  if (surfaceProfileKey === 'bestiary') {
    const { appearance } = parseBestiaryMetadata(metadata);
    return {
      portraitUrl: appearance.portraitUrl,
      portraitCredit: appearance.portraitCredit,
      summary: appearance.summary,
      tags: appearance.tags,
      gender: null,
      presentation: null,
      gallery: appearance.gallery,
      details: { ...EMPTY_DETAILS },
    };
  }
  return {
    portraitUrl: null,
    portraitCredit: null,
    summary: null,
    tags: [],
    gender: null,
    presentation: null,
    gallery: { entries: [] },
    details: { ...EMPTY_DETAILS },
  };
}

function syncPortraitFromGallery(draft: AppearanceDraft): AppearanceDraft {
  const portrait = resolvePrimaryGalleryPortrait(
    draft.gallery,
    draft.portraitUrl,
    draft.portraitCredit,
  );
  return {
    ...draft,
    portraitUrl: portrait.portraitUrl,
    portraitCredit: portrait.portraitCredit,
  };
}

export function EntityAppearanceEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  surfaceProfileKey,
  appearanceCapabilities,
  onSaved,
  focusField,
  bare = false,
}: EntityAppearanceEditorProps) {
  const source = useMemo(
    () => parseAppearanceDraft(metadata, surfaceProfileKey),
    [metadata, surfaceProfileKey],
  );
  const draftBlockId = blockId ?? `entity-appearance:${pageId}`;
  const { draft, setDraft, dirty, markCommitted } = useBlockDraft({
    blockId: draftBlockId,
    source,
    serialize: (value) => JSON.stringify(value),
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const draftRegistry = usePageBlockDraftRegistry();

  const showForms = appearanceCapabilities.forms;
  const showDetails =
    appearanceCapabilities.details && surfaceProfileKey === 'character';
  const showCharacterIdentity = surfaceProfileKey === 'character';

  useEffect(() => {
    if (!focusField) return;
    const el =
      document.getElementById(focusField) ??
      document.getElementById(`character-field-${focusField}`);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const input = el.querySelector<HTMLElement>('input, textarea, select, button');
      input?.focus();
    });
  }, [focusField]);

  const persistDraft = useCallback(
    async (nextDraft: AppearanceDraft, options?: { syncGalleryPortrait?: boolean }) => {
      const synced =
        showForms && options?.syncGalleryPortrait
          ? syncPortraitFromGallery(nextDraft)
          : nextDraft;
      setDraft((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(synced)) return prev;
        return synced;
      });
      draftRegistry?.setBlockSaveState(draftBlockId, 'saving');
      try {
        if (surfaceProfileKey === 'character') {
          const result = await updateCharacterMetadata(campaignHandle, pageId, {
            appearance: {
              portraitUrl: synced.portraitUrl,
              portraitCredit: synced.portraitCredit,
              summary: synced.summary,
              appearanceTags: synced.tags,
              gender: synced.gender,
              presentation: synced.presentation,
              gallery: synced.gallery,
              ...appearanceDetailsToMetadataPatch(synced.details),
            },
          });
          const committed = parseAppearanceDraft(result.metadata, surfaceProfileKey);
          markCommitted(committed);
          onSaved(result.metadata);
          draftRegistry?.setBlockSaveState(draftBlockId, 'saved');
        } else if (surfaceProfileKey === 'bestiary') {
          const result = await updateBestiaryMetadata(campaignHandle, pageId, {
            appearance: {
              portraitUrl: synced.portraitUrl,
              portraitCredit: synced.portraitCredit,
              summary: synced.summary,
              tags: synced.tags,
              gallery: synced.gallery,
            },
          });
          const committed = parseAppearanceDraft(result.metadata, surfaceProfileKey);
          markCommitted(committed);
          onSaved(result.metadata);
          draftRegistry?.setBlockSaveState(draftBlockId, 'saved');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save appearance';
        draftRegistry?.setBlockSaveState(draftBlockId, 'failed', message);
      }
    },
    [
      campaignHandle,
      draftBlockId,
      draftRegistry,
      markCommitted,
      onSaved,
      pageId,
      setDraft,
      showForms,
      surfaceProfileKey,
    ],
  );

  const persistAppearance = useCallback(
    async (
      patch: Partial<
        CodexAppearanceFields & {
          tags?: string[];
          gender?: string | null;
          presentation?: string | null;
        }
      >,
    ) => {
      const next: AppearanceDraft = {
        ...draft,
        portraitUrl: patch.portraitUrl !== undefined ? patch.portraitUrl : draft.portraitUrl,
        portraitCredit:
          patch.portraitCredit !== undefined ? patch.portraitCredit : draft.portraitCredit,
        summary: patch.summary !== undefined ? patch.summary : draft.summary,
        tags: patch.tags ?? draft.tags,
        gender: patch.gender !== undefined ? patch.gender : draft.gender,
        presentation:
          patch.presentation !== undefined ? patch.presentation : draft.presentation,
      };
      await persistDraft(next);
    },
    [draft, persistDraft],
  );

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      await persistDraft(draft);
    }, [dirty, draft, persistDraft]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  const tagsFieldId =
    surfaceProfileKey === 'character' ? 'appearance.appearanceTags' : 'appearance.tags';

  const body = (
    <div className="grid gap-6">
      <PortraitImageEditor
        campaignHandle={campaignHandle}
        portraitUrl={draft.portraitUrl}
        portraitCredit={draft.portraitCredit}
        onChange={({ portraitUrl, portraitCredit }) =>
          setDraft((prev) => ({ ...prev, portraitUrl, portraitCredit }))
        }
        onPersist={(patch) => void persistAppearance(patch)}
      />

      {showForms ? (
        <AppearanceFormsWidget
          mode="edit"
          campaignHandle={campaignHandle}
          forms={draft.gallery}
          onChange={(gallery) => setDraft((prev) => ({ ...prev, gallery }))}
          onPersist={(gallery) =>
            void persistDraft(
              { ...draftRef.current, gallery },
              { syncGalleryPortrait: true },
            )
          }
        />
      ) : null}

      {showDetails ? (
        <AppearanceDetailsWidget
          mode="edit"
          details={draft.details}
          onChange={(details) => setDraft((prev) => ({ ...prev, details }))}
          onPersist={(patch) =>
            void persistDraft({
              ...draftRef.current,
              details: { ...draftRef.current.details, ...patch },
            })
          }
        />
      ) : null}

      <AppearanceEditor
        appearance={{
          portraitUrl: draft.portraitUrl,
          portraitCredit: draft.portraitCredit,
          summary: draft.summary,
          tags: draft.tags,
        }}
        focusField={focusField}
        hidePortrait
        tags={draft.tags}
        tagsFieldId={tagsFieldId}
        identityFields={
          showCharacterIdentity
            ? { gender: draft.gender, presentation: draft.presentation }
            : undefined
        }
        onIdentityChange={
          showCharacterIdentity
            ? (fields) => setDraft((prev) => ({ ...prev, ...fields }))
            : undefined
        }
        onIdentityPersist={
          showCharacterIdentity
            ? (fields) => void persistAppearance(fields)
            : undefined
        }
        onChange={(appearance) =>
          setDraft((prev) => ({
            ...prev,
            ...appearance,
            tags: prev.tags,
            gender: prev.gender,
            presentation: prev.presentation,
          }))
        }
        onPersist={(patch) => void persistAppearance(patch)}
        onTagsChange={(tags) => setDraft((prev) => ({ ...prev, tags }))}
        onTagsPersist={(tags) => void persistAppearance({ tags })}
      />
    </div>
  );

  const saveState = draftRegistry?.getBlockSaveState(draftBlockId) ?? { status: 'idle' as const };
  const isSaving = saveState.status === 'saving';
  const saveError = saveState.status === 'failed' ? saveState.errorMessage : null;

  if (bare) {
    return (
      <div className="relative space-y-3">
        {isSaving ? (
          <Loader2 className="absolute right-0 top-0 size-3.5 animate-spin text-muted" />
        ) : null}
        {body}
        <BlockSaveStatusLine
          state={saveState.status !== 'idle' ? saveState : dirty ? { status: 'dirty' } : saveState}
          onRetry={
            saveState.status === 'failed'
              ? () => void draftRegistry?.flushBlock(draftBlockId)
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <CodexEditorShell saving={isSaving} error={saveError ?? null}>
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <Sparkles className="size-3.5 text-muted" aria-hidden />
        <span className="text-sm font-medium text-muted">Appearance</span>
      </div>
      {body}
      <BlockSaveStatusLine
        state={saveState.status !== 'idle' ? saveState : dirty ? { status: 'dirty' } : saveState}
        onRetry={
          saveState.status === 'failed'
            ? () => void draftRegistry?.flushBlock(draftBlockId)
            : undefined
        }
      />
    </CodexEditorShell>
  );
}

export function entityAppearanceSupportsEditing(surfaceProfileKey: SurfaceProfileKey): boolean {
  return surfaceProfileKey === 'character' || surfaceProfileKey === 'bestiary';
}
