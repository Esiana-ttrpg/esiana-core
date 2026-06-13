import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import type { PublicDirectoryHost } from '@/types/recruitment';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface RecruitmentHostSectionProps {
  host: PublicDirectoryHost | null;
}

export function RecruitmentHostSection({ host }: RecruitmentHostSectionProps) {
  if (!host) return null;

  return (
    <section className="space-y-4 border-b border-border/60 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Your DM</h2>
        <p className="mt-1 text-sm text-muted">
          People join tables as much as campaigns — here is who runs this one.
        </p>
      </div>
      <div className="flex items-start gap-4">
        <div className="rounded-full border border-border bg-background p-1">
          <UserAvatar
            name={host.label}
            avatarUrl={host.avatarUrl}
            userId={host.id}
            size="lg"
          />
        </div>
        <div className="min-w-0 flex-1">
          {host.id ? (
            <Link
              to={`/users/${host.id}`}
              className="text-xl font-semibold text-primary hover:text-primary-hover"
            >
              {host.label}
            </Link>
          ) : (
            <p className="text-xl font-semibold text-foreground">{host.label}</p>
          )}
          {host.pronouns?.trim() ? (
            <p className="mt-0.5 text-sm text-muted">{host.pronouns}</p>
          ) : null}
          {host.publicBio?.trim() ? (
            <div className="prose prose-invert mt-3 max-w-none text-sm text-foreground prose-p:my-2">
              <ReactMarkdown>{host.publicBio}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
