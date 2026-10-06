import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import type { DowntimeHubOverviewPayload, DowntimeOverviewActivity } from '@shared/downtimeHub';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { downtimeSectionHref, type DowntimeSectionId } from '@/lib/downtimeLayout';
import { campaignChronologyPath, campaignDowntimeHubPath } from '@/lib/campaignPaths';

interface DowntimeOverviewSectionProps {
  campaignHandle: string;
  overview: DowntimeHubOverviewPayload;
  canManage: boolean;
  canContributeToLedger: boolean;
  onCreateProject: () => void;
  onCreateHaven: () => void;
  onAddLedgerEntry: () => void;
}

function sectionLink(campaignHandle: string, section: DowntimeSectionId): string {
  return downtimeSectionHref(campaignDowntimeHubPath(campaignHandle), section);
}

function SheetRegion({ area, children }: { area: string; children: ReactNode }) {
  return <section className={`downtime-party-sheet__${area} min-w-0 bg-background p-4 sm:p-5`}>{children}</section>;
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className={META_SECTION_LABEL_CLASS}>{children}</h2>;
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">{children}<ArrowRight className="size-3.5" aria-hidden /></Link>;
}

function ActionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><Plus className="size-3.5" aria-hidden />{children}</button>;
}

function ActivityRow({ item }: { item: DowntimeOverviewActivity }) {
  const content = <>
    <div className="flex min-w-0 flex-1 items-baseline gap-2">
      <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
      {item.detail ? <span className="hidden truncate text-xs text-muted-foreground sm:inline">{item.detail}</span> : null}
    </div>
    <div className="flex shrink-0 items-baseline gap-2 text-xs text-muted-foreground"><span>{item.sourceLabel}</span><span>{item.dateLabel}</span></div>
  </>;
  return item.href
    ? <Link to={item.href} className="flex min-w-0 gap-3 py-2 hover:text-primary">{content}</Link>
    : <div className="flex min-w-0 gap-3 py-2">{content}</div>;
}

