import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CampaignMapAsset } from '@/types/maps';
import { campaignPath, campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { useMapScene } from '@/hooks/useMapScene';
import { MapCanvas } from './MapCanvas';
import { MapVisibilityBar } from './MapVisibilityBar';

interface EmbeddedMapSectionProps {
  campaignHandle: string;
  map: CampaignMapAsset;
  canEdit: boolean;
  wikiPages: { id: string; title: string }[];
  campaignMaps: CampaignMapAsset[];
}

/** Wiki-embedded map: visibility filters only; full chronology on the dedicated map viewer. */
export function EmbeddedMapSection({
  campaignHandle,
  map,
  canEdit,
  wikiPages,
  campaignMaps,
}: EmbeddedMapSectionProps) {
  const navigate = useNavigate();
  const { flatPages } = useWiki();
  const [editMode, setEditMode] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);

  const scene = useMapScene({
    campaignHandle,
    mapAssetId: map.id,
    canEdit,
    viewEpochMinute: null,
    campaignEpochMinute: null,
    ghostMode,
  });

  return (
    <div className="mb-2 space-y-2">
      <MapVisibilityBar
        layers={scene.layers}
        enabledLayerIds={scene.enabledLayerIds}
        hiddenPinTypes={scene.hiddenTypes}
        onToggleLayer={scene.toggleLayer}
        onTogglePinType={scene.togglePinType}
      />
      <MapCanvas
        campaignHandle={campaignHandle}
        map={map}
        canEdit={canEdit}
        wikiPages={wikiPages}
        campaignMaps={campaignMaps}
        editMode={editMode}
        ghostMode={ghostMode}
        onToggleEditMode={() => setEditMode((v) => !v)}
        onToggleGhostMode={() => setGhostMode((v) => !v)}
        scene={scene}
        onNavigateWiki={(pageId) =>
          navigate(campaignWikiPath(campaignHandle, pageId, flatPages))
        }
        onNavigateMap={(assetId) =>
          navigate(campaignPath(campaignHandle, 'maps', assetId))
        }
      />
    </div>
  );
}
