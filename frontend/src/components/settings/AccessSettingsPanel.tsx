import { useCallback, useRef, type KeyboardEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  ACCESS_INVITE_MEMBERS_HASH,
  campaignAccessSectionHref,
  parseCampaignAccessSection,
  type CampaignAccessSection,
} from '@/lib/campaignSettingsNavigation';
import { CollaborationPermissionsPanel } from '@/components/settings/CollaborationPermissionsPanel';
import {
  AccessMembersPanel,
  type AccessRole,
  type CampaignAccessMember,
} from '@/components/settings/AccessMembersPanel';
import { AccessSharingInvites } from '@/components/settings/AccessSharingInvites';
import type { CampaignDiscoverabilityValue } from '@shared/campaignPolicy/discoverability';
import type { WikiTreeNode } from '@/types/wiki';

export type { AccessRole, CampaignAccessMember };

interface AccessInviteLink {
  inviteUrl: string;
  inviteToken: string;
  loading: boolean;
  error: string;
  copiedInvite: boolean;
  emailAvailable: boolean;
  sendInviteEmail: (email: string) => Promise<{ ok: boolean; error?: string; to?: string }>;
}

interface AccessSettingsPanelProps {
  campaignHandle: string;
  members: CampaignAccessMember[];
  accessLoading: boolean;
  accessError: string;
  discoverability: CampaignDiscoverabilityValue;
  canManageAccess: boolean;
  policyReady?: boolean;
  canEditPublicAccess: boolean;
  canManageMemberIdentity: boolean;
  currentUserId?: string;
  inviteLink: AccessInviteLink;
  rotatingInvite: boolean;
  updatingMemberId: string | null;
  updatingIdentityUserId: string | null;
  flatPages: WikiTreeNode[];
  characterPages: WikiTreeNode[];
  onDiscoverabilityChanged: (next: CampaignDiscoverabilityValue) => void;
  onCopyInviteUrl: () => void;
  onRotateInvite: () => void;
  onMemberRoleChange: (userId: string, role: AccessRole) => void;
  onMemberIdentityChange: (userId: string, identityPageId: string | null) => Promise<void>;
  onRemoveMember: (member: CampaignAccessMember) => void;
  onOfferOwnership: (member: CampaignAccessMember) => void;
  onPermissionsSaved: () => void;
}

const ACCESS_TABS: Array<{ id: CampaignAccessSection; label: string }> = [
  { id: 'members', label: 'Members' },
  { id: 'sharing', label: 'Sharing & Invites' },
  { id: 'roles', label: 'Role Capabilities' },
];

function accessTabId(section: CampaignAccessSection): string {
  return `access-section-tab-${section}`;
}

function accessPanelId(section: CampaignAccessSection): string {
  return `access-section-panel-${section}`;
}

