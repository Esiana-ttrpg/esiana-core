import { Router } from 'express';
import {
  advanceCampaignTime,
  getCampaign,
  getCampaignTimeTracking,
  importCalendarFromJson,
  previewFantasyCalendarImport,
} from '../controllers/campaignsController.js';
import {
  batchWikiPageNarrativeStatus,
  getWikiPageNarrativeStatus,
  patchWikiPageNarrativeStatus,
} from '../controllers/pageNarrativeStatusController.js';
import {
  bulkMoveWikiPages,
  bulkDeleteSessionNotes,
  assignWikiPageNotebookArc,
  compileSessionNotes,
  createNotebookArc,
  createNewSessionTimeline,
  createWikiPage,
  deleteNotebookArc,
  deleteWikiPage,
  deleteSessionNotePage,
  getWikiPageDeletePreview,
  getSessionNotesIndex,
  getSessionNotePerspectives,
  getCombinedSessionNotes,
  ensureSessionAuthorNote,
  getSessionTimelinePoint,
  getPersonalPins,
  getCategoryIndex,
  getQuestHubBySystemKey,
  getQuestHubIndex,
  getThreadHubBySystemKey,
  getThreadHubIndex,
  getTagsHub,
  listCampaignWikiTags,
  patchWikiTag,
  uploadWikiTagIcon,
  getPlayerSessionSummary,
  getWikiPage,
  getWikiPageByWorkspacePath,
  getWikiTree,
  getWikiBacklinks,
  getWikiOutlinks,
  getWikiLinkIntegrity,
  togglePinnedPageShortcut,
  previewCreatePageMarkdownImport,
} from '../controllers/wikiController.js';
import {
  createWikiPageAlias,
  deleteWikiPageAlias,
  getUnresolvedWikilinks,
  getWikiContinuitySummary,
  getWikiPageContinuity,
  getMentionTargets,
  getWikiLinkIndex,
  getWikiPagePreview,
  getMentionSnippet,
  getWorldActivitySummary,
  getWritingPulse,
  ignoreUnresolvedWikilink,
  listWikiPageAliases,
  mergeUnresolvedWikilinks,
} from '../controllers/wikiLoreGraphController.js';
import {
  getEntityGraph,
  getEntityGraphProjection,
  getEntityGraphDiagnostics,
  rebuildCampaignEntityGraph,
} from '../controllers/entityGraphController.js';
import {
  getInterpretationsBundle,
  getInterpretiveSummary,
  getLoreClaims,
  getPartyKnowledge,
  listEntityHistoricalAliases,
  patchEntityHistoricalAlias,
  patchInterpretationAccount,
  patchInterpretationGroup,
  patchLoreClaim,
  postEntityHistoricalAlias,
  postInterpretationAccount,
  postInterpretationGroup,
  postLoreClaim,
  removeEntityHistoricalAlias,
  removeInterpretationAccount,
  removeInterpretationGroup,
  removeLoreClaim,
} from '../controllers/loreKnowledgeController.js';
import {
  uploadSessionNotePage,
  updateSessionNotePage,
  updateNotebookArc,
  updateWikiPage,
  updateWikiPageLayout,
  updateWikiPageVisibility,
  updateWikiPageMetadata,
  transformWikiPage,
} from '../controllers/wikiController.js';
import {
  getAdventureHubBySystemKey,
  getAdventureHubIndex,
  getStoryboardLayout,
  patchStoryboardLayout,
} from '../controllers/adventureHubController.js';
import {
  getDowntimeHubBySystemKey,
  getDowntimeHubIndex,
} from '../controllers/downtimeHubController.js';
import {
  createDowntimeProjectHandler,
  deleteDowntimeProjectHandler,
  getDowntimeProjectByWikiPageHandler,
  getDowntimeProjectHandler,
  getDowntimeProjectOverviewHandler,
  listDowntimeProjectsHandler,
  updateDowntimeProjectHandler,
} from '../controllers/downtimeProjectController.js';
import {
  createDowntimeHavenHandler,
  deleteDowntimeHavenHandler,
  getDowntimeHavenHandler,
  getDowntimeHavenByWikiPageHandler,
  getDowntimeHavenOverviewHandler,
  listDowntimeHavensHandler,
  updateDowntimeHavenHandler,
} from '../controllers/downtimeHavenController.js';
import { putDowntimeGapOverlay } from '../controllers/downtimeGapOverlayController.js';
import {
  acceptLedgerSuggestionHandler,
  createLedgerEntryHandler,
  deleteLedgerEntryHandler,
  dismissLedgerSuggestionHandler,
  getCampaignLedgerHandler,
  getLedgerEntryHandler,
  listLedgerSuggestionsHandler,
  patchCampaignLedgerHandler,
  patchLedgerEntryHandler,
} from '../controllers/campaignLedgerController.js';
import {
  createScheduledEffectHandler,
  deleteScheduledEffectHandler,
  listScheduledEffectOccurrencesHandler,
  listScheduledEffectsHandler,
  patchScheduledEffectHandler,
} from '../controllers/scheduledEffectController.js';
import {
  acceptReputationSuggestionHandler,
  dismissReputationSuggestionHandler,
  listReputationSuggestionsHandler,
} from '../controllers/campaignReputationController.js';
import {
  acceptWorldEventSuggestionHandler,
  dismissWorldEventSuggestionHandler,
  listWorldEventSuggestionsHandler,
} from '../controllers/worldEventSuggestionController.js';
import {
  getWorldDevelopmentSettingsHandler,
  putWorldDevelopmentSettingsHandler,
  listPendingDevelopmentsHandler,
  listDevelopmentHistoryHandler,
  resolveDevelopmentSuggestionHandler,
  suggestOnDemandDevelopmentsHandler,
  requeueArchivedDevelopmentHandler,
} from '../controllers/worldDevelopmentController.js';
import {
  getCampaignMomentumHandler,
  getPacingSimulationRunsHandler,
  getWorldPressureHandler,
  getWorldPressurePreviewHandler,
  putCampaignMomentumHandler,
} from '../controllers/campaignMomentumController.js';
import { getCharacterHubIndex } from '../controllers/characterHubController.js';
import {
  deleteCampaignAsset,
  importCampaignImageFromUrl,
  listCampaignAssets,
  uploadCampaignImage,
} from '../controllers/uploadsController.js';
import {
  bindWikiPageMapAsset,
  createMapPin,
  deleteMapPin,
  getCampaignMap,
  getMapPinPreview,
  linkMapToWikiPage,
  listCampaignMaps,
  listMapPins,
  updateCampaignMap,
  updateMapPin,
} from '../controllers/mapsController.js';
import {
  batchRevealMapObjects,
  confirmMapFlowOverlay,
  createMapLayer,
  createMapObjectGroup,
  createMapObjectKeyframe,
  createMapPresentationPreset,
  createMapSceneObject,
  listMapObjectKeyframes,
  deleteMapLayer,
  deleteMapObjectGroup,
  deleteMapObjectKeyframe,
  deleteMapPresentationPreset,
  deleteMapSceneObject,
  getMapScene,
  getWikiPageMapObjectImpact,
  listMapLayers,
  listMapObjectGroups,
  listMapPresentationPresetsHandler,
  updateMapLayer,
  updateMapObjectGroup,
  updateMapPresentationPreset,
  updateMapSceneObject,
} from '../controllers/mapSceneController.js';
import {
  createFantasyCalendar,
  deleteFantasyCalendar,
  exportFantasyCalendarJson,
  listFantasyCalendars,
  updateFantasyCalendar,
} from '../controllers/fantasyCalendarController.js';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from '../controllers/calendarEventsController.js';
import {
  getEventConsequences,
  postApplyEventConsequences,
  putEventConsequences,
} from '../controllers/eventConsequenceController.js';
import {
  getChronologyOverlayBundle,
  getChronologyTimelineBundle,
} from '../controllers/chronologyController.js';
import {
  compareNarrativeSnapshots,
  getLatestLocationVisit,
  getLocationVisitSuggestions,
  getMilestoneSnapshot,
  getSinceLastVisit,
  listMilestoneSnapshots,
  postDismissVisitSuggestion,
  postLocationVisit,
  postMilestoneSnapshot,
  postPromoteVisitSuggestion,
} from '../controllers/narrativeSnapshotController.js';
import {
  getClaimCirculations,
  getFactionGossip,
  getLocationRumors,
  postRumorRetract,
  postRumorSpread,
} from '../controllers/rumorEngineController.js';
import {
  getWorldAdvanceBatchById,
  getWorldAdvanceBatches,
  postWorldAdvanceApply,
  postWorldAdvancePreview,
} from '../controllers/worldAdvanceController.js';
import {
  createCalendarEventCategory,
  deleteCalendarEventCategory,
  listCalendarEventCategories,
  updateCalendarEventCategory,
} from '../controllers/calendarEventCategoriesController.js';
import {
  getCampaignStatus,
  getCampaignCapacityHint,
  getCampaignFiles,
  updateCampaignSidebar,
  uploadCampaignSidebarSectionIcon,
} from '../controllers/campaignSettings.js';
import {
  getDashboardBundle,
  updateDashboardLayout,
} from '../controllers/dashboardController.js';
import { getVisualAtlas } from '../controllers/visualAtlasController.js';
import {
  getEnsembleBundle,
  updateEnsembleConfig,
} from '../controllers/ensembleController.js';
import {
  listCampaignJoinRequests,
  respondToJoinRequest,
} from '../controllers/recruitmentController.js';
import { listCampaignActivity } from '../controllers/campaignActivityController.js';
import {
  getCampaignGrowthMetrics,
  postWritingSession,
} from '../controllers/authoringController.js';
import { getCampaignWorldStats } from '../controllers/statsController.js';
import {
  createWorkshopDraftHandler,
  formalizeWorkshopDraftHandler,
  getWorkshopDraftHandler,
  listWorkshopDraftsHandler,
  patchWorkshopDraftHandler,
} from '../controllers/workshopDraftController.js';
import {
  listNarrativeLifecycleStates,
  patchNarrativeLifecycleState,
  rebuildNarrativeLifecycle,
} from '../controllers/narrativeLifecycleController.js';
import {
  resolveQuestTimePressure,
  touchQuestTimePressureManual,
} from '../controllers/questTimePressureController.js';
import {
  getNarrativeBranch,
  patchNarrativeBranch,
} from '../controllers/narrativeBranchController.js';
import {
  getCreativeDrift,
  patchCreativeDriftDisposition,
} from '../controllers/creativeDriftController.js';
import {
  previewQuestPublish,
  publishQuest,
} from '../controllers/narrativePublishController.js';
import { documentUpload, imageUpload, sidebarIconUpload, tagIconUpload, campaignWizardUpload } from '../lib/multer.js';
import { enforceSystemUploadLimit, enforceWizardUploadLimits } from '../middleware/uploadLimit.js';
import { campaignInviteEmailLimiter, campaignUrlImportLimiter } from '../middleware/rateLimit.js';
import {
  campaignScopeMiddleware,
  requireCampaignMember,
  requireCampaignMembership,
  requireCampaignOwner,
  requireChronologyManager,
  requireGamemasterSettings,
  requireNonObserverMember,
  requireQuestEdit,
  requireThreadEdit,
  requireNotesModerate,
  requireMapsEdit,
  requireAssetsUpload,
  requireAssetsDeleteAny,
  requireRumorModerate,
  requireDiscoveryReveal,
  requireDowntimeManage,
  requirePageVisibilityEdit,
  requirePageEditAny,
  requireAdventureStoryboardEdit,
} from '../middleware/campaignScope.js';
import {
  getCampaignInvite,
  listCampaignMembers,
  listCampaignCapabilityOverrides,
  removeCampaignMember,
  rotateCampaignInvite,
  saveCampaignCapabilityOverrides,
  sendCampaignInviteEmail,
  updateCampaignMemberIdentity,
  updateCampaignMemberRole,
} from '../controllers/campaignAccessController.js';
import {
  downloadCampaignBackup,
  downloadCampaignExportAsset,
  restoreCampaignBackup,
  startAsyncCampaignBackup,
} from '../controllers/campaignBackupController.js';
import {
  getSessionSchedule,
  patchSessionSchedule,
  publishSessionSchedule,
  getNextPublishedSession,
  getMySessionAttendance,
  patchMySessionAttendance,
  listSessionAttendance,
} from '../controllers/sessionScheduleController.js';
import {
  acceptOwnershipTransfer,
  cancelOwnershipTransfer,
  declineOwnershipTransfer,
  getOwnershipTransferStatus,
  initiateOwnershipTransfer,
} from '../controllers/ownershipTransferController.js';
import {
  bulkRevealContentPresence,
  previewRevealImpact,
} from '../controllers/contentPresenceController.js';
import {
  leaveCampaign,
  transferGamemaster,
} from '../controllers/campaignAccessController.js';

