import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { tokenizeSafetyToolsText } from '@shared/safetyToolsGlossary';
import { SafetyToolHelp } from './SafetyToolHelp';

interface RecruitmentSafetySectionProps {
  safetyTools: string | null;
}

export function RecruitmentSafetySection({ safetyTools }: RecruitmentSafetySectionProps) {
  const trimmed = safetyTools?.trim();
  if (!trimmed) {
    return (
      <section className="space-y-2 border-b border-border/60 pb-8">
        <h2 className={TYPE_DISPLAY_CLASS}>Safety at this table</h2>
        <p className="text-sm text-muted">The DM has not listed specific safety tools yet.</p>
      </section>
    );
  }

  const segments = tokenizeSafetyToolsText(trimmed);

  return (
    <section className="space-y-3 border-b border-border/60 pb-8">
      <h2 className={TYPE_DISPLAY_CLASS}>Safety at this table</h2>
      <p className="text-sm text-muted">
        These tools help everyone stay comfortable. Tap (?) next to a term if you are unfamiliar with it.
      </p>
      <div className="text-sm leading-relaxed text-foreground">
        {segments.map((segment, index) => {
          if (segment.type === 'term') {
            return (
              <span key={`${segment.entry.slug}-${index}`} className="mr-2 inline">
                <SafetyToolHelp entry={segment.entry} />
              </span>
            );
          }
          return (
            <span key={`text-${index}`} className="whitespace-pre-wrap">
              {segment.value}
            </span>
          );
        })}
      </div>
    </section>
  );
}
