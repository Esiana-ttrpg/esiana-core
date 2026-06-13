import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarClock,
  Crown,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { CampaignMemberRoles } from '@/types/domain';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  createFantasyCalendar,
  deleteFantasyCalendar,
  listFantasyCalendars,
  normalizeMonthRows,
  normalizeMoonRows,
  normalizeSeasonRows,
  normalizeWeekdayRows,
  patchFantasyCalendar,
  type FantasyCalendarRecord,
  type MonthFormRow,
  type MoonFormRow,
  type SeasonFormRow,
  type WeekdayFormRow,
} from '@/lib/fantasyCalendarApi';
import { FantasyCalendarImportZone } from '@/components/chronology/FantasyCalendarImportZone';
import { campaignWorldAdvancePath } from '@/lib/campaignPaths';
import {
  CLIMATE_ASPECT_EDITOR_OPTIONS,
  DEFAULT_CLIMATE_ASPECT,
  normalizeClimateAspect,
} from '@/lib/climateAspect';

function recordToDraft(cal: FantasyCalendarRecord) {
  return {
    name: cal.name,
    isMasterTime: cal.isMasterTime,
    epochOffset: cal.epochOffset,
    weekdays: normalizeWeekdayRows(cal.weekdays),
    months: normalizeMonthRows(cal.months),
    seasons: normalizeSeasonRows(cal.seasons),
    moons: normalizeMoonRows(cal.moons),
    leapDaysJson: JSON.stringify(cal.leapDays ?? [], null, 2),
  };
}

type Draft = ReturnType<typeof recordToDraft>;

const MANAGE_ROLES = [CampaignMemberRoles.GAMEMASTER, CampaignMemberRoles.WRITER] as const;