export const campaignScopedRouter = Router({ mergeParams: true });

campaignScopedRouter.use(campaignScopeMiddleware);
campaignScopedRouter.use(requireCampaignMembership);

campaignScopedRouter.get('/', getCampaign);
campaignScopedRouter.get('/members', listCampaignMembers);
campaignScopedRouter.get(
  '/capability-overrides',
  requireCampaignOwner,
  listCampaignCapabilityOverrides,
);
campaignScopedRouter.put(
  '/capability-overrides',
  requireCampaignOwner,
  saveCampaignCapabilityOverrides,
);
campaignScopedRouter.patch(
  '/members/:userId/identity',
  updateCampaignMemberIdentity,
);
campaignScopedRouter.post(
  '/transfer-gamemaster',
  requireGamemasterSettings,
  transferGamemaster,
);
campaignScopedRouter.patch(
  '/members/:userId',
  requireCampaignOwner,
  updateCampaignMemberRole,
);
campaignScopedRouter.delete(
  '/members/:userId',
  requireCampaignOwner,
  removeCampaignMember,
);
campaignScopedRouter.delete('/members/me', leaveCampaign);
campaignScopedRouter.get('/invite', requireGamemasterSettings, getCampaignInvite);
campaignScopedRouter.post('/invite/rotate', requireGamemasterSettings, rotateCampaignInvite);
campaignScopedRouter.post(
  '/invite/send',
  requireGamemasterSettings,
  campaignInviteEmailLimiter,
  sendCampaignInviteEmail,
);

