import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, MoreHorizontal } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { WikiTreeNode } from '@/types/wiki';
export type AccessRole = 'GAMEMASTER' | 'WRITER' | 'PARTICIPANT' | 'OBSERVER';

export interface CampaignAccessMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AccessRole;
  isCampaignOwner: boolean;
  identityPageId?: string | null;
  identityPageTitle?: string | null;
  playerContext?: string;
  label?: string;
}

const ROLE_LABELS: Record<AccessRole, string> = {
  GAMEMASTER: 'Game Master',
  WRITER: 'Writer',
  PARTICIPANT: 'Player',
  OBSERVER: 'Observer',
};

interface AccessMembersPanelProps {
  campaignHandle: string;
  members: CampaignAccessMember[];
  accessLoading: boolean;
  accessError: string;
  canManageAccess: boolean;
  canManageMemberIdentity: boolean;
  currentUserId?: string;
  updatingMemberId: string | null;
  updatingIdentityUserId: string | null;
  flatPages: WikiTreeNode[];
  characterPages: WikiTreeNode[];
  inviteHref: string;
  rolesHref: string;
  onMemberRoleChange: (userId: string, role: AccessRole) => void;
  onMemberIdentityChange: (userId: string, identityPageId: string | null) => Promise<void>;
  onRemoveMember: (member: CampaignAccessMember) => void;
  onOfferOwnership: (member: CampaignAccessMember) => void;
}

function OwnerCrown() {
  const tooltipId = useId();
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        className="rounded-sm text-amber-300/90 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Campaign owner"
        aria-describedby={tooltipId}
      >
        <Crown className="size-3.5" aria-hidden />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-elevated px-2 py-1 text-xs text-foreground opacity-0 shadow-lg group-hover:opacity-100 group-focus-within:opacity-100"
      >
        Campaign owner
      </span>
    </span>
  );
}

