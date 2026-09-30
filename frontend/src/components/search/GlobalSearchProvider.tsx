import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalSearchOverlay } from '@/components/search/GlobalSearchOverlay';
import { CreatePageModal } from '@/components/CreatePageModal';
import { CreateSessionNoteDialog } from '@/components/session/CreateSessionNoteDialog';
import { SessionTimeAdvanceModal } from '@/components/session/SessionTimeAdvanceModal';
import { Toast } from '@/components/ui/Toast';
import { useWiki } from '@/contexts/WikiContext';
import { useActivePageOptional } from '@/contexts/ActivePageContext';
import { ensureCoreCommandProvidersRegistered } from '@/lib/commands';
import type {
  CommandAction,
  CreatePageCategoryTitle,
} from '@/lib/commands/types';
import {
  campaignNotesPath,
  resolveCanonicalPagePath,
} from '@/lib/campaignPaths';
import { fetchSessionNotesIndex } from '@/lib/wiki';
import { hasTimelineSessions } from '@/lib/sessionNotesIndex';
import { CampaignMemberRoles } from '@/types/domain';
import type { WikiTreeNode } from '@/types/wiki';

interface GlobalSearchContextValue {
  open: boolean;
  openSearch: () => void;
  openCommands: () => void;
  closeSearch: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  registerTrigger: (el: HTMLElement | null) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

type ActiveDialog =
  | { kind: 'create-page'; categoryTitle: CreatePageCategoryTitle }
  | { kind: 'session-note' }
  | { kind: 'advance-time' }
  | null;

function CommandActionHost({
  campaignHandle,
  dialog,
  onClearDialog,
  onToast,
  toastMessage,
  toastVisible,
}: {
  campaignHandle: string;
  dialog: ActiveDialog;
  onClearDialog: () => void;
  onToast: (message: string) => void;
  toastMessage: string;
  toastVisible: boolean;
}) {
  const navigate = useNavigate();
  const { campaign, flatPages, resolvePageId, refresh } = useWiki();
  const [hasSessions, setHasSessions] = useState(false);

  const canManageRole =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  useEffect(() => {
    if (dialog?.kind !== 'session-note') return;
    let cancelled = false;
    setHasSessions(false);
    void fetchSessionNotesIndex(campaignHandle)
      .then((payload) => {
        if (!cancelled) setHasSessions(hasTimelineSessions(payload));
      })
      .catch(() => {
        if (!cancelled) setHasSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialog, campaignHandle]);

  const createParentId =
    dialog?.kind === 'create-page'
      ? resolvePageId(dialog.categoryTitle)
      : undefined;

  function handleCreated(page: WikiTreeNode) {
    onClearDialog();
    void refresh();
    navigate(resolveCanonicalPagePath(campaignHandle, page, [...flatPages, page]));
  }

  return (
    <>
      {dialog?.kind === 'create-page' && createParentId ? (
        <CreatePageModal
          open
          campaignHandle={campaignHandle}
          parentId={createParentId}
          categoryTitle={dialog.categoryTitle}
          flatPages={flatPages}
          onClose={onClearDialog}
          onCreated={handleCreated}
        />
      ) : null}
      {dialog?.kind === 'session-note' ? (
        <CreateSessionNoteDialog
          open
          campaignHandle={campaignHandle}
          canManageRole={canManageRole}
          hasSessions={hasSessions}
          onClose={onClearDialog}
          onCreateNewSession={() => {
            onClearDialog();
            navigate(campaignNotesPath(campaignHandle));
          }}
        />
      ) : null}
      {dialog?.kind === 'advance-time' ? (
        <SessionTimeAdvanceModal
          open
          campaignHandle={campaignHandle}
          sessionDuration={campaign?.sessionDuration}
          onSkip={onClearDialog}
          onAdvanced={() => {
            onClearDialog();
            onToast('Campaign time advanced.');
          }}
          onClose={onClearDialog}
        />
      ) : null}
      <Toast message={toastMessage} visible={toastVisible} />
    </>
  );
}

export function GlobalSearchProvider({
  campaignHandle,
  campaignId,
  children,
}: {
  campaignHandle: string;
  campaignId?: string | null;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const activePage = useActivePageOptional();
  const { resolvePageId } = useWiki();
  const [open, setOpen] = useState(false);
  const [initialDraft, setInitialDraft] = useState('');
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    ensureCoreCommandProvidersRegistered();
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const openSearch = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
    setInitialDraft('');
    setOpen(true);
  }, []);

  const openCommands = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
    setInitialDraft('>');
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setInitialDraft('');
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  const registerTrigger = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el;
  }, []);

  const executeCommandAction = useCallback(
    (action: CommandAction) => {
      closeSearch();

      switch (action.type) {
        case 'navigate':
          navigate(action.href);
          return;
        case 'openDialog': {
          if (action.dialog.kind === 'create-page') {
            const parentId = resolvePageId(action.dialog.categoryTitle);
            if (!parentId) {
              showToast(`Cannot create ${action.dialog.categoryTitle}: category missing`);
              return;
            }
          }
          setDialog(action.dialog);
          return;
        }
        case 'page.enterEdit': {
          const snapshot = activePage?.snapshot;
          if (
            !snapshot ||
            snapshot.pageId !== action.pageId ||
            !snapshot.canEdit ||
            !activePage.enterEditMode
          ) {
            showToast('Unable to edit this page');
            return;
          }
          activePage.enterEditMode();
          return;
        }
        case 'copyLink': {
          const absolute = `${window.location.origin}${action.href}`;
          void navigator.clipboard.writeText(absolute).then(
            () => showToast(action.successMessage),
            () => showToast('Unable to copy link'),
          );
          return;
        }
        default: {
          const _exhaustive: never = action;
          void _exhaustive;
        }
      }
    },
    [activePage, closeSearch, navigate, resolvePageId, showToast],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'p'
      ) {
        event.preventDefault();
        openCommands();
        return;
      }
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch, openCommands]);

  const value = useMemo(
    () => ({
      open,
      openSearch,
      openCommands,
      closeSearch,
      triggerRef,
      registerTrigger,
    }),
    [open, openSearch, openCommands, closeSearch, registerTrigger],
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      {open ? (
        <GlobalSearchOverlay
          key={initialDraft === '>' ? 'commands' : 'search'}
          campaignHandle={campaignHandle}
          campaignId={campaignId ?? null}
          initialDraft={initialDraft}
          onClose={closeSearch}
          onExecuteCommand={executeCommandAction}
        />
      ) : null}
      <CommandActionHost
        campaignHandle={campaignHandle}
        dialog={dialog}
        onClearDialog={() => setDialog(null)}
        onToast={showToast}
        toastMessage={toastMessage}
        toastVisible={toastVisible}
      />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchContextValue {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  }
  return ctx;
}

/** Safe variant for header chrome that may render outside the provider in tests. */
export function useGlobalSearchOptional(): GlobalSearchContextValue | null {
  return useContext(GlobalSearchContext);
}