campaignScopedRouter.get('/activity', listCampaignActivity);

campaignScopedRouter.get('/time-tracking', getCampaignTimeTracking);
campaignScopedRouter.get('/chronology/timeline', getChronologyTimelineBundle);
campaignScopedRouter.get('/chronology/overlay', getChronologyOverlayBundle);
campaignScopedRouter.post(
  '/locations/:pageId/visits',
  requireChronologyManager,
  postLocationVisit,
);
campaignScopedRouter.get('/locations/:pageId/visits/latest', getLatestLocationVisit);
campaignScopedRouter.get('/locations/:pageId/since-last-visit', getSinceLastVisit);
campaignScopedRouter.get('/locations/:pageId/rumors', getLocationRumors);
campaignScopedRouter.get('/wiki/:pageId/gossip', getFactionGossip);
campaignScopedRouter.post('/rumors/spread', requireRumorModerate, postRumorSpread);
campaignScopedRouter.post(
  '/world-state/preview',
  requireChronologyManager,
  postWorldAdvancePreview,
);
campaignScopedRouter.post(
  '/world-state/apply',
  requireChronologyManager,
  postWorldAdvanceApply,
);
campaignScopedRouter.get(
  '/world-state/batches',
  requireChronologyManager,
  getWorldAdvanceBatches,
);
campaignScopedRouter.get(
  '/world-state/batches/:eventId',
  requireChronologyManager,
  getWorldAdvanceBatchById,
);
campaignScopedRouter.post('/rumors/retract', requireRumorModerate, postRumorRetract);
campaignScopedRouter.get(
  '/lore-claims/:claimId/circulations',
  requireDiscoveryReveal,
  getClaimCirculations,
);
campaignScopedRouter.get(
  '/locations/:pageId/visit-suggestions',
  requireGamemasterSettings,
  getLocationVisitSuggestions,
);
campaignScopedRouter.post(
  '/locations/:pageId/visit-suggestions/:suggestionId/promote',
  requireChronologyManager,
  postPromoteVisitSuggestion,
);
campaignScopedRouter.post(
  '/locations/:pageId/visit-suggestions/:suggestionId/dismiss',
  requireGamemasterSettings,
  postDismissVisitSuggestion,
);
campaignScopedRouter.post(
  '/narrative-snapshots',
  requireGamemasterSettings,
  postMilestoneSnapshot,
);
campaignScopedRouter.get('/narrative-snapshots', listMilestoneSnapshots);
campaignScopedRouter.get(
  '/narrative-snapshots/compare',
  compareNarrativeSnapshots,
);
campaignScopedRouter.get('/narrative-snapshots/:snapshotId', getMilestoneSnapshot);
campaignScopedRouter.get('/chronology/categories', listCalendarEventCategories);
campaignScopedRouter.post(
  '/chronology/categories',
  requireChronologyManager,
  createCalendarEventCategory,
);
campaignScopedRouter.patch(
  '/chronology/categories/:categoryId',
  requireChronologyManager,
  updateCalendarEventCategory,
);
campaignScopedRouter.delete(
  '/chronology/categories/:categoryId',
  requireChronologyManager,
  deleteCalendarEventCategory,
);

