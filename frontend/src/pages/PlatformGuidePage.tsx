import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageContainer, PagePanel } from '@/components/layout/PageContainer';
import { PageShell, SHOWCASE_MAX_WIDTH_CLASS } from '@/components/layout/PageShell';
import { PlatformGuideBody } from '@/components/guides/PlatformGuideBody';
import {
  PLATFORM_GUIDES,
  getPlatformGuide,
  platformGuidePath,
} from '@/lib/platformGuides';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function PlatformGuidePage() {
  const { guideSlug = '' } = useParams<{ guideSlug: string }>();
  const guide = getPlatformGuide(guideSlug);

  if (!guide) {
    return <NotFoundPage />;
  }

  return (
    <PageContainer>
      <PageShell width="wide" className={`${SHOWCASE_MAX_WIDTH_CLASS} flex flex-col gap-6 py-6`}>
        <Link
          to="/recruitment"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Recruitment Directory
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{guide.title}</h1>
          <p className="text-sm text-muted">Esiana platform guide — not specific to any campaign.</p>
        </header>

        <PagePanel className="p-6">
          <PlatformGuideBody content={guide.body} />
        </PagePanel>

        <footer className="border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">All guides</h2>
          <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {PLATFORM_GUIDES.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to={platformGuidePath(entry.slug)}
                  className={
                    entry.slug === guide.slug
                      ? 'text-sm font-medium text-foreground'
                      : 'text-sm font-medium text-primary hover:text-primary-hover'
                  }
                  aria-current={entry.slug === guide.slug ? 'page' : undefined}
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      </PageShell>
    </PageContainer>
  );
}
