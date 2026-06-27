import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { fetchWorkshopDrafts, countWordsInMarkdown } from '@/lib/workshopDrafts';

interface WorkshopWritingPulseProps {
  campaignHandle: string;
}

export function WorkshopWritingPulse({ campaignHandle }: WorkshopWritingPulseProps) {
  const [wordsToday, setWordsToday] = useState<number | null>(null);
  const [draftsTouched, setDraftsTouched] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    void fetchWorkshopDrafts(campaignHandle, { status: 'active', limit: 50 }).then((drafts) => {
      if (cancelled) return;
      const touchedToday = drafts.filter(
        (draft) => new Date(draft.lastTouchedAt) >= startOfDay,
      );
      setDraftsTouched(touchedToday.length);
      setWordsToday(
        touchedToday.reduce((sum, draft) => sum + countWordsInMarkdown(draft.bodyMarkdown), 0),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  if (wordsToday === null) return null;

  return (
    <section className="space-y-1.5">
      <h3 className="META_SECTION_LABEL_CLASS-foreground">
        Writing pulse
      </h3>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>{wordsToday} words today</li>
        {draftsTouched != null && draftsTouched > 0 ? (
          <li>
            {draftsTouched} draft{draftsTouched === 1 ? '' : 's'} touched
          </li>
        ) : null}
      </ul>
    </section>
  );
}
