import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import type { CharacterCastContext } from '@/lib/characterHub';
import type { CategoryIndexChild } from '@/lib/wiki';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { CharacterLifeStatusBadge } from '@/components/entity/CharacterLifeStatusBadge';
import type { CharacterLifeStatus } from '@/lib/characterMetadata';
import { TYPE_META_CLASS } from '@/lib/surfaceLayout';

interface CharacterSelectedPreviewProps {
  campaignHandle: string;
  child: CategoryIndexChild | null;
  context: CharacterCastContext | null;
  /** When true, omit outer card chrome — parent shell owns the surface */
  embedded?: boolean;
}

export function CharacterSelectedPreview({
  campaignHandle,
  child,
  context,
  embedded = false,
}: CharacterSelectedPreviewProps) {
  const { flatPages } = useWiki();

  if (!child || !context) {
    if (embedded) {
      return (
        <p className={`${TYPE_META_CLASS} text-xs text-contextual-muted`}>
          Select a character in the cast list to preview context here.
        </p>
      );
    }
    return null;
  }

  const identity = parseCharacterMetadata(child.metadata);
  const displayName = formatCharacterDisplayName(
    child.title,
    identity.appearance.pronouns,
  );

  return (
    <section className={embedded ? 'space-y-4' : 'space-y-4 p-4'}>
      <div className="flex gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated/60">
          {context.portraitUrl ? (
            <img
              src={context.portraitUrl}
              alt=""
              className="size-full object-cover object-top"
            />
          ) : (
            <User className="size-8 text-muted/50" strokeWidth={1.25} />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-contextual-foreground">
            {displayName.primary}
          </h3>
          {context.identityLine ? (
            <p className="mt-0.5 text-xs text-contextual-muted">
              {context.identityLine}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <CharacterLifeStatusBadge
              status={context.lifeStatus as CharacterLifeStatus}
              compact
            />
            {context.isPartyMember ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {context.partyRoleLabel ?? 'Party'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="space-y-2 text-xs">
        {context.knownThrough ? (
          <div>
            <dt className="text-contextual-muted">Known Through</dt>
            <dd>
              <Link
                to={context.knownThrough.href}
                className="font-medium text-contextual-foreground hover:text-primary"
              >
                {context.knownThrough.title}
              </Link>
            </dd>
          </div>
        ) : null}
        {context.lastSeen ? (
          <div>
            <dt className="text-contextual-muted">Last Seen</dt>
            <dd>
              <Link
                to={context.lastSeen.href}
                className="font-medium text-contextual-foreground hover:text-primary"
              >
                {context.lastSeen.sessionTitle}
              </Link>
            </dd>
          </div>
        ) : null}
        {context.activeQuests.length > 0 ? (
          <div>
            <dt className="text-contextual-muted">Active In</dt>
            <dd className="mt-1 space-y-1">
              {context.activeQuests.map((quest) => (
                <Link
                  key={quest.id}
                  to={quest.href}
                  className="block font-medium text-contextual-foreground hover:text-primary"
                >
                  {quest.title}
                </Link>
              ))}
            </dd>
          </div>
        ) : null}
        {context.primaryAffiliationTitle && context.primaryAffiliationId ? (
          <div>
            <dt className="text-contextual-muted">Affiliation</dt>
            <dd>
              <Link
                to={campaignCategoryChildPath(
                  campaignHandle,
                  context.primaryAffiliationId,
                  'Organizations',
                  flatPages,
                )}
                className="font-medium text-contextual-foreground hover:text-primary"
              >
                {context.primaryAffiliationTitle}
              </Link>
            </dd>
          </div>
        ) : null}
        {context.coSeenWith.length > 0 ? (
          <div>
            <dt className="text-contextual-muted">Connected To Party</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {context.coSeenWith.map((peer) => (
                <Link
                  key={peer.id}
                  to={campaignCategoryChildPath(
                    campaignHandle,
                    peer.id,
                    'Characters',
                    flatPages,
                  )}
                  className="rounded-md bg-focal-elevated/80 px-2 py-0.5 font-medium text-contextual-foreground hover:text-primary"
                >
                  {peer.title}
                </Link>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      {context.memorySnippet ? (
        <blockquote className="border-l-2 border-border/60 pl-3 text-xs italic text-contextual-muted">
          &ldquo;{context.memorySnippet}&rdquo;
        </blockquote>
      ) : null}

      <Link
        to={campaignCategoryChildPath(
          campaignHandle,
          child.id,
          'Characters',
          flatPages,
        )}
        className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-elevated/50 px-3 py-2 text-sm font-medium text-contextual-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        Open Profile
      </Link>
    </section>
  );
}