campaignScopedRouter.patch(
  '/time-tracking/advance',
  requireChronologyManager,
  advanceCampaignTime,
);

campaignScopedRouter.post(
  '/chronology/import-preview',
  requireCampaignMember,
  previewFantasyCalendarImport,
);

campaignScopedRouter.post(
  '/time-tracking/import-json',
  requireChronologyManager,
  importCalendarFromJson,
);

campaignScopedRouter.get('/calendars', listFantasyCalendars);
campaignScopedRouter.get(
  '/calendars/:calendarId/fantasy-calendar-export',
  requireChronologyManager,
  exportFantasyCalendarJson,
);
campaignScopedRouter.post('/calendars', requireChronologyManager, createFantasyCalendar);
campaignScopedRouter.patch(
  '/calendars/:calendarId',
  requireChronologyManager,
  updateFantasyCalendar,
);
campaignScopedRouter.delete(
  '/calendars/:calendarId',
  requireChronologyManager,
  deleteFantasyCalendar,
);
campaignScopedRouter.get('/calendars/:calendarId/events', listCalendarEvents);
campaignScopedRouter.post(
  '/calendars/:calendarId/events',
  requireChronologyManager,
  createCalendarEvent,
);
campaignScopedRouter.patch(
  '/calendars/:calendarId/events/:eventId',
  requireChronologyManager,
  updateCalendarEvent,
);
campaignScopedRouter.delete(
  '/calendars/:calendarId/events/:eventId',
  requireChronologyManager,
  deleteCalendarEvent,
);

campaignScopedRouter.get(
  '/calendar-events/:eventId/consequences',
  requireChronologyManager,
  getEventConsequences,
);
campaignScopedRouter.put(
  '/calendar-events/:eventId/consequences',
  requireChronologyManager,
  putEventConsequences,
);
campaignScopedRouter.post(
  '/calendar-events/:eventId/apply-consequences',
  requireChronologyManager,
  postApplyEventConsequences,
);

campaignScopedRouter.get('/wiki/tree', getWikiTree);

campaignScopedRouter.get('/wiki/pins', getPersonalPins);

campaignScopedRouter.get('/wiki/index/:pageId', getCategoryIndex);
campaignScopedRouter.get('/wiki/character-hub/:pageId', getCharacterHubIndex);

campaignScopedRouter.get('/wiki/quests-hub', getQuestHubBySystemKey);
campaignScopedRouter.get('/wiki/quests-hub/:pageId', getQuestHubIndex);
campaignScopedRouter.get('/wiki/adventure-hub', getAdventureHubBySystemKey);
campaignScopedRouter.get('/wiki/adventure-hub/:pageId', getAdventureHubIndex);
campaignScopedRouter.get('/wiki/downtime-hub', getDowntimeHubBySystemKey);
campaignScopedRouter.get('/wiki/downtime-hub/:pageId', getDowntimeHubIndex);
campaignScopedRouter.put(
  '/downtime/gap-overlays/:gapId',
  requireChronologyManager,
  putDowntimeGapOverlay,
);
campaignScopedRouter.get('/downtime/projects', listDowntimeProjectsHandler);
campaignScopedRouter.get(
  '/downtime/projects/by-wiki/:wikiPageId',
  getDowntimeProjectByWikiPageHandler,
);
campaignScopedRouter.get('/downtime/projects/:id/overview', getDowntimeProjectOverviewHandler);
campaignScopedRouter.get('/downtime/projects/:id', getDowntimeProjectHandler);
campaignScopedRouter.post(
  '/downtime/projects',
  requireDowntimeManage,
  createDowntimeProjectHandler,
);
campaignScopedRouter.patch(
  '/downtime/projects/:id',
  requireDowntimeManage,
  updateDowntimeProjectHandler,
);
campaignScopedRouter.delete(
  '/downtime/projects/:id',
  requireDowntimeManage,
  deleteDowntimeProjectHandler,
);
campaignScopedRouter.get('/downtime/havens', listDowntimeHavensHandler);
campaignScopedRouter.get('/downtime/havens/by-wiki/:wikiPageId', getDowntimeHavenByWikiPageHandler);
campaignScopedRouter.get('/downtime/havens/:id', getDowntimeHavenHandler);
campaignScopedRouter.get('/downtime/havens/:id/overview', getDowntimeHavenOverviewHandler);
campaignScopedRouter.post(
  '/downtime/havens',
  requireDowntimeManage,
  createDowntimeHavenHandler,
);
campaignScopedRouter.patch(
  '/downtime/havens/:id',
  requireDowntimeManage,
  updateDowntimeHavenHandler,
);
campaignScopedRouter.delete(
  '/downtime/havens/:id',
  requireDowntimeManage,
  deleteDowntimeHavenHandler,
);
campaignScopedRouter.get('/downtime/ledger', getCampaignLedgerHandler);
campaignScopedRouter.get('/downtime/ledger/suggestions', listLedgerSuggestionsHandler);
campaignScopedRouter.post(
  '/downtime/ledger/suggestions/:id/accept',
  acceptLedgerSuggestionHandler,
);
campaignScopedRouter.post(
  '/downtime/ledger/suggestions/:id/dismiss',
  dismissLedgerSuggestionHandler,
);
campaignScopedRouter.patch(
  '/downtime/ledger',
  requireDowntimeManage,
  patchCampaignLedgerHandler,
);
campaignScopedRouter.get('/downtime/ledger/entries/:id', getLedgerEntryHandler);
campaignScopedRouter.post('/downtime/ledger/entries', createLedgerEntryHandler);
campaignScopedRouter.patch('/downtime/ledger/entries/:id', patchLedgerEntryHandler);
campaignScopedRouter.delete('/downtime/ledger/entries/:id', deleteLedgerEntryHandler);
campaignScopedRouter.get('/downtime/scheduled-effects', listScheduledEffectsHandler);
campaignScopedRouter.post(
  '/downtime/scheduled-effects',
  requireDowntimeManage,
  createScheduledEffectHandler,
);
campaignScopedRouter.patch(
  '/downtime/scheduled-effects/:id',
  requireDowntimeManage,
  patchScheduledEffectHandler,
);
campaignScopedRouter.delete(
  '/downtime/scheduled-effects/:id',
  requireDowntimeManage,
  deleteScheduledEffectHandler,
);
campaignScopedRouter.get(
  '/downtime/scheduled-effects/:id/occurrences',
  requireDowntimeManage,
  listScheduledEffectOccurrencesHandler,
);
campaignScopedRouter.get('/downtime/reputation/suggestions', listReputationSuggestionsHandler);
campaignScopedRouter.post(
  '/downtime/reputation/suggestions/:id/accept',
  acceptReputationSuggestionHandler,
);
campaignScopedRouter.post(
  '/downtime/reputation/suggestions/:id/dismiss',
  dismissReputationSuggestionHandler,
);
campaignScopedRouter.get('/downtime/world-events/suggestions', listWorldEventSuggestionsHandler);
campaignScopedRouter.post(
  '/downtime/world-events/suggestions/:id/accept',
  acceptWorldEventSuggestionHandler,
);
campaignScopedRouter.post(
  '/downtime/world-events/suggestions/:id/dismiss',
  dismissWorldEventSuggestionHandler,
);
campaignScopedRouter.get('/world-development/settings', getWorldDevelopmentSettingsHandler);
campaignScopedRouter.put('/world-development/settings', putWorldDevelopmentSettingsHandler);
campaignScopedRouter.get('/world-development/pending', listPendingDevelopmentsHandler);
campaignScopedRouter.get('/world-development/history', requireGamemasterSettings, listDevelopmentHistoryHandler);
campaignScopedRouter.post('/world-development/suggest', suggestOnDemandDevelopmentsHandler);
campaignScopedRouter.post(
  '/world-development/suggestions/:id/resolve',
  resolveDevelopmentSuggestionHandler,
);
campaignScopedRouter.post(
  '/world-development/suggestions/:id/requeue',
  requeueArchivedDevelopmentHandler,
);
campaignScopedRouter.get('/momentum', getCampaignMomentumHandler);
campaignScopedRouter.put('/momentum', putCampaignMomentumHandler);