function MemberOverflowMenu({
  member,
  canManageAccess,
  isCampaignOwnerViewer,
  busy,
  onOfferOwnership,
  onRemoveMember,
}: {
  member: CampaignAccessMember;
  canManageAccess: boolean;
  isCampaignOwnerViewer: boolean;
  busy: boolean;
  onOfferOwnership: (member: CampaignAccessMember) => void;
  onRemoveMember: (member: CampaignAccessMember) => void;
}) {
  const [open, setOpen] = useState(false);
  const canOfferOwnership =
    canManageAccess &&
    isCampaignOwnerViewer &&
    member.role === 'WRITER' &&
    !member.isCampaignOwner;
  const canRemove =
    canManageAccess && !member.isCampaignOwner && member.role !== 'GAMEMASTER';

  if (!canOfferOwnership && !canRemove) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`More actions for ${member.name}`}
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-transparent text-muted hover:border-border/60 hover:bg-surface/60 hover:text-foreground disabled:opacity-50"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-border bg-surface p-1 shadow-lg"
            role="menu"
          >
            {canOfferOwnership ? (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface/80 disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onOfferOwnership(member);
                }}
              >
                Offer ownership
              </button>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onRemoveMember(member);
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MemberCharacterLink({
  campaignHandle,
  member,
  canEdit,
  busy,
  flatPages,
  characterPages,
  onMemberIdentityChange,
}: {
  campaignHandle: string;
  member: CampaignAccessMember;
  canEdit: boolean;
  busy: boolean;
  flatPages: WikiTreeNode[];
  characterPages: WikiTreeNode[];
  onMemberIdentityChange: (userId: string, identityPageId: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const linkedTitle = member.identityPageTitle?.trim() || null;
  const linked = Boolean(member.identityPageId && linkedTitle);
  const characterHref = member.identityPageId
    ? campaignWikiPath(campaignHandle, member.identityPageId, flatPages)
    : null;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {linked && characterHref ? (
          <Link
            to={characterHref}
            className="min-w-0 break-words text-sm text-foreground hover:underline"
          >
            {linkedTitle}
          </Link>
        ) : (
          <span className="text-sm text-muted">No character linked</span>
        )}
        {canEdit && !editing ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              {linked ? 'Change' : 'Link'}
            </button>
            {linked ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onMemberIdentityChange(member.userId, null)}
                className="text-xs font-medium text-muted hover:text-foreground hover:underline disabled:opacity-50"
              >
                Unlink
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {canEdit && editing ? (
        <div className="min-w-0 max-w-md">
          <IdentityPagePicker
            flatPages={flatPages}
            defaultOptions={characterPages}
            searchOptions={flatPages}
            placeholder="Search character pages…"
            clearLabel="No character linked"
            ariaLabel={`Link a character for ${member.name}`}
            value={member.identityPageId ?? null}
            disabled={busy}
            onChange={async (pageId) => {
              await onMemberIdentityChange(member.userId, pageId);
              setEditing(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function AccessMembersPanel({
  campaignHandle,
  members,
  accessLoading,
  accessError,
  canManageAccess,
  canManageMemberIdentity,
  currentUserId,
  updatingMemberId,
  updatingIdentityUserId,
  flatPages,
  characterPages,
  inviteHref,
  rolesHref,
  onMemberRoleChange,
  onMemberIdentityChange,
  onRemoveMember,
  onOfferOwnership,
}: AccessMembersPanelProps) {
  const memberCountLabel =
    members.length === 1 ? '1 member' : `${members.length} members`;
  const isCampaignOwnerViewer = members.some(
    (entry) => entry.userId === currentUserId && entry.isCampaignOwner,
  );

  return (
    <div className="rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-white">Members</h2>
            <p className="text-sm text-muted">{memberCountLabel}</p>
          </div>
          {canManageAccess ? (
            <p className="mt-1 text-xs text-muted">
              <Link to={rolesHref} className="font-medium text-primary hover:underline">
                Role capabilities
              </Link>
            </p>
          ) : null}
        </div>
        <Link
          to={inviteHref}
          className="inline-flex h-9 items-center rounded-md border border-border bg-elevated px-3 text-sm font-medium text-foreground hover:bg-surface"
        >
          Invite member
        </Link>
      </header>

      {accessError ? (
        <div className="mx-4 mb-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200 sm:mx-5">
          {accessError}
        </div>
      ) : null}

      {accessLoading ? (
        <p className="px-4 pb-5 text-sm text-muted sm:px-5" role="status">
          Loading members...
        </p>
      ) : members.length === 0 ? (
        <p className="px-4 pb-5 text-sm text-muted sm:px-5">No members yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {members.map((member) => {
            const busy = updatingMemberId === member.userId;
            const identityBusy = updatingIdentityUserId === member.userId;
            const canEditIdentity =
              canManageMemberIdentity || member.userId === currentUserId;
            const canChangeRole =
              canManageAccess && !member.isCampaignOwner && !busy;

            return (
              <li key={member.userId} className="px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <UserAvatar
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    userId={member.userId}
                    size="md"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 break-words text-sm font-semibold text-foreground">
                            {member.name}
                          </p>
                          {member.isCampaignOwner ? <OwnerCrown /> : null}
                        </div>
                        <p className="break-all text-xs text-muted">{member.email}</p>
                      </div>
                      <MemberOverflowMenu
                        member={member}
                        canManageAccess={canManageAccess}
                        isCampaignOwnerViewer={isCampaignOwnerViewer}
                        busy={busy}
                        onOfferOwnership={onOfferOwnership}
                        onRemoveMember={onRemoveMember}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 sm:max-w-[12rem]">
                        {canChangeRole ? (
                          <label className="block min-w-0">
                            <span className="sr-only">Role for {member.name}</span>
                            <select
                              value={member.role}
                              disabled={!canChangeRole}
                              onChange={(event) =>
                                onMemberRoleChange(
                                  member.userId,
                                  event.target.value as AccessRole,
                                )
                              }
                              className="h-9 w-full max-w-full rounded border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="GAMEMASTER">Game Master</option>
                              <option value="WRITER">Writer</option>
                              <option value="PARTICIPANT">Player</option>
                              <option value="OBSERVER">Observer</option>
                            </select>
                          </label>
                        ) : (
                          <p className="text-sm text-foreground">
                            {ROLE_LABELS[member.role]}
                          </p>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <MemberCharacterLink
                          campaignHandle={campaignHandle}
                          member={member}
                          canEdit={canEditIdentity}
                          busy={identityBusy}
                          flatPages={flatPages}
                          characterPages={characterPages}
                          onMemberIdentityChange={onMemberIdentityChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
