import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchWikiTreePayload,
  flattenWikiTree,
  fetchPersonalPins,
} from '@/lib/wiki';
import { readCampaignHandle } from '@/lib/campaignPaths';
import { buildPageIdByTitle, normalizeNavTitle } from '@/lib/sidebarNav';
import {
  normalizeSidebarConfig,
  type SidebarConfig,
} from '@/lib/sidebarConfig';
import type { CampaignCapability } from '@shared/campaignPolicy/capabilities';
import type { CampaignActor } from '@shared/campaignPolicy/policy';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaignPolicy } from '@/hooks/useCampaignPolicy';
import type {
  WikiCampaignMeta,
  WikiPlayerEntry,
  WikiTreeNode,
  PageShortcut,
} from '@/types/wiki';
import { PLAYER_SESSION_NOTES_TITLE } from '@/types/wiki';
import { parseSystemCategoryKey } from '@/lib/wikiSystemCategory';

interface WikiContextValue {
  campaignHandle: string;
  tree: WikiTreeNode[];
  flatPages: WikiTreeNode[];
  pageIdByTitle: Map<string, string>;
  campaign: WikiCampaignMeta | null;
  players: WikiPlayerEntry[];
  playerSessionNotesFolderTitle: string;
  sessionPages: WikiTreeNode[];
  pinnedShortcuts: PageShortcut[];
  sidebarConfig: SidebarConfig;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  resolvePageId: (title: string) => string | undefined;
  resolvePageIdBySystemKey: (key: string) => string | undefined;
  /** Policy-derived affordances (replaces inline GM|Writer checks). */
  hasElevatedView: boolean;
  canManageWiki: boolean;
  can: (cap: CampaignCapability) => boolean;
  actor: CampaignActor | null;
}

const WikiContext = createContext<WikiContextValue | null>(null);

export function WikiProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ campaignHandle?: string; campaignId?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const { user } = useAuth();
  const [tree, setTree] = useState<WikiTreeNode[]>([]);
  const [campaign, setCampaign] = useState<WikiCampaignMeta | null>(null);
  const [players, setPlayers] = useState<WikiPlayerEntry[]>([]);
  const [playerSessionNotesFolderTitle, setPlayerSessionNotesFolderTitle] =
    useState(PLAYER_SESSION_NOTES_TITLE);
  const [pinnedShortcuts, setPinnedShortcuts] = useState<PageShortcut[]>([]);
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(() =>
    normalizeSidebarConfig(null),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!campaignHandle) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWikiTreePayload(campaignHandle);
      setTree(data.tree ?? []);
      setCampaign(data.campaign ?? null);
      setSidebarConfig(normalizeSidebarConfig(data.campaign?.sidebarConfig));
      setPlayers(data.players ?? []);
      setPlayerSessionNotesFolderTitle(
        data.playerSessionNotesFolderTitle ?? PLAYER_SESSION_NOTES_TITLE,
      );
      const pins = await fetchPersonalPins(campaignHandle);
      setPinnedShortcuts(pins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wiki');
      setTree([]);
      setCampaign(null);
      setPlayers([]);
      setPinnedShortcuts([]);
      setSidebarConfig(normalizeSidebarConfig(null));
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flatPages = useMemo(() => flattenWikiTree(tree), [tree]);

  const pageIdByTitle = useMemo(
    () => buildPageIdByTitle(flatPages),
    [flatPages],
  );

  const sessionPages = useMemo(() => {
    const rootId = pageIdByTitle.get(PLAYER_SESSION_NOTES_TITLE);
    if (!rootId) return [];
    for (const node of flatPages) {
      if (node.id === rootId) return node.children ?? [];
    }
    return [];
  }, [flatPages, pageIdByTitle]);

  const resolvePageId = useCallback(
    (title: string) =>
      pageIdByTitle.get(title) ??
      pageIdByTitle.get(normalizeNavTitle(title)),
    [pageIdByTitle],
  );

  const resolvePageIdBySystemKey = useCallback(
    (key: string) => {
      const needle = key.trim();
      if (!needle) return undefined;
      for (const page of flatPages) {
        if (parseSystemCategoryKey(page.metadata) === needle) {
          return page.id;
        }
      }
      return undefined;
    },
    [flatPages],
  );

  const policy = useCampaignPolicy(
    campaign?.campaignOwnerUserId
      ? {
          userId: user?.id,
          role: campaign.role,
          campaignOwnerUserId: campaign.campaignOwnerUserId,
          discoverability: campaign.discoverability,
          allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
          chronologyContributor: campaign.chronologyContributor,
          partyId: campaign.partyId,
          isCampaignOwner: campaign.isCampaignOwner,
        }
      : null,
  );

  const value = useMemo(
    () => ({
      campaignHandle,
      tree,
      flatPages,
      pageIdByTitle,
      campaign,
      players,
      playerSessionNotesFolderTitle,
      sessionPages,
      pinnedShortcuts,
      sidebarConfig,
      loading,
      error,
      refresh,
      resolvePageId,
      resolvePageIdBySystemKey,
      hasElevatedView: policy.hasElevatedView ?? false,
      canManageWiki: policy.canManageWiki ?? false,
      can: policy.can,
      actor: policy.actor,
    }),
    [
      campaignHandle,
      tree,
      flatPages,
      pageIdByTitle,
      campaign,
      players,
      playerSessionNotesFolderTitle,
      sessionPages,
      pinnedShortcuts,
      sidebarConfig,
      loading,
      error,
      refresh,
      resolvePageId,
      resolvePageIdBySystemKey,
      policy.hasElevatedView,
      policy.canManageWiki,
      policy.can,
      policy.actor,
    ],
  );

  return <WikiContext.Provider value={value}>{children}</WikiContext.Provider>;
}

export function useWiki(): WikiContextValue {
  const ctx = useContext(WikiContext);
  if (!ctx) {
    throw new Error('useWiki must be used within WikiProvider');
  }
  return ctx;
}

/** Campaign wiki context when inside WikiProvider; null on admin/global routes. */
export function useOptionalWiki(): WikiContextValue | null {
  return useContext(WikiContext);
}