campaignScopedRouter.get(
  '/authoring/growth-metrics',
  requirePageEditAny,
  getCampaignGrowthMetrics,
);
campaignScopedRouter.post(
  '/authoring/writing-session',
  requirePageEditAny,
  postWritingSession,
);
campaignScopedRouter.get(
  '/workshop/drafts',
  requirePageEditAny,
  listWorkshopDraftsHandler,
);
campaignScopedRouter.post(
  '/workshop/drafts',
  requirePageEditAny,
  createWorkshopDraftHandler,
);
campaignScopedRouter.get(
  '/workshop/drafts/:draftId',
  requirePageEditAny,
  getWorkshopDraftHandler,
);
campaignScopedRouter.patch(
  '/workshop/drafts/:draftId',
  requirePageEditAny,
  patchWorkshopDraftHandler,
);
campaignScopedRouter.post(
  '/workshop/drafts/:draftId/formalize',
  requirePageEditAny,
  formalizeWorkshopDraftHandler,
);
campaignScopedRouter.get('/world-pressure/preview', getWorldPressurePreviewHandler);
campaignScopedRouter.get('/world-pressure', getWorldPressureHandler);
campaignScopedRouter.get('/pacing/simulation-runs', getPacingSimulationRunsHandler);
campaignScopedRouter.get('/adventure/storyboard', getStoryboardLayout);
campaignScopedRouter.patch('/adventure/storyboard', requireAdventureStoryboardEdit, patchStoryboardLayout);
campaignScopedRouter.get('/wiki/threads-hub', getThreadHubBySystemKey);
campaignScopedRouter.get('/wiki/threads-hub/:pageId', getThreadHubIndex);

campaignScopedRouter.get('/wiki/tags', listCampaignWikiTags);
campaignScopedRouter.get('/wiki/tags-hub', getTagsHub);
campaignScopedRouter.patch(
  '/wiki/tags/:tagId',
  requirePageEditAny,
  patchWikiTag,
);
campaignScopedRouter.post(
  '/wiki/tags/:tagId/icon',
  requirePageEditAny,
  enforceSystemUploadLimit,
  tagIconUpload.single('file'),
  uploadWikiTagIcon,
);

campaignScopedRouter.get('/wiki/link-index', getWikiLinkIndex);
campaignScopedRouter.get('/wiki/mention-targets', getMentionTargets);
campaignScopedRouter.get('/wiki/unresolved-wikilinks', getUnresolvedWikilinks);
campaignScopedRouter.post(
  '/wiki/unresolved-wikilinks/merge',
  requirePageEditAny,
  mergeUnresolvedWikilinks,
);
campaignScopedRouter.post(
  '/wiki/unresolved-wikilinks/:id/ignore',
  requirePageEditAny,
  ignoreUnresolvedWikilink,
);
campaignScopedRouter.get('/wiki/continuity-summary', getWikiContinuitySummary);
campaignScopedRouter.get('/wiki/world-activity', getWorldActivitySummary);
campaignScopedRouter.get('/wiki/writing-pulse', getWritingPulse);
campaignScopedRouter.get('/wiki/narrative-status', batchWikiPageNarrativeStatus);

campaignScopedRouter.get(
  '/workspace/:workspaceSegment/:pathKey',
  getWikiPageByWorkspacePath,
);

