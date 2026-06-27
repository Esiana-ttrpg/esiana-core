import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
interface ProgressionPlaceholderSectionProps {
  title: string;
  body: string;
}

export function ProgressionPlaceholderSection({
  title,
  body,
}: ProgressionPlaceholderSectionProps) {
  return (
    <div className="wiki-focal-region wiki-focal-region--canvas rounded-lg border border-border/60 bg-surface/40 p-6">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{body}</p>
      <p className="mt-4 META_SECTION_LABEL_CLASS">Coming soon</p>
    </div>
  );
}