export function DowntimeOverviewSection({ campaignHandle, overview, canManage, canContributeToLedger, onCreateProject, onCreateHaven, onAddLedgerEntry }: DowntimeOverviewSectionProps) {
  const chronologyHref = overview.currentDowntimePeriod?.chronologyFeedHref ?? campaignChronologyPath(campaignHandle);
  return <div className="downtime-party-sheet-grid overflow-hidden rounded-lg border border-border bg-border">
    <SheetRegion area="current">
      <SectionHeading>Current period</SectionHeading>
      <p className="mt-2 font-serif text-xl text-foreground">{overview.currentTimeLabel}</p>
      {overview.currentDowntimePeriod ? <>
        <p className="mt-1 text-sm text-foreground/90">{overview.currentDowntimePeriod.title}</p>
        {overview.currentDowntimePeriod.spanLabel ? <p className="mt-1 text-xs text-muted-foreground">{overview.currentDowntimePeriod.spanLabel}</p> : null}
      </> : <p className="mt-1 text-sm text-muted-foreground">No active downtime period.</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <TextLink to={chronologyHref}>Open Chronology</TextLink>
        {overview.pendingWorldEventSuggestionsCount > 0 ? <TextLink to={sectionLink(campaignHandle, 'worldEvents')}>
          {overview.pendingWorldEventSuggestionsCount} {overview.pendingWorldEventSuggestionsCount === 1 ? 'event' : 'events'} awaiting review
        </TextLink> : null}
      </div>
    </SheetRegion>

    <SheetRegion area="projects">
      <div className="flex items-center justify-between gap-3"><SectionHeading>Projects</SectionHeading><TextLink to={sectionLink(campaignHandle, 'projects')}>All projects</TextLink></div>
      {overview.projects.length > 0 ? <ul className="mt-3 divide-y divide-border/70">{overview.projects.map((project) => <li key={project.id} className="py-3 first:pt-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link to={project.href} className="min-w-0 truncate font-medium text-foreground hover:text-primary">{project.title}</Link>
          <span className="shrink-0 text-xs text-muted-foreground">{project.remainingLabel ?? project.clockState}</span>
        </div>
        {project.durationTotalMinutes !== '0' ? <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/40" role="progressbar" aria-label={`${project.title} progress`} aria-valuenow={project.progressPercent} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary/45" style={{ width: `${Math.max(0, Math.min(100, project.progressPercent))}%` }} /></div> : null}
        <p className="mt-1 text-xs text-muted-foreground">{project.blockersSummary ?? project.requiresSummary ?? project.operationPostureLabel ?? 'Ready for the next campaign-time advance.'}</p>
      </li>)}</ul> : <div className="mt-3 min-h-24"><p className="text-sm font-medium text-foreground">No active projects.</p><p className="mt-1 max-w-md text-sm text-muted-foreground">Track something the party is working toward over time.</p></div>}
      {canManage ? <div className="mt-3"><ActionButton onClick={onCreateProject}>Start a project</ActionButton></div> : null}
    </SheetRegion>

    <SheetRegion area="funds">
      <SectionHeading>Party funds</SectionHeading>
      {overview.ledger.hasEntries || overview.ledger.balanceLabel ? <>
        {overview.ledger.balanceLabel ? <p className="mt-2 font-serif text-2xl text-foreground">{overview.ledger.balanceLabel}</p> : null}
        <ul className="mt-2 divide-y divide-border/60">{overview.ledger.entries.map((entry) => <li key={entry.id} className="flex justify-between gap-2 py-1.5 text-xs"><span className="truncate text-muted-foreground">{entry.title}</span><span className="shrink-0 text-foreground">{entry.amountLabel}</span></li>)}</ul>
      </> : <p className="mt-2 text-sm text-muted-foreground">No ledger entries.</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{canContributeToLedger ? <ActionButton onClick={onAddLedgerEntry}>Add entry</ActionButton> : null}<TextLink to={sectionLink(campaignHandle, 'ledger')}>Ledger</TextLink></div>
    </SheetRegion>

    <SheetRegion area="havens">
      <div className="flex items-center justify-between gap-3"><SectionHeading>Havens & holdings</SectionHeading><TextLink to={sectionLink(campaignHandle, 'havens')}>All havens</TextLink></div>
      {overview.havens.length > 0 ? <ul className="mt-3 divide-y divide-border/70">{overview.havens.map((haven) => <li key={haven.id} className="py-2.5 first:pt-1"><Link to={haven.href} className="font-medium text-foreground hover:text-primary">{haven.title}</Link><p className="mt-0.5 text-xs text-muted-foreground">{haven.subtitle}{haven.pressureHeadline ? ` · ${haven.pressureHeadline}` : ''}</p></li>)}</ul> : <div className="mt-3 min-h-16"><p className="text-sm font-medium text-foreground">No havens or holdings yet.</p><p className="mt-1 text-sm text-muted-foreground">Add a place the party maintains.</p></div>}
      {canManage ? <div className="mt-3"><ActionButton onClick={onCreateHaven}>Add a haven</ActionButton></div> : null}
    </SheetRegion>

    <SheetRegion area="reputation">
      <SectionHeading>Reputation</SectionHeading>
      {overview.reputation.standings.length > 0 ? <ul className="mt-3 divide-y divide-border/60">{overview.reputation.standings.map((standing) => <li key={standing.factionPageId} className="py-2 first:pt-0"><Link to={standing.factionHref} className="text-sm font-medium text-foreground hover:text-primary">{standing.factionTitle}</Link><p className="text-xs text-muted-foreground">{standing.trustBand} · {standing.notorietyBand}</p></li>)}</ul> : <><p className="mt-2 text-sm text-muted-foreground">No reputation recorded.</p><p className="mt-1 text-xs text-muted-foreground">Standings emerge from the party’s faction relationships.</p></>}
      <div className="mt-3"><TextLink to={sectionLink(campaignHandle, 'reputation')}>View reputation</TextLink></div>
    </SheetRegion>

    <SheetRegion area="operations">
      <SectionHeading>Party operations</SectionHeading>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">{overview.partyOperations.map((field) => <div key={field.id} className="min-w-0"><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1 font-serif text-lg text-foreground">{field.supported ? field.valueLabel : <span className="text-muted-foreground" title="Not tracked yet" aria-label={`${field.label}: Not tracked yet`}>—</span>}</dd></div>)}</dl>
    </SheetRegion>

    <SheetRegion area="activity">
      <SectionHeading>Recent activity</SectionHeading>
      {overview.recentActivity.length > 0 ? <ul className="mt-2 divide-y divide-border/60">{overview.recentActivity.map((item) => <li key={item.id}><ActivityRow item={item} /></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Nothing has changed yet.</p>}
    </SheetRegion>
  </div>;
}
