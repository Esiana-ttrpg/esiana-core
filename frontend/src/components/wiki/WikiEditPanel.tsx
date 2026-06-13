import type { CategoryMetadata, CharacterMetadata, WikiEditorTab, WikiPageContent } from '@/types/wiki';
import type { WikiTreeNode } from '@/types/wiki';
import { getCategoryColumns, hasCustomMetadata } from '@/lib/metadataConfig';
import { normalizeEntityCategoryKey } from '@/lib/entityCategoryKeys';
import { WikiContentTabs } from './WikiContentTabs';
import { WikiTipTapEditor } from './WikiTipTapEditor';
import { QuickInfoPanel } from './QuickInfoPanel';
import { DMSecretsPanel } from './DMSecretsPanel';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface WikiEditPanelProps {
  activeTab: WikiEditorTab;
  onTabChange: (tab: WikiEditorTab) => void;
  content: WikiPageContent;
  onChange: (field: keyof WikiPageContent, value: string) => void;
  onMetadataChange?: (metadata: CategoryMetadata | CharacterMetadata) => void;
  onMetadataFieldBlur?: (key: string, value: string) => void;
  categoryTitle?: string;
  wikiTree: WikiTreeNode[];
  isDMUser?: boolean;
}

export function WikiEditPanel({
  activeTab,
  onTabChange,
  content,
  onChange,
  onMetadataChange,
  onMetadataFieldBlur,
  categoryTitle,
  wikiTree,
  isDMUser: isDMUserProp = false,
}: WikiEditPanelProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const metadataKeys = categoryTitle
    ? getCategoryColumns(categoryTitle)
    : [];
  
  // Determine if this is a Character page
  const isCharacterMetadata =
    categoryTitle === 'Characters' ||
    (content.metadata &&
      typeof content.metadata === 'object' &&
      (normalizeEntityCategoryKey(
        typeof (content.metadata as Record<string, unknown>).entityCategory === 'string'
          ? ((content.metadata as Record<string, unknown>).entityCategory as string)
          : null,
      ) === 'characters' ||
        'quickInfo' in content.metadata ||
        'firstName' in content.metadata));
  const charMetadata = isCharacterMetadata ? (content.metadata as CharacterMetadata) : null;
  
  // Handle both old-style CategoryMetadata and new CharacterMetadata
  const metadataMap = new Map(
    !isCharacterMetadata && content.metadata && 'fields' in content.metadata
      ? content.metadata.fields.map((field) => [field.key, field.value])
      : [],
  );
  const shouldShowMetadata =
    categoryTitle && hasCustomMetadata(categoryTitle) && !isCharacterMetadata;

  function buildMetadata(nextKey: string, nextValue: string) {
    return {
      fields: metadataKeys.map((key) => ({
        key,
        value:
          key === nextKey
            ? nextValue
            : metadataMap.get(key) ?? '',
      })),
    };
  }

  return (
    <div>
      <WikiContentTabs active={activeTab} onChange={onTabChange} />
      <div className="mt-4 space-y-4">
        {/* Show Quick Info for Character pages */}
        {isCharacterMetadata && charMetadata && (
          <QuickInfoPanel
            fields={charMetadata.quickInfo ?? []}
            onFieldsChange={(fields) =>
              onMetadataChange?.({ ...charMetadata, quickInfo: fields })
            }
            onFieldBlur={onMetadataFieldBlur}
          />
        )}

        {/* Character description (brief) */}
        {isCharacterMetadata && charMetadata && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Quick Info Description
            </h2>
            <label className="block">
              <textarea
                value={charMetadata.description ?? ''}
                onChange={(e) =>
                  onMetadataChange?.({ ...charMetadata, description: e.target.value })
                }
                onBlur={() => {
                  /* let parent decide when to persist whole metadata */
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
                placeholder="Brief description of this character (NPC)…"
                rows={3}
              />
            </label>
          </section>
        )}

        {/* Show Page Properties for non-Character pages with metadata */}
        {shouldShowMetadata && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Page Properties
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {metadataKeys.map((key) => (
                <label key={key} className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {key}
                  </span>
                  <input
                    value={metadataMap.get(key) ?? ''}
                    onChange={(event) =>
                      onMetadataChange?.(
                        buildMetadata(key, event.target.value),
                      )
                    }
                    onBlur={(event) =>
                      onMetadataFieldBlur?.(key, event.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
                    placeholder={`Enter ${key}`}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'official' && (
          <>
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                DM Canon
              </h2>
              <WikiTipTapEditor
                content={content.dmCanon}
                onChange={(v) => onChange('dmCanon', v)}
                wikiTree={wikiTree}
                placeholder="Authoritative DM canon (Markdown)…"
                minHeight="min-h-[160px]"
              />
            </section>
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Party Discoveries
              </h2>
              <WikiTipTapEditor
                content={content.partyDiscoveries}
                onChange={(v) => onChange('partyDiscoveries', v)}
                wikiTree={wikiTree}
                placeholder="What the party has learned in play…"
                minHeight="min-h-[160px]"
              />
            </section>
          </>
        )}
        {activeTab === 'player' && (
          <WikiTipTapEditor
            content={content.playerNotes}
            onChange={(v) => onChange('playerNotes', v)}
            wikiTree={wikiTree}
            placeholder="Player notes — Markdown supported…"
            minHeight="min-h-[320px]"
          />
        )}
        {/* DM-only secrets: show in sidebar for DM users and also expose in DM-Secrets tab */}
        {isCharacterMetadata && charMetadata && isDMUser && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              DM Secrets (Private)
            </h2>
            <DMSecretsPanel
              data={charMetadata.dmSecrets}
              onChange={(dmSecrets) =>
                onMetadataChange?.({ ...charMetadata, dmSecrets })
              }
              wikiTree={wikiTree}
            />
          </section>
        )}

        {activeTab === 'dm-secrets' && isCharacterMetadata && charMetadata && (
          <DMSecretsPanel
            data={charMetadata.dmSecrets}
            onChange={(dmSecrets) =>
              onMetadataChange?.({ ...charMetadata, dmSecrets })
            }
            wikiTree={wikiTree}
          />
        )}
        {activeTab === 'dm-secrets' && !isCharacterMetadata && (
          <WikiTipTapEditor
            content={content.dmSecrets}
            onChange={(v) => onChange('dmSecrets', v)}
            wikiTree={wikiTree}
            placeholder="DM-only secrets and prep…"
            minHeight="min-h-[320px]"
          />
        )}
      </div>
    </div>
  );
}
