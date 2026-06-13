import type { DowntimePulse } from '@/lib/downtime';

interface DowntimePulseCardProps {
  pulse: DowntimePulse;
}

export function DowntimePulseCard({ pulse }: DowntimePulseCardProps) {
  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
      <p className="text-lg font-medium leading-snug text-focal-foreground">{pulse.headline}</p>
      {pulse.bullets.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-focal-muted">
          {pulse.bullets.map((bullet) => (
            <li key={bullet} className="pl-3 border-l border-primary/30">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
