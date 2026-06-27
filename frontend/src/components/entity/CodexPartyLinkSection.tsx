import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import {
  fetchCampaignMembersForIdentity,
  findMemberLinkedToPage,
  memberDisplayLabel,
  updateMemberIdentityPage,
  type CampaignMemberIdentity,
} from '@/lib/campaignMemberIdentity';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface CodexPartyLinkSectionProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  railCompact: boolean;
  onIdentityChanged?: () => void | Promise<void>;
}

export function CodexPartyLinkSection({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  isEditingPage,
  railCompact,
  onIdentityChanged,
}: CodexPartyLinkSectionProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [members, setMembers] = useState<CampaignMemberIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDMUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchCampaignMembersForIdentity(campaignHandle)
      .then((rows) => {
        if (!cancelled) {
          setMembers(rows);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load members');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, isDMUser]);

  const linkedMember = findMemberLinkedToPage(members, pageId);

  async function assignToMember(userId: string) {
    setUpdating(true);
    setError(null);
    try {
      const previouslyLinked = members.filter((m) => m.identityPageId === pageId);
      const nextMembers = [...members];
      for (const member of previouslyLinked) {
        if (member.userId !== userId) {
          const cleared = await updateMemberIdentityPage(
            campaignHandle,
            member.userId,
            null,
          );
          const idx = nextMembers.findIndex((m) => m.userId === cleared.userId);
          if (idx >= 0) nextMembers[idx] = cleared;
        }
      }
      const updated = await updateMemberIdentityPage(
        campaignHandle,
        userId,
        pageId,
      );
      const idx = nextMembers.findIndex((m) => m.userId === updated.userId);
      if (idx >= 0) nextMembers[idx] = updated;
      setMembers(nextMembers);
      await onIdentityChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update party link');
    } finally {
      setUpdating(false);
    }
  }

  async function clearLink() {
    if (!linkedMember) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await updateMemberIdentityPage(
        campaignHandle,
        linkedMember.userId,
        null,
      );
      setMembers((prev) =>
        prev.map((m) => (m.userId === updated.userId ? updated : m)),
      );
      await onIdentityChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to clear party link');
    } finally {
      setUpdating(false);
    }
  }

  if (!isDMUser) return null;

  const playerMembers = members.filter(
    (m) => m.role !== 'GAMEMASTER' && m.role !== 'WRITER',
  );

  return (
    <section
      className={`rounded-lg border border-border bg-surface/40 space-y-2 ${
        railCompact ? 'p-2' : 'p-3'
      }`}
    >
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Users className="size-3.5 text-primary" aria-hidden />
        Party character
      </h3>

      {loading ? (
        <p className="text-xs text-muted">Loading roster…</p>
      ) : linkedMember ? (
        <p className="text-xs text-foreground">
          Linked to {memberDisplayLabel(linkedMember)}
        </p>
      ) : (
        <p className="text-xs text-muted">Not linked to a player</p>
      )}

      {isEditingPage ? (
        <div className="space-y-2">
          <label className="flex flex-col gap-1">
            <span className={META_SECTION_LABEL_CLASS}>
              Assign to player
            </span>
            <select
              value={linkedMember?.userId ?? ''}
              disabled={updating}
              onChange={(e) => {
                const userId = e.target.value;
                if (!userId) {
                  void clearLink();
                } else {
                  void assignToMember(userId);
                }
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 disabled:opacity-50"
              aria-label="Assign party character"
            >
              <option value="">Not linked</option>
              {playerMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {memberDisplayLabel(member)}
                  {member.identityPageId && member.identityPageId !== pageId
                    ? ' (has another character)'
                    : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
