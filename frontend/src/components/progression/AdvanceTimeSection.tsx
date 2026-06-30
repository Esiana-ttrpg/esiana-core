import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import {
  campaignDowntimeHubPath,
  campaignPath,
  campaignWorldAdvancePath,
} from '@/lib/campaignPaths';
import { progressionSectionHref } from '@/lib/progressionLayout';

interface AdvanceTimeSectionProps {
  campaignHandle: string;
}

const WIZARD_STEPS = [
  {
    title: 'Advance campaign time',
    description: 'Move the campaign clock forward between sessions.',
    href: (handle: string) => campaignPath(handle, 'chronology'),
  },
  {
    title: 'Resolve projects',
    description: 'Review completed or stalled downtime projects.',
    href: (handle: string) => `${campaignDowntimeHubPath(handle)}?section=projects`,
  },
  {
    title: 'Process havens',
    description: 'Check haven threats and crew updates.',
    href: (handle: string) => `${campaignDowntimeHubPath(handle)}?section=havens`,
  },
  {
    title: 'Review pending developments',
    description: 'Approve or reject world development suggestions.',
    href: (handle: string) => progressionSectionHref(campaignPath(handle, 'progression'), 'developments'),
  },
  {
    title: 'Review consequences',
    description: 'Apply narrative consequences from recent events.',
    href: (handle: string) => progressionSectionHref(campaignPath(handle, 'progression'), 'consequences'),
  },
] as const;

export function AdvanceTimeSection({ campaignHandle }: AdvanceTimeSectionProps) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className={TYPE_DISPLAY_CLASS}>Advance Time</h2>
        <p className="text-sm text-muted-foreground">
          Guided between-sessions ritual — advance time, then resolve simulation outputs in order.
        </p>
      </header>

      <ol className="space-y-3">
        {WIZARD_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-lg border border-border bg-card p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {index + 1}
            </span>
            <div>
              <Link to={step.href(campaignHandle)} className="font-medium text-primary hover:underline">
                {step.title}
              </Link>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground">
        For macro world-state batches, use{' '}
        <Link to={campaignWorldAdvancePath(campaignHandle)} className="text-primary hover:underline">
          World Advance
        </Link>
        . Treasury suggestions remain in{' '}
        <Link
          to={`${campaignDowntimeHubPath(campaignHandle)}?section=ledger`}
          className="text-primary hover:underline"
        >
          Downtime › Ledger
        </Link>
        .
      </p>
    </div>
  );
}
