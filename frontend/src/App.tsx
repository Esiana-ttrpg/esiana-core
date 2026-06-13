import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { CampaignLayout } from '@/layouts/CampaignLayout';
import { GlobalHubPage } from '@/pages/GlobalHubPage';
import { PluginPageHost } from '@/pages/PluginPageHost';
import { WikiPage } from '@/pages/WikiPage';
import { WorldMaintenancePage } from '@/pages/WorldMaintenancePage';
import { CreativeDriftPage } from '@/pages/CreativeDriftPage';
import { WorkspaceIndexPage } from '@/pages/WorkspaceIndexPage';
import { FreeformPagesIndex } from '@/pages/FreeformPagesIndex';
import {
  WORKSPACE_ENTITY_SEGMENTS,
  WORKSPACE_INDEX_SEGMENTS,
} from '@/lib/campaignWorkspaceRoutes';
import { WikiInterpretiveSummaryRedirect } from '@/pages/WikiInterpretiveSummaryRedirect';
import { CampaignSettingsPage } from '@/pages/CampaignSettingsPage';
import { SessionNotesCompilePage } from '@/pages/SessionNotesCompilePage';
import { PlayerSessionNotesPage } from '@/pages/PlayerSessionNotesPage';
import { SessionTagNotesPage } from '@/pages/SessionTagNotesPage';
import { SessionNotesView } from '@/pages/SessionNotesView';
import { SessionTimelineNotePage } from '@/pages/SessionTimelineNotePage';
import { SessionCombinedNotesPage } from '@/pages/SessionCombinedNotesPage';
import { TimeTrackingManagement } from '@/pages/TimeTrackingManagement';
import { WorldAdvancePage } from '@/pages/WorldAdvancePage';
import { ProgressionPage } from '@/pages/ProgressionPage';
import { WorldAdvanceBatchPage } from '@/pages/WorldAdvanceBatchPage';
import { ChronologyPage } from '@/pages/ChronologyPage';
import { UserSettings } from '@/pages/UserSettings';
import { YourCampaignsPage } from '@/pages/YourCampaignsPage';
import { CampaignDefaultEditorPage } from '@/pages/settings/CampaignDefaultEditorPage';
import { PublicUserProfilePage } from '@/pages/PublicUserProfilePage';
import { RecentChangesPage } from '@/pages/RecentChangesPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminGeneralSettingsPage } from '@/pages/AdminGeneralSettingsPage';
import { AdminAssetsUploadsPage } from '@/pages/AdminAssetsUploadsPage';
import { AdminStoragePage } from '@/pages/AdminStoragePage';
import { AdminIdentityProvidersPage } from '@/pages/AdminIdentityProvidersPage';
import { AdminAppearancePage } from '@/pages/AdminBrandingPage';
import { AdminPluginsPage } from '@/pages/AdminPluginsPage';
import { AppUpdatePage } from '@/pages/AppUpdatePage';
import { UserManagementPage } from '@/pages/UserManagementPage';
import { UsageAnalyticsPage } from '@/pages/UsageAnalyticsPage';
import { AdminUtilitiesPage } from '@/pages/AdminUtilitiesPage';
import { AdminCampaignsPage } from '@/pages/AdminCampaignsPage';
import { AdminSampleDataPage } from '@/pages/AdminSampleDataPage';
import { AdminBackgroundTasksPage } from '@/pages/AdminBackgroundTasksPage';
import { RecruitmentDirectoryPage } from '@/pages/RecruitmentDirectoryPage';
import { RecruitmentLobbyPage } from '@/pages/RecruitmentLobbyPage';
import { PlatformGuidePage } from '@/pages/PlatformGuidePage';
import { MapViewerPage } from '@/pages/MapViewerPage';
import { MapSettingsPage } from '@/pages/MapSettingsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { TransferOwnershipPage } from '@/pages/TransferOwnershipPage';
import { EnsemblePage } from '@/pages/EnsemblePage';
import { CampaignDashboardPage } from '@/pages/CampaignDashboardPage';
import { VisualAtlasPage } from '@/pages/VisualAtlasPage';
import { RelationsPage } from '@/pages/RelationsPage';
import { CampaignIndexRedirect } from '@/pages/CampaignIndexRedirect';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

