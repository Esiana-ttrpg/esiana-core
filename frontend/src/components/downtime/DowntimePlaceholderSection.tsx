import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { DowntimePlaceholderFraming } from '@/lib/downtime';

interface DowntimePlaceholderSectionProps {
  framing: DowntimePlaceholderFraming;
  sectionLabel: string;
}

export function DowntimePlaceholderSection({
  framing,
  sectionLabel,
}: DowntimePlaceholderSectionProps) {
  return (
    <div className="flex min-h-[420px] flex-col justify-center">
      <article className="mx-auto max-w-lg rounded-xl border border-border/80 bg-elevated/20 px-6 py-8 text-center shadow-sm">
        <p className={META_SECTION_LABEL_CLASS}>{sectionLabel}</p>
        <h2 className="mt-3 text-xl font-medium text-foreground">{framing.headline}</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {framing.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground/80">
          Planned for Phase {framing.phase} — narrative systems, not spreadsheets.
        </p>
      </article>
    </div>
  );
}
