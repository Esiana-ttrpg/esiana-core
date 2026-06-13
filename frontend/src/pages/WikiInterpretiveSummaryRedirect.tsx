import { Navigate, useLocation, useParams } from 'react-router-dom';

/** API lives at /wiki/:pageId/interpretive-summary; wiki UI is /wiki/:pageId with optional ?viewDate= */
export function WikiInterpretiveSummaryRedirect() {
  const { pageId } = useParams<{ pageId: string }>();
  const location = useLocation();

  if (!pageId?.trim()) {
    return <Navigate to="../wiki" replace />;
  }

  return (
    <Navigate
      to={`../wiki/${encodeURIComponent(pageId)}${location.search}`}
      replace
    />
  );
}