function LegacySessionNoteRedirect() {
  const { timelinePointId = '' } = useParams<{ timelinePointId: string }>();
  return <Navigate to={`../notes/${timelinePointId}`} replace relative="path" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
        <Routes>
          <Route element={<AppLayout />} errorElement={<RouteErrorPage />}>
            <Route index element={<GlobalHubPage />} />
            <Route path="guides/:guideSlug" element={<PlatformGuidePage />} />
            <Route path="recruitment" element={<RecruitmentDirectoryPage />} />
            <Route path="recruitment/:campaignHandle" element={<RecruitmentLobbyPage />} />
            <Route path="settings" element={<UserSettings />} />
            <Route
              path="settings/campaign-defaults/:routeSlug"
              element={<CampaignDefaultEditorPage />}
            />
            <Route path="campaigns" element={<YourCampaignsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="users/:id" element={<PublicUserProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="campaigns/:campaignHandle" element={<CampaignLayout />} errorElement={<RouteErrorPage />}>
            <Route index element={<CampaignIndexRedirect />} />
            <Route path="dashboard" element={<CampaignDashboardPage />} />
            <Route path="plugin/:pluginId/:pageId/*" element={<PluginPageHost />} />
            <Route path="party" element={<EnsemblePage />} />
            <Route path="visual-atlas" element={<VisualAtlasPage />} />
            <Route path="relations" element={<RelationsPage />} />
            <Route path="chronology" element={<ChronologyPage />} />
            <Route path="time-tracking" element={<TimeTrackingManagement />} />
            <Route path="world-advance" element={<WorldAdvancePage />} />
            <Route path="progression" element={<ProgressionPage />} />
            <Route path="world-advance/batches/:eventId" element={<WorldAdvanceBatchPage />} />
            <Route path="recent-changes" element={<RecentChangesPage />} />
            <Route path="pages" element={<FreeformPagesIndex />} />
            <Route path="pages/:pathKey" element={<WikiPage />} />
            {WORKSPACE_INDEX_SEGMENTS.filter((s) => s !== 'pages').map((segment) => (
              <Route key={`ws-index-${segment}`} path={segment} element={<WorkspaceIndexPage />} />
            ))}
            {WORKSPACE_ENTITY_SEGMENTS.map((segment) => (
              <Route
                key={`ws-entity-${segment}`}
                path={`${segment}/:pathKey`}
                element={<WikiPage />}
              />
            ))}
            <Route
              path="wiki/:pageId/interpretive-summary"
              element={<WikiInterpretiveSummaryRedirect />}
            />
            <Route path="wiki/maintenance" element={<WorldMaintenancePage />} />
            <Route path="narrative/unresolved" element={<CreativeDriftPage />} />
            <Route
              path="narrative/drift"
              element={<Navigate to="unresolved" replace relative="path" />}
            />
            <Route
              path="session-notes/compile"
              element={<SessionNotesCompilePage />}
            />
            <Route path="notes" element={<SessionNotesView />} />
            <Route path="notes/:timelinePointId" element={<SessionTimelineNotePage />} />
            <Route
              path="notes/:timelinePointId/all"
              element={<SessionCombinedNotesPage />}
            />
            <Route path="notes-index" element={<Navigate to="../notes" replace />} />
            <Route
              path="session-notes/:timelinePointId"
              element={<LegacySessionNoteRedirect />}
            />
            <Route
              path="session-notes/player/:playerId"
              element={<PlayerSessionNotesPage />}
            />
            <Route
              path="session-notes/session/:sessionId"
              element={<SessionTagNotesPage />}
            />
            <Route path="settings" element={<CampaignSettingsPage />} />
            <Route path="transfer-ownership" element={<TransferOwnershipPage />} />
            <Route path="maps/:assetId" element={<MapViewerPage />} />
            <Route path="maps/:assetId/settings" element={<MapSettingsPage />} />
            <Route path=":pageId" element={<WikiPage />} />
          </Route>

          <Route path="admin" element={<AdminLayout />} errorElement={<RouteErrorPage />}>
            <Route index element={<Navigate to="settings/general" replace />} />
            <Route path="settings" element={<Navigate to="general" replace />} />
            <Route path="settings/general" element={<AdminGeneralSettingsPage />} />
            <Route path="settings/assets" element={<AdminAssetsUploadsPage />} />
            <Route path="settings/storage" element={<AdminStoragePage />} />
            <Route
              path="settings/identity-providers"
              element={<AdminIdentityProvidersPage />}
            />
            <Route path="settings/branding" element={<Navigate to="../appearance" replace />} />
            <Route path="settings/appearance" element={<AdminAppearancePage />} />
            <Route path="settings/plugins" element={<AdminPluginsPage />} />
            <Route path="config/update" element={<AppUpdatePage />} />
            <Route path="config/utilities" element={<AdminUtilitiesPage />} />
            <Route path="config/background-tasks" element={<AdminBackgroundTasksPage />} />
            <Route path="config/campaigns" element={<AdminCampaignsPage />} />
            <Route path="config/sample-data" element={<AdminSampleDataPage />} />
            <Route path="memberships" element={<UserManagementPage />} />
            <Route path="analytics/usage" element={<UsageAnalyticsPage />} />
          </Route>
        </Routes>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
