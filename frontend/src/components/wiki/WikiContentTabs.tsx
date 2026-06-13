import { FileText, Lock, Users } from 'lucide-react';
import type { WikiEditorTab } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

const TABS: {
  id: WikiEditorTab;
  label: string;
  icon: typeof FileText;
  description: string;
  dmOnly?: boolean;
}[] = [
  {
    id: 'official',
    label: 'Official',
    icon: Users,
    description: 'DM Canon & Party Discoveries',
  },
  {
    id: 'player',
    label: 'Player Notes',
    icon: FileText,
    description: 'Personal party notes',
  },
  {
    id: 'dm-secrets',
    label: 'DM Secrets',
    icon: Lock,
    description: 'Hidden from players',
    dmOnly: true,
  },
];

interface WikiContentTabsProps {
  active: WikiEditorTab;
  onChange: (tab: WikiEditorTab) => void;
  isDMUser?: boolean;
}

export function WikiContentTabs({ active, onChange, isDMUser: isDMUserProp = false }: WikiContentTabsProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const visibleTabs = TABS.filter((tab) => !tab.dmOnly || isDMUser);

  return (
    <div className="flex flex-wrap gap-1 border-b border-border bg-surface/40 p-1">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:bg-elevated/60 hover:text-foreground'
            }`}
            title={tab.description}
          >
            <Icon className="size-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
