import type { PublicDirectoryRecruitment } from '@/types/recruitment';

interface RecruitmentSupportingDetailsProps {
  recruitment: PublicDirectoryRecruitment;
}

export function RecruitmentSupportingDetails({ recruitment }: RecruitmentSupportingDetailsProps) {
  const tools = recruitment.externalTools;
  const equipment = recruitment.equipmentNeeded?.trim();
  if (tools.length === 0 && !equipment) return null;

  return (
    <section className="space-y-4 pb-8 text-sm text-muted">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Table logistics</h2>
      {tools.length > 0 ? (
        <p>
          <span className="text-foreground/80">Tools:</span>{' '}
          {tools.join(', ')}
        </p>
      ) : null}
      {equipment ? (
        <p>
          <span className="text-foreground/80">Equipment:</span> {equipment}
        </p>
      ) : null}
    </section>
  );
}
