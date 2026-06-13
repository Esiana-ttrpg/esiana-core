/** Shared form control styles using theme CSS variables. */
export const controlClasses =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30';

export const textareaClasses =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30';

export const selectClasses = controlClasses;

export const primaryButtonClasses =
  'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-accent/40 bg-elevated px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50';
