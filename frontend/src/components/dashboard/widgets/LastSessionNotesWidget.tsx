import { useContext } from 'react';
import { ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardLastSessionSummary } from '@/lib/dashboardSummary';
import { campaignNoteAllViewPath } from '@/lib/campaignPaths';
import { formatAudioTime } from '@/lib/sessionAudio';
import { DashboardPresentationContext, DashboardWidgetShell } from '../DashboardWidgetShell';

interface LastSessionNotesWidgetProps {
  campaignHandle: string;
  lastSession: DashboardLastSessionSummary | null;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function LastSessionNotesWidget({
  campaignHandle,
  lastSession,
  customizeMode,
  onHide,
}: LastSessionNotesWidgetProps) {
  const { variant } = useContext(DashboardPresentationContext);
  const followUp = lastSession?.followUp;
  const own = followUp?.myNotes;
  const contributors = followUp?.contributors ?? [];
  const media = followUp?.media;
  const notesHref = followUp?.notesHref ?? (lastSession ? campaignNoteAllViewPath(campaignHandle, lastSession.timelinePointId) : '');
  const sessionMetadata = lastSession ? [
    lastSession.sequenceOrder != null && lastSession.title !== `Session ${lastSession.sequenceOrder}` ? `Session ${lastSession.sequenceOrder}` : null,
    lastSession.playedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(lastSession.playedAt)) : null,
  ].filter(Boolean).join(' · ') : '';
  const transcriptLabels = {
    unavailable: 'Transcript unavailable', not_requested: 'Transcription not requested',
    queued: 'Transcription queued', processing: 'Transcript processing', ready: 'Transcript ready',
    failed: 'Transcription needs attention',
  };
  return (
    <DashboardWidgetShell
      title="Last Session"
      icon={<ScrollText className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {!lastSession ? (
        <p className="text-sm text-muted">
          After a completed session, add your notes and discover what the party recorded here.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
          <p className={`break-words type-prose font-semibold text-foreground ${variant === 'featured' ? 'text-xl' : 'text-base'}`}>{lastSession.title}</p>
          {sessionMetadata ? <p className="text-xs text-muted">{sessionMetadata}</p> : null}
          </div>

          {own ? <section aria-label="Your session notes" className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1 text-sm">
              <h4 className="inline font-medium text-foreground">Your notes</h4>
              <span className="text-muted"> · {own.state === 'added' ? 'Added' : own.state === 'not_added' ? 'Not added' : 'Unavailable to you'}</span>
            </div>
            {own.href && own.state !== 'unavailable' ? <Link to={own.href}
              className="inline-flex rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15"
            >{own.state === 'not_added' && own.canEdit ? 'Add your notes' : own.canEdit ? 'View / Edit your notes' : 'View your notes'}</Link> : null}
            {own.state === 'unavailable' ? <p className="w-full text-xs text-muted">Note availability depends on your access; private content is not included.</p> : null}
          </section> : <p className="text-sm text-muted">Open the session to check your notes and party contributions.</p>}

          {followUp ? <section aria-label="Party contributions" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="text-sm font-medium text-foreground">Party contributions</h4>
            <span className="text-xs text-muted">{contributors.length} visible {contributors.length === 1 ? 'contributor' : 'contributors'}</span>
            {contributors.length ? <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {contributors.slice(0, variant === 'compact' ? 3 : 6).map(contributor => (
                <li key={contributor.userId}><Link to={contributor.href} className="text-primary hover:underline">{contributor.label}</Link></li>
              ))}
            </ul> : <p className="text-xs text-muted">No shared contributions are available to you yet.</p>}
          </section> : null}

          <div role="group" aria-label="Session follow-up" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1 text-xs text-muted">
          <Link to={notesHref} className="text-sm text-primary hover:underline">View party notes</Link>
          {media ? <>
            <span>{media.audio.available && media.audio.href ? <Link to={media.audio.href} className="text-primary hover:underline">Audio available{media.audio.durationMs ? ` (${formatAudioTime(media.audio.durationMs)})` : ''}</Link> : 'No playable audio available to you'}</span>
            <span>{media.transcript.state === 'ready' && media.transcript.href ? <Link to={media.transcript.href} className="text-primary hover:underline">Transcript ready · View transcript</Link> : transcriptLabels[media.transcript.state]}</span>
          </> : null}
          </div>
        </div>
      )}
    </DashboardWidgetShell>
  );
}