function AccessSectionTabs({
  campaignHandle,
  canManageAccess,
  policyReady,
  activeSection,
}: {
  campaignHandle: string;
  canManageAccess: boolean;
  policyReady: boolean;
  activeSection: CampaignAccessSection;
}) {
  const [searchParams] = useSearchParams();
  const tabRefs = useRef<Map<CampaignAccessSection, HTMLAnchorElement>>(new Map());
  const tabs = ACCESS_TABS.filter(
    (tab) => tab.id !== 'roles' || !policyReady || canManageAccess,
  );

  const focusTab = useCallback((id: CampaignAccessSection) => {
    tabRefs.current.get(id)?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (tabs.length <= 1) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    if (!next) return;
    tabRefs.current.get(next.id)?.click();
    requestAnimationFrame(() => focusTab(next.id));
  }

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-border pb-px"
      role="tablist"
      aria-label="Access"
    >
      {tabs.map((tab, index) => {
        const selected = activeSection === tab.id;
        return (
          <Link
            key={tab.id}
            id={accessTabId(tab.id)}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.id, node);
              else tabRefs.current.delete(tab.id);
            }}
            to={campaignAccessSectionHref(campaignHandle, searchParams, tab.id)}
            role="tab"
            aria-selected={selected}
            aria-controls={accessPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:bg-elevated/60 hover:text-foreground'
            }`}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AccessSettingsPanel({
  campaignHandle,
  members,
  accessLoading,
  accessError,
  discoverability,
  canManageAccess,
  policyReady = true,
  canEditPublicAccess,
  canManageMemberIdentity,
  currentUserId,
  inviteLink,
  rotatingInvite,
  updatingMemberId,
  updatingIdentityUserId,
  flatPages,
  characterPages,
  onDiscoverabilityChanged,
  onCopyInviteUrl,
  onRotateInvite,
  onMemberRoleChange,
  onMemberIdentityChange,
  onRemoveMember,
  onOfferOwnership,
  onPermissionsSaved,
}: AccessSettingsPanelProps) {
  const [searchParams] = useSearchParams();
  const requestedSection = parseCampaignAccessSection(searchParams.get('section'));
  const activeSection =
    requestedSection === 'roles' && policyReady && !canManageAccess
      ? 'members'
      : requestedSection;
  const rolesHref = campaignAccessSectionHref(campaignHandle, searchParams, 'roles');
  const inviteHref = campaignAccessSectionHref(
    campaignHandle,
    searchParams,
    'sharing',
    ACCESS_INVITE_MEMBERS_HASH,
  );

  if (requestedSection === 'roles' && policyReady && !canManageAccess) {
    return (
      <Navigate
        to={campaignAccessSectionHref(campaignHandle, searchParams, 'members')}
        replace
      />
    );
  }

  return (
    <div className="space-y-5">
      <AccessSectionTabs
        campaignHandle={campaignHandle}
        canManageAccess={canManageAccess}
        policyReady={policyReady}
        activeSection={activeSection}
      />

      {activeSection === 'members' ? (
        <div
          id={accessPanelId('members')}
          role="tabpanel"
          aria-labelledby={accessTabId('members')}
        >
          <AccessMembersPanel
            campaignHandle={campaignHandle}
            members={members}
            accessLoading={accessLoading}
            accessError={accessError}
            canManageAccess={canManageAccess}
            canManageMemberIdentity={canManageMemberIdentity}
            currentUserId={currentUserId}
            updatingMemberId={updatingMemberId}
            updatingIdentityUserId={updatingIdentityUserId}
            flatPages={flatPages}
            characterPages={characterPages}
            inviteHref={inviteHref}
            rolesHref={rolesHref}
            onMemberRoleChange={onMemberRoleChange}
            onMemberIdentityChange={onMemberIdentityChange}
            onRemoveMember={onRemoveMember}
            onOfferOwnership={onOfferOwnership}
          />
        </div>
      ) : null}

      {activeSection === 'sharing' ? (
        <div
          id={accessPanelId('sharing')}
          role="tabpanel"
          aria-labelledby={accessTabId('sharing')}
        >
          <AccessSharingInvites
            campaignHandle={campaignHandle}
            discoverability={discoverability}
            canManageAccess={canManageAccess}
            canEditPublicAccess={canEditPublicAccess}
            accessError={accessError}
            accessLoading={accessLoading}
            inviteLink={inviteLink}
            rotatingInvite={rotatingInvite}
            onDiscoverabilityChanged={onDiscoverabilityChanged}
            onCopyInviteUrl={onCopyInviteUrl}
            onRotateInvite={onRotateInvite}
          />
        </div>
      ) : null}

      {activeSection === 'roles' && canManageAccess ? (
        <div
          id={accessPanelId('roles')}
          role="tabpanel"
          aria-labelledby={accessTabId('roles')}
          className="rounded-lg border border-border bg-surface p-6"
        >
          <h2 className="text-lg font-semibold text-white">Role capabilities</h2>
          <p className="mt-1 text-sm text-muted">
            Manage what each campaign role can access and change. View as Player
            or Public only remaps visibility in the campaign workspace — it does
            not impersonate accounts or change write capabilities.
          </p>
          <div className="mt-4">
            <CollaborationPermissionsPanel
              campaignHandle={campaignHandle}
              canManage={canManageAccess}
              onSaved={onPermissionsSaved}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