campaignScopedRouter.get('/wiki/:pageId', getWikiPage);
campaignScopedRouter.get('/wiki/:pageId/narrative-status', getWikiPageNarrativeStatus);
campaignScopedRouter.patch(
  '/wiki/:pageId/narrative-status',
  requirePageEditAny,
  patchWikiPageNarrativeStatus,
);
campaignScopedRouter.get('/wiki/:pageId/preview', getWikiPagePreview);
campaignScopedRouter.get('/wiki/:pageId/mention-snippet', getMentionSnippet);
campaignScopedRouter.get('/wiki/:pageId/aliases', listWikiPageAliases);
campaignScopedRouter.post('/wiki/:pageId/aliases', requirePageEditAny, createWikiPageAlias);
campaignScopedRouter.delete('/wiki/aliases/:aliasId', requirePageEditAny, deleteWikiPageAlias);

campaignScopedRouter.get('/wiki/:pageId/historical-aliases', listEntityHistoricalAliases);
campaignScopedRouter.post(
  '/wiki/:pageId/historical-aliases',
  requirePageEditAny,
  postEntityHistoricalAlias,
);
campaignScopedRouter.patch(
  '/wiki/historical-aliases/:aliasId',
  requirePageEditAny,
  patchEntityHistoricalAlias,
);
campaignScopedRouter.delete(
  '/wiki/historical-aliases/:aliasId',
  requirePageEditAny,
  removeEntityHistoricalAlias,
);
campaignScopedRouter.get('/wiki/:pageId/interpretive-summary', getInterpretiveSummary);
campaignScopedRouter.get('/wiki/:pageId/interpretations', getInterpretationsBundle);
campaignScopedRouter.post(
  '/wiki/:pageId/interpretation-groups',
  requirePageEditAny,
  postInterpretationGroup,
);
campaignScopedRouter.patch(
  '/wiki/interpretation-groups/:groupId',
  requirePageEditAny,
  patchInterpretationGroup,
);
campaignScopedRouter.delete(
  '/wiki/interpretation-groups/:groupId',
  requirePageEditAny,
  removeInterpretationGroup,
);
campaignScopedRouter.post(
  '/wiki/:pageId/interpretation-accounts',
  requirePageEditAny,
  postInterpretationAccount,
);
campaignScopedRouter.patch(
  '/wiki/interpretation-accounts/:accountId',
  requirePageEditAny,
  patchInterpretationAccount,
);
campaignScopedRouter.delete(
  '/wiki/interpretation-accounts/:accountId',
  requirePageEditAny,
  removeInterpretationAccount,
);
campaignScopedRouter.get('/wiki/:pageId/lore-claims', getLoreClaims);
campaignScopedRouter.get('/wiki/:pageId/party-knowledge', getPartyKnowledge);
campaignScopedRouter.post(
  '/wiki/:pageId/lore-claims',
  requirePageEditAny,
  postLoreClaim,
);
campaignScopedRouter.patch(
  '/wiki/lore-claims/:claimId',
  requirePageEditAny,
  patchLoreClaim,
);
campaignScopedRouter.delete(
  '/wiki/lore-claims/:claimId',
  requirePageEditAny,
  removeLoreClaim,
);

campaignScopedRouter.get('/wiki/:pageId/backlinks', getWikiBacklinks);
campaignScopedRouter.get('/wiki/:pageId/outlinks', getWikiOutlinks);
campaignScopedRouter.get('/wiki/:pageId/link-integrity', getWikiLinkIntegrity);
campaignScopedRouter.get('/wiki/:pageId/continuity', getWikiPageContinuity);

campaignScopedRouter.get('/narrative-lifecycle', listNarrativeLifecycleStates);
campaignScopedRouter.patch(
  '/narrative-lifecycle/:subjectKind/:subjectId',
  requireQuestEdit,
  patchNarrativeLifecycleState,
);
campaignScopedRouter.post(
  '/narrative-lifecycle/rebuild',
  requireQuestEdit,
  rebuildNarrativeLifecycle,
);

campaignScopedRouter.post(
  '/quests/:pageId/time-pressure/resolve',
  requireQuestEdit,
  resolveQuestTimePressure,
);
campaignScopedRouter.post(
  '/quests/:pageId/time-pressure/touch',
  requireQuestEdit,
  touchQuestTimePressureManual,
);

campaignScopedRouter.get(
  '/narrative-branches/:subjectId',
  requireThreadEdit,
  getNarrativeBranch,
);
campaignScopedRouter.patch(
  '/narrative-branches/:subjectId',
  requireThreadEdit,
  patchNarrativeBranch,
);

campaignScopedRouter.get(
  '/narrative/creative-drift',
  requireQuestEdit,
  getCreativeDrift,
);
campaignScopedRouter.patch(
  '/narrative/creative-drift/dispositions',
  requireQuestEdit,
  patchCreativeDriftDisposition,
);

campaignScopedRouter.get(
  '/narrative-publish/quest/:pageId/preview',
  requireQuestEdit,
  previewQuestPublish,
);
campaignScopedRouter.post(
  '/narrative-publish/quest/:pageId',
  requireQuestEdit,
  publishQuest,
);

campaignScopedRouter.get('/entity-graph', getEntityGraph);
campaignScopedRouter.get('/entity-graph/projection', getEntityGraphProjection);
campaignScopedRouter.get('/entity-graph/diagnostics', getEntityGraphDiagnostics);
campaignScopedRouter.post(
  '/entity-graph/rebuild',
  requirePageEditAny,
  rebuildCampaignEntityGraph,
);

campaignScopedRouter.get('/dashboard', getDashboardBundle);
campaignScopedRouter.get('/visual-atlas', getVisualAtlas);

campaignScopedRouter.patch(
  '/dashboard/layout',
  requireGamemasterSettings,
  updateDashboardLayout,
);

