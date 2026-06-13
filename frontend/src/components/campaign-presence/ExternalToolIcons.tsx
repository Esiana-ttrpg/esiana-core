import { externalToolIcon } from '@/lib/campaignPresence';

interface ExternalToolIconsProps {
  tools: string[];
}

export function ExternalToolIcons({ tools }: ExternalToolIconsProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tools.map((tool) => {
        const ToolIcon = externalToolIcon(tool);
        return (
          <span
            key={tool}
            title={tool}
            aria-label={tool}
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted"
          >
            {ToolIcon ? (
              <ToolIcon className="size-4 text-muted" />
            ) : (
              <span className="text-[10px] font-semibold uppercase text-muted">
                {tool.slice(0, 2)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
