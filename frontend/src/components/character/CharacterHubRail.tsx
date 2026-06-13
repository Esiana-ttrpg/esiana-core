import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { CharacterHubPayload } from '@/lib/characterHub';
import type { CategoryIndexChild } from '@/lib/wiki';
import { CharacterSelectedPreview } from '@/components/character/CharacterSelectedPreview';
import { TYPE_META_CLASS } from '@/lib/surfaceLayout';

export interface CharacterHubRailContentProps {
  campaignHandle: string;
  payload: CharacterHubPayload;
  selectedCharacterId: string | null;
  onLocationFilter?: (locationTitle: string) => void;
}

function findSelectedChild(
  payload: CharacterHubPayload,
  selectedCharacterId: string | null,
): CategoryIndexChild | null {
  if (!selectedCharacterId) return null;
  return payload.children.find((c) => c.id === selectedCharacterId) ?? null;
}

export function CharacterHubRailContent({
  campaignHandle,
  payload,
  selectedCharacterId,
  onLocationFilter,
}: CharacterHubRailContentProps) {
  const selectedChild = findSelectedChild(payload, selectedCharacterId);
  const selectedContext = selectedCharacterId
    ? payload.characterContext[selectedCharacterId] ?? null
    : null;

  const latestSession = payload.latestSession;
  const activeAtLatestCount = latestSession
    ? latestSession.mentionedCharacterIds.length
    : 0;

  return (
    <div className="space-y-6">
      <CharacterSelectedPreview
        campaignHandle={campaignHandle}
        child={selectedChild}
        context={selectedContext}
        embedded
      />

      <div className="space-y-4 border-t border-border/60 pt-4">
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-contextual-muted">
            Current Session
          </h3>
          {latestSession ? (
            <div className="mt-2 space-y-1 text-sm">
              <Link
                to={latestSession.href}
                className="font-medium text-contextual-foreground hover:text-primary"
              >
                {latestSession.title}
              </Link>
              {latestSession.locationTitle ? (
                <p className="flex items-center gap-1 text-xs text-contextual-muted">
                  <MapPin className="size-3 shrink-0" />
                  {latestSession.locationTitle}
                </p>
              ) : null}
              <p className="text-xs text-contextual-muted">
                {activeAtLatestCount} character
                {activeAtLatestCount === 1 ? '' : 's'} mentioned
              </p>
            </div>
          ) : (
            <p className={`${TYPE_META_CLASS} mt-2 text-xs text-contextual-muted`}>
              No session notes yet.
            </p>
          )}
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-contextual-muted">
            Recently Seen
          </h3>
          {payload.recentlySeenBySession.length > 0 ? (
            <ul className="mt-2 space-y-3">
              {payload.recentlySeenBySession.slice(0, 3).map((session) => (
                <li key={session.sessionId}>
                  <Link
                    to={session.href}
                    className="text-xs font-medium text-contextual-foreground hover:text-primary"
                  >
                    {session.sessionTitle}
                  </Link>
                  <ul className="mt-1 space-y-0.5">
                    {session.characters.slice(0, 5).map((character) => (
                      <li key={character.id}>
                        <Link
                          to={character.href}
                          className="text-xs text-contextual-muted hover:text-primary"
                        >
                          {character.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${TYPE_META_CLASS} mt-2 text-xs text-contextual-muted`}>
              No recent session appearances.
            </p>
          )}
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-contextual-muted">
            Active Locations
          </h3>
          {payload.locationCounts.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {payload.locationCounts.map((location) => (
                <li key={location.locationPageId ?? '__unknown__'}>
                  <button
                    type="button"
                    onClick={() => onLocationFilter?.(location.locationTitle)}
                    className="inline-flex items-center gap-1 rounded-full bg-focal-elevated/80 px-2.5 py-1 text-xs text-contextual-foreground transition-colors hover:bg-primary/15 hover:text-primary"
                  >
                    <MapPin className="size-3 shrink-0" />
                    {location.locationTitle}
                    <span className="text-contextual-muted">({location.count})</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${TYPE_META_CLASS} mt-2 text-xs text-contextual-muted`}>
              No location data yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/** @deprecated use CharacterHubContextRail */
export function CharacterHubRail(props: CharacterHubRailContentProps) {
  return <CharacterHubRailContent {...props} />;
}
