import { catalogLucideIcon } from '@/lib/tagIconCatalog';
import type { SidebarConfig } from '@/lib/sidebarConfig';
import type { Command } from '@/lib/commands/types';
import { SidebarNavIcon } from '@/components/SidebarNavIcon';

interface CommandRowProps {
  command: Command;
  sidebarConfig: SidebarConfig;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}

export function CommandRow({
  command,
  sidebarConfig,
  active,
  onHover,
  onSelect,
}: CommandRowProps) {
  const FallbackIcon = catalogLucideIcon(command.icon ?? 'sparkles');

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        active ? 'bg-elevated/80' : 'hover:bg-elevated/50'
      }`}
    >
      {command.sidebarSectionId ? (
        <SidebarNavIcon
          config={sidebarConfig}
          sectionId={command.sidebarSectionId}
          className="size-4 shrink-0 text-muted opacity-80"
        />
      ) : (
        <FallbackIcon className="size-4 shrink-0 text-muted" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">
          {command.label}
        </span>
        {command.description ? (
          <span className="block truncate text-xs text-muted">
            {command.description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
