import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { PublicDirectoryCampaign } from '@/types/recruitment';

export const RECRUITMENT_BEFORE_APPLY_NOTE_MAX = 500;

interface RecruitmentBeforeApplyNoteProps {
  campaign: PublicDirectoryCampaign;
  className?: string;
}

export function RecruitmentBeforeApplyNote({
  campaign,
  className = '',
}: RecruitmentBeforeApplyNoteProps) {
  const note = campaign.recruitmentBeforeApplyNote?.trim();
  if (!note) return null;

  return (
    <div
      className={`rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 ${className}`.trim()}
    >
      <p className={`${META_SECTION_LABEL_CLASS} text-primary/90`}>
        Before you apply
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">
        {note}
      </p>
    </div>
  );
}
