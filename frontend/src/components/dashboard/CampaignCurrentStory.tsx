import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { META_SECTION_LABEL_CLASS, SURFACE_FLOAT_CLASS, TYPE_DISPLAY_CLASS, TYPE_META_CLASS, TYPE_PROSE_CLASS, narrativeFocalClass } from '@/lib/surfaceLayout';

interface CampaignCurrentStoryProps {
  story: CampaignNarrativeSnapshot['currentStory'];
}

function StoryBeat({
  beat,
  emphasized = false,
}: {
  beat: NonNullable<CampaignNarrativeSnapshot['currentStory']['activeQuest']>;
  emphasized?: boolean;
}) {
  return (
    <Link
      to={beat.href}
      className={`block rounded-lg border border-border/25 p-4 transition-colors hover:border-primary/30 hover:bg-focal-elevated/50 ${narrativeFocalClass(emphasized)}`}
    >
      <p className={META_SECTION_LABEL_CLASS}>
        {beat.roleLabel}
      </p>
      <p className="mt-1 text-base font-semibold leading-snug text-focal-foreground sm:text-lg">
        {beat.title}
      </p>
      {beat.statusLabel ? (
        <span className="mt-2 inline-block rounded-full bg-focal-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-focal-muted">
          {beat.statusLabel}
        </span>
      ) : null}
    </Link>
  );
}

export function CampaignCurrentStory({ story }: CampaignCurrentStoryProps) {
  const hasContent =
    story.arcTitle || story.arcProse || story.activeQuest || story.activeThread;

  if (!hasContent && story.emptyPrompt) {
    return (
      <div
        className={`${SURFACE_FLOAT_CLASS} region-depth-2 flex min-h-[14rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 px-8 py-12 text-center`}
      >
        <h2 className={TYPE_DISPLAY_CLASS}>
          Current Story
        </h2>
        <p className={`${TYPE_PROSE_CLASS} mt-3 max-w-md text-prose-muted`}>{story.emptyPrompt}</p>
        <Link
          to={story.adventureHref}
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Open Adventure
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`${SURFACE_FLOAT_CLASS} region-depth-2 rounded-xl ${narrativeFocalClass(true)}`}
    >
      <div className="px-6 py-5 sm:px-10 sm:py-8">
        <p className={META_SECTION_LABEL_CLASS}>
          Current Story
        </p>
        {story.arcTitle ? (
          <h2
            className={`mt-2 ${TYPE_DISPLAY_CLASS}`}
          >
            {story.arcTitle.replace(/^Arc:\s*/i, '')}
          </h2>
        ) : null}
        {story.arcProse ? (
          <p className={`${TYPE_PROSE_CLASS} mt-4 max-w-3xl text-base leading-relaxed text-prose-muted sm:text-lg`}>
            {story.arcProse}
          </p>
        ) : null}
        {story.activeQuest || story.activeThread ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {story.activeQuest ? (
              <StoryBeat beat={story.activeQuest} emphasized />
            ) : null}
            {story.activeThread ? (
              <StoryBeat beat={story.activeThread} emphasized={!story.activeQuest} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
