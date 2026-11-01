import { useContext } from 'react';
import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import { DashboardPresentationContext } from './DashboardWidgetShell';

interface CampaignCurrentStoryProps {
  story: CampaignNarrativeSnapshot['currentStory'];
  embedded?: boolean;
}

export function CampaignCurrentStory({ story }: CampaignCurrentStoryProps) {
  const { variant } = useContext(DashboardPresentationContext);
  const primary = story.activeQuest ?? story.activeThread;
  const title = story.arcTitle?.replace(/^Arc:\s*/i, '') || primary?.title;
  const summary = story.arcProse || primary?.snippet;
  const progress = story.activeQuest?.progress;
  return <div className="min-w-0 space-y-4">
    {title ? <h2 className={`${TYPE_PROSE_CLASS} break-words font-semibold leading-snug text-focal-foreground ${variant === 'featured' ? 'text-2xl' : 'text-xl'}`}>{title}</h2>
      : <p className="text-sm text-muted">{story.emptyPrompt || 'Discover the world and begin your next story.'}</p>}
    {summary ? <p className={`${TYPE_PROSE_CLASS} max-w-prose text-base leading-relaxed text-focal-muted ${variant === 'featured' ? 'line-clamp-4' : 'line-clamp-3'}`}>{summary}</p> : null}
    {primary ? <div className="space-y-2">
      <p className="text-xs text-muted">{primary.roleLabel}{primary.statusLabel ? ` - ${primary.statusLabel.toLowerCase().replaceAll('_', ' ')}` : ''}</p>
      {primary.title !== title ? <Link to={primary.href} className="block break-words text-sm font-medium text-foreground hover:text-primary">{primary.title}</Link> : null}
      {progress && progress.total > 0 ? <div className="max-w-sm space-y-1">
        <p className="text-xs text-muted">{progress.completed} of {progress.total} objectives complete</p>
        <progress aria-label="Quest progress" className="h-1.5 w-full accent-primary" max={progress.total} value={progress.completed} />
      </div> : null}
    </div> : null}
    {story.activeThread && story.activeQuest && story.activeThread.id !== primary?.id ? <p className="text-sm text-muted">Unresolved: <Link to={story.activeThread.href} className="hover:text-primary">{story.activeThread.title}</Link></p> : null}
    <Link to={primary?.href ?? story.adventureHref} className="inline-flex items-center rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15">{primary ? 'Continue story' : 'Explore the world'}</Link>
  </div>;
}
