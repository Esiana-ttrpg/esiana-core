import ReactMarkdown from 'react-markdown';
import type { PublicDirectoryCampaign } from '@/types/recruitment';

interface RecruitmentPremiseProps {
  campaign: PublicDirectoryCampaign;
}

export function RecruitmentPremise({ campaign }: RecruitmentPremiseProps) {
  const premise = campaign.recruitmentPremise?.trim();
  const description = campaign.description?.trim();
  const body = premise || description;
  if (!body) return null;

  return (
    <section className="space-y-3 border-b border-border/60 pb-8">
      <h2 className="text-lg font-semibold text-foreground">
        {premise ? 'Campaign premise' : 'About this campaign'}
      </h2>
      <div className="prose prose-invert max-w-3xl text-base leading-relaxed text-foreground/95 prose-p:my-3">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </section>
  );
}
