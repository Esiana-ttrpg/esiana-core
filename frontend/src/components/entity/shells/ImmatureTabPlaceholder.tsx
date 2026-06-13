interface ImmatureTabPlaceholderProps {
  title: string;
  description: string;
}

export function ImmatureTabPlaceholder({
  title,
  description,
}: ImmatureTabPlaceholderProps) {
  return (
    <section className="mb-6 rounded-lg border border-dashed border-border/60 bg-surface/20 px-6 py-10 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
    </section>
  );
}
