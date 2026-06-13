import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import {
  LoreSourceTypeIcon,
  SOURCE_ROLE_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  loreFieldClass,
  loreSectionLabel,
} from '@/components/entity/lore/LoreKnowledgeUi';
import type { CalendarEventRecord } from '@/lib/calendarEventsApi';
import { formatWikiTemplateType } from '@/lib/formatWikiTemplateType';
import type { LoreClaimSourceRecord, LoreSourceEntityType } from '@/lib/loreKnowledgeProjection';
import type { WikiTreeNode } from '@/types/wiki';

type SourceMode = 'wiki' | 'event' | 'freeform';

function resolveMode(source: Partial<LoreClaimSourceRecord>): SourceMode {
  if (source.sourceEntityType === 'CALENDAR_EVENT') return 'event';
  if (
    source.sourceEntityType === 'WIKI_PAGE' &&
    (source.sourceEntityId?.trim() || !source.label?.trim())
  ) {
    return 'wiki';
  }
  if (source.label?.trim() && !source.sourceEntityId?.trim()) return 'freeform';
  return 'wiki';
}

function CalendarEventPicker({
  events,
  value,
  disabled,
  onChange,
}: {
  events: CalendarEventRecord[];
  value: string | null;
  disabled?: boolean;
  onChange: (eventId: string | null, title: string | null) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [events],
  );

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((e) => e.title.toLowerCase().includes(needle));
  }, [searchQuery, sorted]);

  const selected = useMemo(() => sorted.find((e) => e.id === value) ?? null, [sorted, value]);
  const inputValue = isOpen ? searchQuery : (selected?.title ?? 'Search historical events…');

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="search"
        disabled={disabled || events.length === 0}
        placeholder={events.length === 0 ? 'No calendar events loaded' : 'Search historical events…'}
        className={loreFieldClass}
        value={inputValue}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && filtered.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-elevated py-1 shadow-lg">
          {filtered.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-background"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(event.id, event.title);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                <div className="text-sm font-medium text-foreground">{event.title}</div>
                <div className="text-xs text-muted">Historical event</div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const MODE_OPTIONS: { id: SourceMode; label: string }[] = [
  { id: 'wiki', label: 'Wiki page' },
  { id: 'event', label: 'Historical event' },
  { id: 'freeform', label: 'Freeform testimony' },
];

interface LoreSourcePickerProps {
  flatPages: Array<Pick<WikiTreeNode, 'id' | 'title' | 'templateType'>>;
  calendarEvents: CalendarEventRecord[];
  eventsLoading?: boolean;
  value: Partial<LoreClaimSourceRecord>;
  onChange: (next: Partial<LoreClaimSourceRecord>) => void;
  disabled?: boolean;
}

export function LoreSourcePicker({
  flatPages,
  calendarEvents,
  eventsLoading = false,
  value,
  onChange,
  disabled = false,
}: LoreSourcePickerProps) {
  const [mode, setMode] = useState<SourceMode>(() => resolveMode(value));
  const [showFreeform, setShowFreeform] = useState(mode === 'freeform');

  useEffect(() => {
    setMode(resolveMode(value));
  }, [value.sourceEntityType, value.sourceEntityId, value.label]);

  function applyMode(nextMode: SourceMode) {
    setMode(nextMode);
    if (nextMode === 'wiki') {
      onChange({
        ...value,
        sourceEntityType: 'WIKI_PAGE' as LoreSourceEntityType,
        sourceEntityId: value.sourceEntityType === 'WIKI_PAGE' ? value.sourceEntityId : '',
      });
      setShowFreeform(false);
    } else if (nextMode === 'event') {
      onChange({
        ...value,
        sourceEntityType: 'CALENDAR_EVENT' as LoreSourceEntityType,
        sourceType: value.sourceType ?? 'EVENT_RECORD',
        sourceEntityId: value.sourceEntityType === 'CALENDAR_EVENT' ? value.sourceEntityId : '',
      });
      setShowFreeform(false);
    } else {
      onChange({
        ...value,
        sourceEntityType: 'OTHER' as LoreSourceEntityType,
        sourceEntityId: null,
      });
      setShowFreeform(true);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border/40 bg-muted/5 p-3">
      <div className="flex flex-wrap gap-1 rounded-md border border-border/50 p-0.5">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => applyMode(opt.id)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              mode === opt.id
                ? 'bg-primary/15 font-medium text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select
        className={loreFieldClass}
        disabled={disabled}
        value={value.role ?? 'SUPPORTS'}
        onChange={(e) =>
          onChange({ ...value, role: e.target.value as LoreClaimSourceRecord['role'] })
        }
      >
        {SOURCE_ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className={loreFieldClass}
        disabled={disabled}
        value={value.sourceType ?? 'OTHER'}
        onChange={(e) =>
          onChange({
            ...value,
            sourceType: e.target.value as LoreClaimSourceRecord['sourceType'],
          })
        }
      >
        {SOURCE_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {mode === 'wiki' ? (
        <div className="space-y-1">
          <label className={loreSectionLabel}>Search lore source</label>
          <IdentityPagePicker
            flatPages={flatPages as WikiTreeNode[]}
            lookupPages={flatPages as WikiTreeNode[]}
            value={value.sourceEntityId?.trim() || null}
            disabled={disabled}
            placeholder="Search lore source…"
            onChange={async (pageId) => {
              const page = pageId ? flatPages.find((p) => p.id === pageId) : null;
              onChange({
                ...value,
                sourceEntityType: 'WIKI_PAGE',
                sourceEntityId: pageId ?? '',
                label: value.label?.trim() ? value.label : (page?.title ?? ''),
              });
            }}
          />
          {value.sourceEntityId ? (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <LoreSourceTypeIcon sourceType={value.sourceType ?? 'OTHER'} />
              {flatPages.find((p) => p.id === value.sourceEntityId)?.title ?? 'Selected page'}
              <span>
                ·{' '}
                {formatWikiTemplateType(
                  flatPages.find((p) => p.id === value.sourceEntityId)?.templateType,
                )}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {mode === 'event' ? (
        <div className="space-y-1">
          <label className={loreSectionLabel}>Historical event</label>
          {eventsLoading ? (
            <Loader2 className="size-4 animate-spin text-muted" />
          ) : (
            <CalendarEventPicker
              events={calendarEvents}
              value={value.sourceEntityId?.trim() || null}
              disabled={disabled}
              onChange={(eventId, title) => {
                onChange({
                  ...value,
                  sourceEntityType: 'CALENDAR_EVENT',
                  sourceType: 'EVENT_RECORD',
                  sourceEntityId: eventId ?? '',
                  label: value.label?.trim() ? value.label : (title ?? ''),
                });
              }}
            />
          )}
        </div>
      ) : null}

      {mode === 'freeform' || showFreeform ? (
        <div className="space-y-1">
          <label className={loreSectionLabel}>Testimony or fragment</label>
          <input
            className={loreFieldClass}
            disabled={disabled}
            placeholder='e.g. "Unnamed dockworker testimony"'
            value={value.label ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                sourceEntityType: 'OTHER',
                sourceEntityId: null,
                label: e.target.value,
              })
            }
          />
        </div>
      ) : (
        <button
          type="button"
          className="text-xs text-muted hover:text-primary"
          onClick={() => {
            setShowFreeform(true);
            applyMode('freeform');
          }}
        >
          + Unnamed source instead
        </button>
      )}

      {mode !== 'freeform' && value.label?.trim() ? (
        <div className="flex items-center gap-1">
          <input
            className={`${loreFieldClass} flex-1`}
            disabled={disabled}
            placeholder="Display label override (optional)"
            value={value.label ?? ''}
            onChange={(e) => onChange({ ...value, label: e.target.value })}
          />
          <button
            type="button"
            title="Clear label override"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted"
            onClick={() => onChange({ ...value, label: '' })}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