campaignScopedRouter.get('/ensemble', getEnsembleBundle);
campaignScopedRouter.patch(
  '/ensemble',
  requireGamemasterSettings,
  updateEnsembleConfig,
);

campaignScopedRouter.get('/status', getCampaignStatus);
campaignScopedRouter.get('/world-stats', getCampaignWorldStats);
campaignScopedRouter.get('/capacity-hint', getCampaignCapacityHint);
campaignScopedRouter.get('/files', getCampaignFiles);
campaignScopedRouter.get('/backup', requireGamemasterSettings, downloadCampaignBackup);
campaignScopedRouter.post(
  '/backup/async',
  requireGamemasterSettings,
  startAsyncCampaignBackup,
);
campaignScopedRouter.get(
  '/backup/download/:assetId',
  requireGamemasterSettings,
  downloadCampaignExportAsset,
);
campaignScopedRouter.post(
  '/backup/restore',
  requireGamemasterSettings,
  campaignWizardUpload.fields([{ name: 'backupZipFile', maxCount: 1 }]),
  enforceWizardUploadLimits,
  restoreCampaignBackup,
);

campaignScopedRouter.patch(
  '/settings/sidebar',
  requireGamemasterSettings,
  updateCampaignSidebar,
);

campaignScopedRouter.post(
  '/settings/sidebar/:sectionId/icon',
  requireGamemasterSettings,
  sidebarIconUpload.single('file'),
  uploadCampaignSidebarSectionIcon,
);

campaignScopedRouter.get(
  '/join-requests',
  requireCampaignOwner,
  listCampaignJoinRequests,
);

campaignScopedRouter.patch(
  '/join-requests/:requestId',
  requireCampaignOwner,
  respondToJoinRequest,
);

campaignScopedRouter.get('/wiki/session-notes/compile', compileSessionNotes);
campaignScopedRouter.get('/wiki/session-notes/combined', getCombinedSessionNotes);
campaignScopedRouter.get('/wiki/session-notes/index', getSessionNotesIndex);
campaignScopedRouter.post(
  '/session-timeline/new',
  requireCampaignMember,
  createNewSessionTimeline,
);
campaignScopedRouter.get(
  '/session-timeline/:timelinePointId',
  getSessionTimelinePoint,
);
campaignScopedRouter.post(
  '/session-timeline/:timelinePointId/notes/me',
  requireCampaignMember,
  ensureSessionAuthorNote,
);
campaignScopedRouter.get('/session-timeline/next-published', getNextPublishedSession);
campaignScopedRouter.get(
  '/session-timeline/:timelinePointId/schedule',
  getSessionSchedule,
);
campaignScopedRouter.patch(
  '/session-timeline/:timelinePointId/schedule',
  requireNotesModerate,
  patchSessionSchedule,
);
campaignScopedRouter.post(
  '/session-timeline/:timelinePointId/schedule/publish',
  requireNotesModerate,
  publishSessionSchedule,
);
campaignScopedRouter.get(
  '/session-timeline/:timelinePointId/attendance/me',
  getMySessionAttendance,
);
campaignScopedRouter.patch(
  '/session-timeline/:timelinePointId/attendance/me',
  requireCampaignMember,
  patchMySessionAttendance,
);
campaignScopedRouter.get(
  '/session-timeline/:timelinePointId/attendance',
  requireNotesModerate,
  listSessionAttendance,
);
campaignScopedRouter.get('/transfer-ownership/status', getOwnershipTransferStatus);
campaignScopedRouter.post(
  '/transfer-ownership/initiate',
  requireCampaignOwner,
  initiateOwnershipTransfer,
);
campaignScopedRouter.post('/transfer-ownership/accept', acceptOwnershipTransfer);
campaignScopedRouter.post('/transfer-ownership/decline', declineOwnershipTransfer);
campaignScopedRouter.delete(
  '/transfer-ownership',
  requireCampaignOwner,
  cancelOwnershipTransfer,
);
campaignScopedRouter.get(
  '/wiki/session-notes/:pageId/perspectives',
  getSessionNotePerspectives,
);
campaignScopedRouter.post('/notebooks', createNotebookArc);
campaignScopedRouter.put('/notebooks/:notebookId', updateNotebookArc);
campaignScopedRouter.delete('/notebooks/:notebookId', deleteNotebookArc);
campaignScopedRouter.patch('/wiki-pages/assign-notebook', assignWikiPageNotebookArc);
campaignScopedRouter.patch('/wiki-pages/bulk-move', bulkMoveWikiPages);
campaignScopedRouter.post(
  '/wiki-pages/bulk-delete',
  requirePageEditAny,
  bulkDeleteSessionNotes,
);
campaignScopedRouter.put('/wiki-pages/:pageId', updateSessionNotePage);
campaignScopedRouter.delete('/wiki-pages/:pageId', deleteSessionNotePage);
campaignScopedRouter.post(
  '/wiki-pages/upload',
  requireCampaignMember,
  documentUpload.single('document'),
  enforceSystemUploadLimit,
  uploadSessionNotePage,
);

campaignScopedRouter.get(
  '/wiki/session-notes/player/:playerId',
  requireGamemasterSettings,
  getPlayerSessionSummary,
);

campaignScopedRouter.post(
  '/wiki/import-markdown-preview',
  requireNonObserverMember,
  previewCreatePageMarkdownImport,
);

campaignScopedRouter.post(
  '/wiki',
  requireNonObserverMember,
  createWikiPage,
);

campaignScopedRouter.patch(
  '/wiki/:pageId',
  requireNonObserverMember,
  updateWikiPage,
);

campaignScopedRouter.post(
  '/wiki/:pageId/transform',
  requirePageEditAny,
  transformWikiPage,
);

