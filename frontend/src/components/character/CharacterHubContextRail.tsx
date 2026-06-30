import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  CharacterHubRailContent,
  type CharacterHubRailContentProps,
} from '@/components/character/CharacterHubRail';
import { WorkspaceContextRail } from '@/components/layout/WorkspaceContextRail';
import {
  clampCharacterHubRailWidth,
  CHARACTER_HUB_RAIL_WIDTH_EVENT,
  CHARACTER_HUB_RAIL_WIDTH_MAX,
  CHARACTER_HUB_RAIL_WIDTH_MIN,
  loadCharacterHubRailWidth,
  saveCharacterHubRailWidth,
} from '@/lib/characterHubRailWidthPreference';

export type CharacterHubContextRailLayout = 'inline' | 'overlay';

interface CharacterHubContextRailProps extends CharacterHubRailContentProps {
  layout: CharacterHubContextRailLayout;
  open?: boolean;
  onClose?: () => void;
  onWidthChange?: (width: number) => void;
}

export function CharacterHubContextRail({
  layout,
  open = true,
  onClose,
  onWidthChange,
  ...contentProps
}: CharacterHubContextRailProps) {
  const [panelWidth, setPanelWidth] = useState(loadCharacterHubRailWidth);

  useEffect(() => {
    const onWidthEvent = () => setPanelWidth(loadCharacterHubRailWidth());
    window.addEventListener(CHARACTER_HUB_RAIL_WIDTH_EVENT, onWidthEvent);
    return () => window.removeEventListener(CHARACTER_HUB_RAIL_WIDTH_EVENT, onWidthEvent);
  }, []);

  useEffect(() => {
    onWidthChange?.(panelWidth);
  }, [panelWidth, onWidthChange]);

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const onMove = (moveEvent: MouseEvent) => {
        const next = clampCharacterHubRailWidth(window.innerWidth - moveEvent.clientX);
        setPanelWidth(next);
        saveCharacterHubRailWidth(next);
      };
      const onUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [],
  );

  const widthStyle: CSSProperties = {
    width: layout === 'inline' ? '100%' : `min(${panelWidth}px, 92vw)`,
    ['--character-hub-rail-width' as string]: `${panelWidth}px`,
  };

  return (
    <WorkspaceContextRail
      title="Campaign Context"
      description="Session presence & cast preview"
      layout={layout}
      open={open}
      onClose={onClose}
      onWidthChange={onWidthChange}
      widthStyle={widthStyle}
      minWidth={CHARACTER_HUB_RAIL_WIDTH_MIN}
      maxWidth={CHARACTER_HUB_RAIL_WIDTH_MAX}
      ariaLabel="Campaign context"
      onResizeStart={startResize}
    >
      <CharacterHubRailContent {...contentProps} />
    </WorkspaceContextRail>
  );
}
