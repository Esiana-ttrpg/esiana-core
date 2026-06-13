import type { ReactNode } from 'react';
import { CANVAS_RECESS_CLASS, SECTION_GAP_CLASS } from '@/lib/surfaceLayout';

export type CampaignHomeLevelId = '1' | '2' | '3' | '4' | '5' | '6';

interface CampaignHomeLevelProps {
  level: CampaignHomeLevelId;
  children: ReactNode;
  /** Extra vertical separation before this zone */
  recessBefore?: boolean;
  className?: string;
}

const LEVEL_CLASS: Record<CampaignHomeLevelId, string> = {
  '1': 'campaign-home-level--hero',
  '2': 'campaign-home-level--state min-h-[12rem]',
  '3': 'campaign-home-level--story min-h-[16rem]',
  '4': 'campaign-home-level--party',
  '5': 'campaign-home-level--activity',
  '6': 'campaign-home-level--deep',
};

export function CampaignHomeLevel({
  level,
  children,
  recessBefore = level !== '1',
  className = '',
}: CampaignHomeLevelProps) {
  return (
    <section
      data-home-level={level}
      className={[
        'campaign-home-level',
        LEVEL_CLASS[level],
        recessBefore ? CANVAS_RECESS_CLASS : '',
        recessBefore ? 'pt-2' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

export const CAMPAIGN_HOME_STACK_CLASS = `flex flex-col ${SECTION_GAP_CLASS} gap-8 lg:gap-10`;
