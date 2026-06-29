import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { RecruitmentIntegrationIcons } from '@/components/recruitment/RecruitmentIntegrationIcons';
import type { PublicDirectoryRecruitment } from '@/types/recruitment';

interface RecruitmentSupportingDetailsProps {
  recruitment: PublicDirectoryRecruitment;
}

export function RecruitmentSupportingDetails({ recruitment }: RecruitmentSupportingDetailsProps) {
  const providers = recruitment.integrationProviders;
  const equipment = recruitment.equipmentNeeded?.trim();
  if (providers.length === 0 && !equipment) return null;

  return (
    <section className="space-y-4 pb-8 text-sm text-muted">
      <h2 className={META_SECTION_LABEL_CLASS}>Table logistics</h2>
      {providers.length > 0 ? <RecruitmentIntegrationIcons providers={providers} /> : null}
      {equipment ? (
        <p>
          <span className="text-foreground/80">Equipment:</span> {equipment}
        </p>
      ) : null}
    </section>
  );
}
