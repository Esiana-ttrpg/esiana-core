type Props = {
  name: string;
  size?: 'card' | 'hero' | 'showcase';
};

/** Designed no-art mark — intentional monogram, not an empty image hole. */
export function PortfolioNoArtMark({ name, size = 'card' }: Props) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  const sizeClass =
    size === 'hero'
      ? 'min-h-64 w-full max-w-md rounded-2xl text-6xl'
      : size === 'showcase'
        ? 'size-28 rounded-xl text-3xl'
        : 'size-full rounded-lg text-2xl';

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-elevated via-surface to-elevated font-display tracking-[0.2em] text-muted/80 ${sizeClass}`}
      aria-hidden
    >
      <span className="select-none border border-border/40 px-3 py-1">{initial}</span>
    </div>
  );
}
