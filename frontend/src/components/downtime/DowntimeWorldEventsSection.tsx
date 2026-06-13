import { Link } from 'react-router-dom';
import { Calendar, ExternalLink } from 'lucide-react';
import type { DowntimeHubWorldEventsPayload } from '@/lib/downtime';
import { WorldEventNarrativeFeed } from '@/components/downtime/WorldEventNarrativeFeed';
import { PendingWorldEventPromptsPanel } from '@/components/downtime/PendingWorldEventPromptsPanel';
import { WORLD_EVENT_PROMPTS_EMPTY_MESSAGE } from '@shared/worldPressurePresentation';
import {
  acceptWorldEventSuggestion,
  dismissWorldEventSuggestion,
} from '@/lib/downtimeWorldEvents';

interface DowntimeWorldEventsSectionProps {
  data: DowntimeHubWorldEventsPayload;
  campaignHandle: string;
  canManage: boolean;
  onChanged: () => void | Promise<void>;
}

export function DowntimeWorldEventsSection({
  data,
  campaignHandle,
  canManage,
  onChanged,
}: DowntimeWorldEventsSectionProps) {
  const pendingSuggestions = data.pendingSuggestions ?? [];

  async function handleCreate(
    suggestion: (typeof pendingSuggestions)[number],
    input?: { title?: string | null; narrative?: string | null },
  ) {
    await acceptWorldEventSuggestion(campaignHandle, suggestion.id, input);
    await onChanged();
  }

  async function handleIgnore(suggestion: (typeof pendingSuggestions)[number]) {
    await dismissWorldEventSuggestion(campaignHandle, suggestion.id);
    await onChanged();
  }

  return (
    <div className="flex min-h-[480px] w-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">World events</h2>
          <p className="text-sm text-muted-foreground">
            Chronological feed of world movement — adapted for downtime perspective.
            {data.pendingConsequenceCount != null && data.pendingConsequenceCount > 0 ? (
              <span className="mt-1 block text-amber-600 dark:text-amber-400">
                {data.pendingConsequenceCount} world impact
                {data.pendingConsequenceCount === 1 ? '' : 's'} need review on event lore pages.
              </span>
            ) : null}
          </p>
        </div>
        <Link
          to={data.chronologyHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Calendar className="size-3.5 text-primary" />
          Open Chronology Hub
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {canManage && pendingSuggestions.length > 0 ? (
        <PendingWorldEventPromptsPanel
          suggestions={pendingSuggestions}
          onCreate={(suggestion, input) => void handleCreate(suggestion, input)}
          onIgnore={(suggestion) => void handleIgnore(suggestion)}
        />
      ) : canManage && pendingSuggestions.length === 0 ? (
        <div className="rounded-md border border-border/60 bg-elevated/10 px-3 py-2 text-xs text-muted-foreground">
          {WORLD_EVENT_PROMPTS_EMPTY_MESSAGE}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-4">
        <WorldEventNarrativeFeed
          items={data.feed}
          variant="full"
          emptyMessage="No world events match your visibility yet. As time passes and chronology fills in, movement will appear here."
        />
      </div>
    </div>
  );
}