campaignScopedRouter.patch(
  '/wiki/:pageId/metadata',
  requireNonObserverMember,
  updateWikiPageMetadata,
);

campaignScopedRouter.patch(
  '/wiki/:pageId/layout',
  requirePageEditAny,
  updateWikiPageLayout,
);

campaignScopedRouter.patch(
  '/wiki/:pageId/visibility',
  requirePageVisibilityEdit,
  updateWikiPageVisibility,
);

campaignScopedRouter.get(
  '/wiki/:pageId/delete-preview',
  requirePageEditAny,
  getWikiPageDeletePreview,
);

campaignScopedRouter.delete(
  '/wiki/:pageId',
  requirePageEditAny,
  deleteWikiPage,
);

campaignScopedRouter.patch('/wiki/:pageId/pin', togglePinnedPageShortcut);

campaignScopedRouter.get('/uploads', listCampaignAssets);

campaignScopedRouter.post(
  '/uploads',
  requireCampaignMember,
  requireAssetsUpload,
  imageUpload.single('image'),
  enforceSystemUploadLimit,
  uploadCampaignImage,
);

campaignScopedRouter.post(
  '/assets/import-url',
  requireCampaignMember,
  requireAssetsUpload,
  campaignUrlImportLimiter,
  importCampaignImageFromUrl,
);

campaignScopedRouter.delete(
  '/uploads/:assetId',
  requireCampaignMember,
  requireAssetsDeleteAny,
  deleteCampaignAsset,
);

campaignScopedRouter.get('/maps', listCampaignMaps);
campaignScopedRouter.get('/maps/pins/:pinId/preview', getMapPinPreview);
campaignScopedRouter.get('/maps/:assetId/scene', getMapScene);
campaignScopedRouter.get('/maps/:assetId/presentation-presets', listMapPresentationPresetsHandler);
campaignScopedRouter.post(
  '/maps/:assetId/presentation-presets',
  requireMapsEdit,
  createMapPresentationPreset,
);
campaignScopedRouter.patch(
  '/maps/:assetId/presentation-presets/:presetId',
  requireMapsEdit,
  updateMapPresentationPreset,
);
campaignScopedRouter.delete(
  '/maps/:assetId/presentation-presets/:presetId',
  requireMapsEdit,
  deleteMapPresentationPreset,
);
campaignScopedRouter.get('/maps/:assetId/layers', listMapLayers);
campaignScopedRouter.post(
  '/maps/:assetId/layers',
  requireMapsEdit,
  createMapLayer,
);
campaignScopedRouter.patch(
  '/maps/:assetId/layers/:layerId',
  requireMapsEdit,
  updateMapLayer,
);
campaignScopedRouter.delete(
  '/maps/:assetId/layers/:layerId',
  requireMapsEdit,
  deleteMapLayer,
);
campaignScopedRouter.get('/maps/:assetId/groups', listMapObjectGroups);
campaignScopedRouter.post(
  '/maps/:assetId/groups',
  requireMapsEdit,
  createMapObjectGroup,
);
campaignScopedRouter.patch(
  '/maps/:assetId/groups/:groupId',
  requireMapsEdit,
  updateMapObjectGroup,
);
campaignScopedRouter.delete(
  '/maps/:assetId/groups/:groupId',
  requireMapsEdit,
  deleteMapObjectGroup,
);
campaignScopedRouter.post(
  '/maps/:assetId/objects',
  requireMapsEdit,
  createMapSceneObject,
);
campaignScopedRouter.patch(
  '/maps/:assetId/objects/:objectId',
  requireMapsEdit,
  updateMapSceneObject,
);
campaignScopedRouter.post(
  '/maps/:assetId/objects/:objectId/confirm-flow',
  requireMapsEdit,
  confirmMapFlowOverlay,
);
campaignScopedRouter.delete(
  '/maps/:assetId/objects/:objectId',
  requireMapsEdit,
  deleteMapSceneObject,
);
campaignScopedRouter.post(
  '/maps/:assetId/reveal',
  requireDiscoveryReveal,
  batchRevealMapObjects,
);
campaignScopedRouter.post(
  '/presence/reveal',
  requireDiscoveryReveal,
  bulkRevealContentPresence,
);
campaignScopedRouter.post(
  '/presence/reveal/preview',
  requireDiscoveryReveal,
  previewRevealImpact,
);
campaignScopedRouter.get(
  '/maps/objects/:objectId/keyframes',
  requireMapsEdit,
  listMapObjectKeyframes,
);
campaignScopedRouter.post(
  '/maps/objects/:objectId/keyframes',
  requireMapsEdit,
  createMapObjectKeyframe,
);
campaignScopedRouter.delete(
  '/maps/objects/:objectId/keyframes/:keyframeId',
  requireMapsEdit,
  deleteMapObjectKeyframe,
);
campaignScopedRouter.get(
  '/wiki/:pageId/map-object-impact',
  getWikiPageMapObjectImpact,
);
campaignScopedRouter.get('/maps/:assetId', getCampaignMap);
campaignScopedRouter.patch(
  '/maps/:assetId',
  requireMapsEdit,
  updateCampaignMap,
);
campaignScopedRouter.patch(
  '/maps/:assetId/link-page',
  requireMapsEdit,
  linkMapToWikiPage,
);
campaignScopedRouter.get('/maps/:assetId/pins', listMapPins);
campaignScopedRouter.post(
  '/maps/:assetId/pins',
  requireMapsEdit,
  createMapPin,
);
campaignScopedRouter.patch(
  '/maps/:assetId/pins/:pinId',
  requireMapsEdit,
  updateMapPin,
);
campaignScopedRouter.delete(
  '/maps/:assetId/pins/:pinId',
  requireMapsEdit,
  deleteMapPin,
);
campaignScopedRouter.patch(
  '/wiki/:pageId/map-asset',
  requireMapsEdit,
  bindWikiPageMapAsset,
);
