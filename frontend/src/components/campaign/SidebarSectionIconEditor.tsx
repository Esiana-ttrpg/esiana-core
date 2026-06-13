import { useEffect, useRef, useState } from 'react';
import { IconAppearancePicker } from '@/components/ui/IconAppearancePicker';
import { SidebarNavIcon } from '@/components/SidebarNavIcon';
import {
  getSidebarSectionIcon,
  stripSidebarConfigEnrichment,
  type SidebarConfig,
  type SidebarSectionId,
} from '@/lib/sidebarConfig';
import { defaultSidebarIconValue } from '@/lib/sidebarIconDefaults';

interface SidebarSectionIconEditorProps {
  config: SidebarConfig;
  sectionId: SidebarSectionId;
  label: string;
  disabled?: boolean;
  onLucidePick: (sectionId: SidebarSectionId, lucideName: string) => void;
  onUpload: (sectionId: SidebarSectionId, file: File) => void;
  onReset: (sectionId: SidebarSectionId) => void;
  compact?: boolean;
}

export function SidebarSectionIconEditor({
  config,
  sectionId,
  label,
  disabled = false,
  onLucidePick,
  onUpload,
  onReset,
  compact = false,
}: SidebarSectionIconEditorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const storedIcon = getSidebarSectionIcon(config, sectionId);
  const activeLucide = storedIcon.startsWith('lucide:')
    ? storedIcon.slice('lucide:'.length)
    : null;
  const isCustom =
    storedIcon !== defaultSidebarIconValue(sectionId) ||
    Boolean(config.fixedSectionIcons?.[sectionId]) ||
    config.worldLoreOrder.some((row) => row.id === sectionId && row.icon) ||
    config.playOrder.some((row) => row.id === sectionId && row.icon) ||
    config.toolsOrder.some((row) => row.id === sectionId && row.icon);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={`flex size-8 items-center justify-center rounded-md border transition-colors ${
          open || isCustom
            ? 'border-primary/40 bg-primary/10'
            : 'border-border bg-background hover:bg-surface'
        } disabled:opacity-50`}
        aria-label={`Choose icon for ${label}`}
        aria-expanded={open}
      >
        <SidebarNavIcon
          config={config}
          sectionId={sectionId}
          className="size-4 shrink-0 opacity-90"
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 mt-1 w-72 rounded-lg border border-border bg-surface shadow-lg ${
            compact ? 'bottom-full mb-1' : 'top-full'
          }`}
        >
          <IconAppearancePicker
            compact
            activeLucide={activeLucide}
            disabled={disabled}
            onLucidePick={(name) => {
              onLucidePick(sectionId, name);
              setOpen(false);
            }}
            onUpload={(file) => {
              onUpload(sectionId, file);
              setOpen(false);
            }}
            onReset={() => {
              onReset(sectionId);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function omitRelationsFixedFields(
  record: Partial<Record<SidebarSectionId, string | boolean>> | undefined,
): Partial<Record<SidebarSectionId, string | boolean>> | undefined {
  if (!record || !('relations' in record)) return record;
  const { relations: _removed, ...rest } = record;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function fixedSectionIconsForPersist(
  record: Partial<Record<SidebarSectionId, string | boolean>> | undefined,
): Partial<Record<SidebarSectionId, string>> | undefined {
  const stripped = omitRelationsFixedFields(record);
  if (!stripped) return undefined;
  const next: Partial<Record<SidebarSectionId, string>> = {};
  for (const [id, value] of Object.entries(stripped)) {
    if (typeof value === 'string' && value.trim()) {
      next[id as SidebarSectionId] = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function fixedSectionVisibilityForPersist(
  record: Partial<Record<SidebarSectionId, string | boolean>> | undefined,
): Partial<Record<SidebarSectionId, boolean>> | undefined {
  const stripped = omitRelationsFixedFields(record);
  if (!stripped) return undefined;
  const next: Partial<Record<SidebarSectionId, boolean>> = {};
  for (const [id, value] of Object.entries(stripped)) {
    if (typeof value === 'boolean') {
      next[id as SidebarSectionId] = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function sidebarConfigForPersist(config: SidebarConfig) {
  const stripped = stripSidebarConfigEnrichment(config);
  const fixedSectionIcons = fixedSectionIconsForPersist(stripped.fixedSectionIcons);
  const fixedSectionVisibility = fixedSectionVisibilityForPersist(
    stripped.fixedSectionVisibility,
  );
  return {
    headers: stripped.headers,
    worldLoreOrder: stripped.worldLoreOrder,
    playOrder: stripped.playOrder,
    toolsOrder: stripped.toolsOrder,
    gameManagementOrder: [...stripped.playOrder, ...stripped.toolsOrder],
    ...(fixedSectionIcons ? { fixedSectionIcons } : {}),
    ...(fixedSectionVisibility ? { fixedSectionVisibility } : {}),
  };
}
