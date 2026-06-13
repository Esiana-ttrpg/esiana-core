import {
  executeBlockAction,
  resolveBlockActionDescriptors,
  type BlockActionContext,
} from '@/lib/blockCapabilities';

export function BlockActionToolbar(props: BlockActionContext) {
  const actions = resolveBlockActionDescriptors(props);

  if (actions.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {actions.map((action) => {
        const Icon = action.icon;
        const isExpand = action.id === 'expand';
        const isFocus = action.id === 'focus';
        const pressed =
          (isExpand && props.displayScale === 'expanded') ||
          (isFocus && props.displayScale === 'focused');

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => {
              if (action.disabled) return;
              executeBlockAction(action.id, props);
            }}
            disabled={action.disabled}
            className={`rounded-md p-1.5 transition-colors ${
              pressed
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:bg-elevated hover:text-foreground'
            } ${action.disabled ? 'cursor-not-allowed opacity-40' : ''}`}
            title={action.title}
            aria-pressed={pressed}
            aria-label={action.label}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
