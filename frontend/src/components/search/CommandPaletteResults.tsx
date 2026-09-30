import { COMMAND_GROUP_ORDER, type Command, type CommandGroup } from '@/lib/commands/types';
import { CommandRow } from './CommandRow';

const GROUP_LABELS: Record<CommandGroup, string> = {
  page: 'Page',
  create: 'Create',
  navigate: 'Navigate',
  campaign: 'Campaign',
};

interface CommandPaletteResultsProps {
  commands: readonly Command[];
  activeIndex: number;
  showGroupHeaders: boolean;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
}

export function CommandPaletteResults({
  commands,
  activeIndex,
  showGroupHeaders,
  onHover,
  onSelect,
}: CommandPaletteResultsProps) {
  if (commands.length === 0) {
    return (
      <p className="px-4 py-8 text-sm text-muted">No matching commands.</p>
    );
  }

  if (!showGroupHeaders) {
    return (
      <>
        {commands.map((command, index) => (
          <CommandRow
            key={command.id}
            command={command}
            active={index === activeIndex}
            onHover={() => onHover(index)}
            onSelect={() => onSelect(index)}
          />
        ))}
      </>
    );
  }

  const byGroup = new Map<CommandGroup, { command: Command; index: number }[]>();
  for (let index = 0; index < commands.length; index++) {
    const command = commands[index]!;
    const list = byGroup.get(command.group) ?? [];
    list.push({ command, index });
    byGroup.set(command.group, list);
  }

  return (
    <>
      {COMMAND_GROUP_ORDER.map((group) => {
        const entries = byGroup.get(group);
        if (!entries || entries.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {GROUP_LABELS[group]}
            </p>
            {entries.map(({ command, index }) => (
              <CommandRow
                key={command.id}
                command={command}
                active={index === activeIndex}
                onHover={() => onHover(index)}
                onSelect={() => onSelect(index)}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
