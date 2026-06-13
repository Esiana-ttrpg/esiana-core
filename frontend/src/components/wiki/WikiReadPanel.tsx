import type { WikiEditorTab, WikiPageContent } from '@/types/wiki';
import { WikiContentTabs } from './WikiContentTabs';
import { WikiMarkdown } from './WikiMarkdown';
interface WikiReadPanelProps {
  activeTab: WikiEditorTab;
  onTabChange: (tab: WikiEditorTab) => void;
  content: WikiPageContent;
}

export function WikiReadPanel({
  activeTab,
  onTabChange,
  content,
}: WikiReadPanelProps) {
  return (
    <div>
      <WikiContentTabs active={activeTab} onChange={onTabChange} />
      <div className="mt-4 space-y-6">
        {activeTab === 'official' && (
          <>
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                DM Canon
              </h2>
              <WikiMarkdown
                content={content.dmCanon}
                emptyLabel="No DM canon written yet."
              />
            </section>
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                Party Discoveries
              </h2>
              <WikiMarkdown
                content={content.partyDiscoveries}
                emptyLabel="No party discoveries recorded yet."
              />
            </section>
          </>
        )}
        {activeTab === 'player' && (
          <WikiMarkdown
            content={content.playerNotes}
            emptyLabel="No player notes yet."
          />
        )}
        {activeTab === 'dm-secrets' && (
          <WikiMarkdown
            content={content.dmSecrets}
            emptyLabel="No DM secrets on this page."
          />
        )}
      </div>
    </div>
  );
}
