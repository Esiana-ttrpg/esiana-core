import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import {
  campaignDashboardPath,
  campaignSettingsPath,
  resolveCampaignLinkHandle,
} from '@/lib/campaignPaths';
import { CampaignMemberRoles } from '@/types/domain';
import type { UserProfileCampaign } from '@/types/user';
import { CampaignRoleBadge } from '@/components/campaign/CampaignMembershipList';
import { DeleteCampaignModal } from '@/components/campaign/DeleteCampaignModal';
import { ArchiveCampaignModal } from '@/components/campaign/ArchiveCampaignModal';
import { TransferOwnershipModal } from '@/components/campaign/TransferOwnershipModal';
import { DuplicateCampaignWizard } from '@/components/campaign/DuplicateCampaignWizard';

function formatCampaignJoined(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Joined: Unknown';
  const formatted = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `Joined: ${formatted}`;
}

interface CampaignManagementRowProps {
  campaign: UserProfileCampaign;
  onChanged: () => void;
}

export function CampaignManagementRow({ campaign, onChanged }: CampaignManagementRowProps) {
  const slug = resolveCampaignLinkHandle(campaign);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isDm = campaign.role === CampaignMemberRoles.GAMEMASTER;

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!menuRef.current?.contains(target)) setMenuOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function menuAction(action: () => void) {
    return () => {
      closeMenu();
      action();
    };
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/60 px-4 py-3">
        <Link
          to={campaignDashboardPath(slug)}
          className="min-w-0 flex-1 transition-colors hover:text-primary"
        >
          <p className="truncate font-medium text-foreground">
            {campaign.name}
            {campaign.isArchived ? (
              <span className="ml-2 text-xs font-normal text-muted">(Archived)</span>
            ) : null}
          </p>
          <p className="text-xs text-muted">{formatCampaignJoined(campaign.joinedAt)}</p>
          <p className="truncate text-xs text-muted">/campaigns/{campaign.handle}</p>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <CampaignRoleBadge role={campaign.role} />
          {isDm ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-foreground"
                aria-label="Campaign actions"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="size-5" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-lg border border-border bg-surface py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-elevated"
                    onClick={menuAction(() => navigate(campaignDashboardPath(slug)))}
                  >
                    Open Campaign
                  </button>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-elevated"
                    onClick={menuAction(() => navigate(campaignSettingsPath(slug)))}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-elevated"
                    onClick={menuAction(() => setDuplicateOpen(true))}
                  >
                    Duplicate Campaign…
                  </button>
                  {!campaign.isArchived ? (
                    <button
                      type="button"
                      className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-elevated"
                      onClick={menuAction(() => setArchiveOpen(true))}
                    >
                      Archive
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-elevated"
                    onClick={menuAction(() => setTransferOpen(true))}
                  >
                    Transfer Ownership
                  </button>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
                    onClick={menuAction(() => setDeleteOpen(true))}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isDm ? (
        <>
          <DuplicateCampaignWizard
            open={duplicateOpen}
            source={campaign}
            onClose={() => setDuplicateOpen(false)}
            onCreated={onChanged}
          />
          <ArchiveCampaignModal
            open={archiveOpen}
            campaignId={campaign.id}
            campaignName={campaign.name}
            onClose={() => setArchiveOpen(false)}
            onArchived={onChanged}
          />
          <TransferOwnershipModal
            open={transferOpen}
            campaignHandle={slug}
            campaignName={campaign.name}
            onClose={() => setTransferOpen(false)}
          />
          <DeleteCampaignModal
            open={deleteOpen}
            campaignId={campaign.id}
            campaignName={campaign.name}
            onClose={() => setDeleteOpen(false)}
            onDeleted={onChanged}
          />
        </>
      ) : null}
    </>
  );
}