function sortCalendars(a: FantasyCalendarRecord, b: FantasyCalendarRecord): number {
  if (a.isMasterTime !== b.isMasterTime) return a.isMasterTime ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function sortCalendarsList(list: FantasyCalendarRecord[]): FantasyCalendarRecord[] {
  return [...list].sort(sortCalendars);
}

export function TimeTrackingManagement() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const { campaign } = useWiki();
  const canManage =
    campaign?.role !== undefined &&
    MANAGE_ROLES.includes(campaign.role as (typeof MANAGE_ROLES)[number]);

  const [calendars, setCalendars] = useState<FantasyCalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [calendarImportFile, setCalendarImportFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!campaignHandle || !canManage) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listFantasyCalendars(campaignHandle);
      setCalendars(list);
      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendars');
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = calendars.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setDraft(recordToDraft(selected));
    } else {
      setDraft(null);
    }
  }, [selected]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleSave = async () => {
    if (!campaignHandle || !selectedId || !draft) return;
    let leapDays: unknown;
    try {
      leapDays = JSON.parse(draft.leapDaysJson || '[]');
      if (!Array.isArray(leapDays)) {
        throw new Error('Leap rules must be a JSON array');
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Invalid leap rules JSON');
      return;
    }

    setSaving(true);
    try {
      const updated = await patchFantasyCalendar(campaignHandle, selectedId, {
        name: draft.name.trim(),
        isMasterTime: draft.isMasterTime,
        epochOffset: draft.epochOffset,
        weekdays: draft.weekdays.map((w) => ({
          name: w.name.trim() || 'Day',
          length: w.length,
        })),
        months: draft.months.map((m) => ({
          name: m.name.trim() || 'Month',
          length: m.length,
          type: m.type,
          climateAspect: m.climateAspect,
        })),
        seasons: draft.seasons.map((s) => ({
          name: s.name.trim() || 'Season',
          startMonthIndex: s.startMonthIndex,
          startDay: s.startDay,
        })),
        moons: draft.moons.map((m) => ({
          name: m.name.trim() || 'Moon',
          cycleDays: m.cycleDays,
        })),
        leapDays,
      });
      setCalendars((prev) =>
        sortCalendarsList(
          prev.map((c) => {
            if (c.id === updated.id) return updated;
            if (updated.isMasterTime) return { ...c, isMasterTime: false };
            return c;
          }),
        ),
      );
      setDraft(recordToDraft(updated));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!campaignHandle) return;
    setCreating(true);
    try {
      const cal = await createFantasyCalendar(campaignHandle, {});
      setCalendars((prev) => sortCalendarsList([cal, ...prev]));
      setSelectedId(cal.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (cal: FantasyCalendarRecord) => {
    if (cal.isMasterTime) {
      window.alert('Cannot delete the master chronology. Promote another calendar first.');
      return;
    }
    if (!window.confirm(`Delete “${cal.name}”? This cannot be undone.`)) return;
    if (!campaignHandle) return;
    try {
      await deleteFantasyCalendar(campaignHandle, cal.id);
      setCalendars((prev) => prev.filter((c) => c.id !== cal.id));
      if (selectedId === cal.id) {
        setSelectedId(null);
        setDraft(null);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (!campaignHandle) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Missing campaign"
        description="No campaign slug in the URL."
      />
    );
  }

  if (!canManage) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Restricted"
        description="Only the DM or Co-DM can manage fantasy calendars."
      />
    );
  }

  if (loading) {
    return <LoadingSpinner label="Loading chronologies…" />;
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <FantasyCalendarImportZone
        campaignHandle={campaignHandle}
        mode="import"
        selectedFile={calendarImportFile}
        onFileSelected={setCalendarImportFile}
        onImportComplete={async (result) => {
          await load();
          if (result.calendarId) {
            setSelectedId(result.calendarId);
          }
        }}
      />
      <header className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Time tracking</h1>
          <p className="text-sm text-muted">
            Configure fantasy calendars, master clock weighting, and month structures.
          </p>
          {canManage ? (
            <p className="mt-2 text-sm">
              <Link
                to={campaignWorldAdvancePath(campaignHandle)}
                className="text-primary hover:underline"
              >
                Advance world state
              </Link>
              <span className="text-muted"> — batch faction, conflict, economy, and NPC changes</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/60 bg-primary/10/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15/40 disabled:opacity-50"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          New chronology
        </button>
      </header>

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid min-h-[480px] gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <aside className="rounded-xl border border-border bg-surface/40 p-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Timelines
          </h2>
          {calendars.length === 0 ? (
            <p className="text-sm text-muted">
              No calendars yet. Create one to attach a chronology definition to this campaign.
            </p>
          ) : (
            <ul className="space-y-2">
              {sortCalendarsList(calendars).map((cal) => (
                <li key={cal.id}>
                  <div
                    className={`flex rounded-lg border p-2 transition-colors ${
                      cal.id === selectedId
                        ? 'border-primary/50 bg-elevated/80'
                        : 'border-border bg-background/50 hover:border-border'
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm font-medium text-foreground"
                      onClick={() => handleSelect(cal.id)}
                    >
                      <span className="block truncate">{cal.name}</span>
                      {cal.isMasterTime && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <Crown className="size-3" />
                          Master clock
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      title={cal.isMasterTime ? 'Cannot delete master' : 'Delete'}
                      disabled={cal.isMasterTime}
                      onClick={() => void handleDelete(cal)}
                      className="ml-1 shrink-0 rounded p-1.5 text-muted hover:bg-red-950/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="min-w-0 rounded-xl border border-border bg-surface/30 p-4 sm:p-6">
          {!selected || !draft ? (
            <p className="text-sm text-muted">
              Select a timeline on the left or create a new chronology.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted">Name</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted">
                    Epoch offset (minutes)
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draft.epochOffset}
                    onChange={(e) => setDraft({ ...draft, epochOffset: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                  />
                  <span className="text-[10px] text-muted">
                    Shifts this calendar relative to the campaign master epoch.
                  </span>
                </label>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={draft.isMasterTime}
                  onChange={(e) => setDraft({ ...draft, isMasterTime: e.target.checked })}
                  className="rounded border-border bg-surface text-primary0 focus:ring-primary/40"
                />
                <Crown className="size-4 text-primary" />
                Use as universal master execution clock for this campaign
                <span className="text-xs text-muted">
                  (others are cleared automatically when you save)
                </span>
              </label>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Months & festivals</h3>
                <p className="mb-2 text-xs text-muted">
                  Intercalary entries are festival days outside the standard weekday grid.
                </p>
                <MonthEditor
                  rows={draft.months}
                  onChange={(months) => setDraft({ ...draft, months })}
                />
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Weekday cycle</h3>
                <WeekdayEditor
                  rows={draft.weekdays}
                  onChange={(weekdays) => setDraft({ ...draft, weekdays })}
                />
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Celestial Bodies (Moons)</h3>
                <MoonEditor rows={draft.moons} onChange={(moons) => setDraft({ ...draft, moons })} />
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground">World Climate Seasons</h3>
                <SeasonEditor
                  rows={draft.seasons}
                  onChange={(seasons) => setDraft({ ...draft, seasons })}
                />
              </section>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted">
                  Leap rules (JSON array)
                </span>
                <textarea
                  value={draft.leapDaysJson}
                  onChange={(e) => setDraft({ ...draft, leapDaysJson: e.target.value })}
                  rows={5}
                  spellCheck={false}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/50"
                />
              </label>

              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save configuration
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MonthEditor({
  rows,
  onChange,
}: {
  rows: MonthFormRow[];
  onChange: (rows: MonthFormRow[]) => void;
}) {
  const update = (index: number, patch: Partial<MonthFormRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const add = () =>
    onChange([
      ...rows,
      { name: 'New month', length: 30, type: 'standard', climateAspect: DEFAULT_CLIMATE_ASPECT },
    ]);
  const remove = (index: number) =>
    onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : rows);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background/50 p-2"
        >
          <label className="min-w-[120px] flex-1 space-y-0.5">
            <span className="text-[10px] uppercase text-muted">Title</span>
            <input
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          </label>
          <label className="w-20 space-y-0.5">
            <span className="text-[10px] uppercase text-muted">Days</span>
            <input
              type="number"
              min={1}
              value={row.length}
              onChange={(e) =>
                update(i, { length: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            />
          </label>
          <label className="min-w-[160px] flex-1 space-y-0.5">
            <span className="text-[10px] uppercase text-muted">Primary climatic aspect</span>
            <select
              value={row.climateAspect}
              onChange={(e) =>
                update(i, { climateAspect: normalizeClimateAspect(e.target.value) })
              }
              className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            >
              {CLIMATE_ASPECT_EDITOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="w-44 space-y-0.5">
            <span className="text-[10px] uppercase text-muted">Type</span>
            <select
              value={row.type}
              onChange={(e) =>
                update(i, { type: e.target.value === 'intercalary' ? 'intercalary' : 'standard' })
              }
              className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
            >
              <option value="standard">Standard month</option>
              <option value="intercalary">Intercalary festival</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded p-2 text-muted hover:bg-elevated hover:text-red-300"
            title="Remove row"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs font-medium text-primary hover:text-primary"
      >
        + Add month or festival
      </button>
    </div>
  );
}

function WeekdayEditor({
  rows,
  onChange,
}: {
  rows: WeekdayFormRow[];
  onChange: (rows: WeekdayFormRow[]) => void;
}) {
  const update = (index: number, patch: Partial<WeekdayFormRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const add = () => onChange([...rows, { name: 'Day', length: 1 }]);
  const remove = (index: number) =>
    onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : rows);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <input
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Weekday name"
            className="min-w-[100px] flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-1 text-xs text-muted">
            span
            <input
              type="number"
              min={1}
              value={row.length}
              onChange={(e) =>
                update(i, { length: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="w-16 rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <button type="button" onClick={() => remove(i)} className="text-muted hover:text-red-300">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-medium text-primary">
        + Weekday slot
      </button>
    </div>
  );
}

function MoonEditor({
  rows,
  onChange,
}: {
  rows: MoonFormRow[];
  onChange: (rows: MoonFormRow[]) => void;
}) {
  const update = (index: number, patch: Partial<MoonFormRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const add = () => onChange([...rows, { name: 'Moon', cycleDays: 29.5 }]);
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-muted">No moons — optional for display.</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <input
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="min-w-[100px] flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-1 text-xs text-muted">
            cycle (days)
            <input
              type="number"
              step="any"
              min={0.1}
              value={row.cycleDays}
              onChange={(e) =>
                update(i, {
                  cycleDays: Math.max(0.1, parseFloat(e.target.value) || 29.5),
                })
              }
              className="w-24 rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <button type="button" onClick={() => remove(i)} className="text-muted hover:text-red-300">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-medium text-primary">
        + Add Moon
      </button>
    </div>
  );
}

function SeasonEditor({
  rows,
  onChange,
}: {
  rows: SeasonFormRow[];
  onChange: (rows: SeasonFormRow[]) => void;
}) {
  const update = (index: number, patch: Partial<SeasonFormRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const add = () => onChange([...rows, { name: 'Season', startMonthIndex: 0, startDay: 1 }]);
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-muted">Optional seasons.</p>}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <input
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="min-w-[100px] flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <label className="text-xs text-muted">
            start month #
            <input
              type="number"
              min={0}
              value={row.startMonthIndex}
              onChange={(e) =>
                update(i, {
                  startMonthIndex: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="ml-1 w-16 rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <label className="text-xs text-muted">
            day
            <input
              type="number"
              min={1}
              value={row.startDay}
              onChange={(e) =>
                update(i, { startDay: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="ml-1 w-14 rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <button type="button" onClick={() => remove(i)} className="text-muted hover:text-red-300">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs font-medium text-primary">
        + Add Season
      </button>
    </div>
  );
}
