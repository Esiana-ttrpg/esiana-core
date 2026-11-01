import { EVENT_CATEGORY_ICONS, isEventCategoryIcon, type EventCategoryIcon } from '@shared/defaultEventCategories';
import { ChronologyCategoryLabel } from '@/components/chronology/ChronologyCategoryLabel';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowDown, ArrowUp, Calendar, Plus, Save, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { controlClasses } from '@/components/ui/formStyles';
import { fetchChronologySettings, updateChronologySettings, type EventImportance } from '@/lib/chronologySettingsApi';
import { createChronologyCategory, deleteChronologyCategory, listChronologyCategories, updateChronologyCategory, type ChronologyCategoryRecord } from '@/lib/chronologyCategoriesApi';

interface Props { campaignHandle: string }
const levels: EventImportance[] = ['NOTICE', 'MINOR', 'MAJOR'];

export function TimelineSettingsTab({ campaignHandle }: Props) {
  const [settings, setSettings] = useState({ manualEventImportance: 'MINOR' as EventImportance, downtimeEventImportance: 'NOTICE' as EventImportance, progressionEventImportance: 'NOTICE' as EventImportance });
  const [categories, setCategories] = useState<ChronologyCategoryRecord[]>([]);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8b9bb4');
  const [newIcon, setNewIcon] = useState<EventCategoryIcon | ''>('');
  const categoryBusy = useRef(false);
  const [categoryMutating, setCategoryMutating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nextSettings, nextCategories] = await Promise.all([fetchChronologySettings(campaignHandle), listChronologyCategories(campaignHandle)]);
      setSettings({ manualEventImportance: nextSettings.manualEventImportance, downtimeEventImportance: nextSettings.downtimeEventImportance, progressionEventImportance: nextSettings.progressionEventImportance });
      setCategories(nextCategories);
      setDraftNames(Object.fromEntries(nextCategories.map((category) => [category.id, category.name])));
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load timeline settings.'); }
    finally { setLoading(false); }
  }, [campaignHandle]);
  useEffect(() => { void load(); }, [load]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setSuccess(false);
    try { await updateChronologySettings(campaignHandle, settings); setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save timeline settings.'); }
    finally { setSaving(false); }
  }
  // The ref also covers blur -> click within one render, before disabled controls update.
  async function mutateCategory(operation: () => Promise<void>) {
    if (categoryBusy.current) return;
    categoryBusy.current = true;
    setCategoryMutating(true);
    setError(null);
    try { await operation(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update categories.'); }
    finally { categoryBusy.current = false; setCategoryMutating(false); }
  }
  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    await mutateCategory(async () => {
      const created = await createChronologyCategory(campaignHandle, { name: newName.trim(), color: newColor, icon: newIcon || null });
      setCategories(current => [...current, created]);
      setDraftNames(current => ({ ...current, [created.id]: created.name }));
      setNewName('');
    });
  }
  async function saveCategoryName(category: ChronologyCategoryRecord) {
    const name = (draftNames[category.id] ?? category.name).trim();
    if (!name || name === category.name) return;
    await mutateCategory(async () => {
      const updated = await updateChronologyCategory(campaignHandle, category.id, { name });
      setCategories(current => current.map(item => item.id === category.id ? updated : item));
      setDraftNames(current => ({ ...current, [category.id]: updated.name }));
    });
  }
  async function editCategoryColor(category: ChronologyCategoryRecord, color: string) {
    await mutateCategory(async () => {
      const updated = await updateChronologyCategory(campaignHandle, category.id, { color });
      setCategories(current => current.map(item => item.id === category.id ? updated : item));
    });
  }
  async function editCategoryIcon(category: ChronologyCategoryRecord, icon: string) {
    if (icon !== '' && !isEventCategoryIcon(icon)) return;
    await mutateCategory(async () => {
      const updated = await updateChronologyCategory(campaignHandle, category.id, { icon: icon || null });
      setCategories(current => current.map(item => item.id === category.id ? updated : item));
    });
  }
  async function moveCategory(index: number, direction: -1 | 1) {
    if (categoryBusy.current) return;
    const reordered = [...categories];
    const destination = index + direction;
    if (destination < 0 || destination >= reordered.length) return;
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    await mutateCategory(async () => {
      await updateChronologyCategory(campaignHandle, categories[index].id, { orderedCategoryIds: reordered.map(category => category.id) });
      setCategories(reordered);
    });
  }
  async function removeCategory(category: ChronologyCategoryRecord) {
    if (categoryBusy.current || !window.confirm(`Delete ${category.name}? Its events become Uncategorized.`)) return;
    await mutateCategory(async () => {
      await deleteChronologyCategory(campaignHandle, category.id);
      setCategories(current => current.filter(item => item.id !== category.id));
    });
  }
  if (loading) return <LoadingSpinner label="Loading timeline settings…" />;
  return <div className="space-y-6">
    <div className="rounded-lg border border-border bg-surface p-6"><div className="mb-2 flex items-center gap-2"><Calendar className="size-5 text-primary" /><h2 className="text-lg font-semibold text-white">Timeline events</h2></div><p className="mb-5 text-sm text-muted">Defaults affect newly created events only; existing events keep their saved values.</p><form onSubmit={saveSettings} className="space-y-4"><div className="grid gap-4 sm:grid-cols-3">{(['manualEventImportance', 'downtimeEventImportance', 'progressionEventImportance'] as const).map((key) => <label key={key} className="text-sm"><span className="mb-1 block text-xs text-muted">{key === 'manualEventImportance' ? 'Manual events' : key === 'downtimeEventImportance' ? 'Downtime events' : 'Progression events'}</span><select className={controlClasses} value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value as EventImportance }))}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label>)}</div><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-background"><Save className="size-4" />{saving ? 'Saving…' : 'Save defaults'}</button></form></div>
    <fieldset disabled={categoryMutating} className="rounded-lg border border-border bg-surface p-6"><h3 className="mb-1 text-lg font-semibold text-white">Categories</h3><p className="mb-4 text-sm text-muted">Uncategorized is the fallback for events without a category.</p><form onSubmit={addCategory} className="mb-4 flex flex-wrap gap-2"><input className={controlClasses} placeholder="Category name" value={newName} onChange={(event) => setNewName(event.target.value)} /><input type="color" className="h-9 w-12 rounded border border-border bg-background" value={newColor} onChange={(event) => setNewColor(event.target.value)} /><select aria-label="New category icon" className={controlClasses} value={newIcon} onChange={event => setNewIcon(event.target.value as EventCategoryIcon | '')}><option value="">Default icon</option>{EVENT_CATEGORY_ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select><button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm"><Plus className="size-4" />Add</button></form><div className="space-y-2">{categories.map((category, index) => <div key={category.id} className="flex flex-wrap items-center gap-2"><ChronologyCategoryLabel category={category} /><button type="button" disabled={categoryMutating || index === 0} onClick={() => void moveCategory(index, -1)} aria-label={`Move ${category.name} up`}><ArrowUp className="size-4" /></button><button type="button" disabled={categoryMutating || index === categories.length - 1} onClick={() => void moveCategory(index, 1)} aria-label={`Move ${category.name} down`}><ArrowDown className="size-4" /></button><input className={`${controlClasses} flex-1`} value={draftNames[category.id] ?? category.name} onChange={(event) => setDraftNames((current) => ({ ...current, [category.id]: event.target.value }))} onBlur={() => void saveCategoryName(category)} /><input type="color" className="h-9 w-12 rounded border border-border bg-background" value={category.color ?? '#8b9bb4'} onChange={(event) => void editCategoryColor(category, event.target.value)} /><select aria-label={`Icon for ${category.name}`} className={controlClasses} value={category.icon ?? ''} onChange={event => void editCategoryIcon(category, event.target.value)}><option value="">Default icon</option>{category.icon && !isEventCategoryIcon(category.icon) && <option value={category.icon}>Legacy icon ({category.icon})</option>}{EVENT_CATEGORY_ICONS.map(icon => <option key={icon.value} value={icon.value}>{icon.label}</option>)}</select><button type="button" onClick={() => void removeCategory(category)} className="rounded border border-red-800/60 p-2 text-red-300" aria-label={`Delete ${category.name}`}><Trash2 className="size-4" /></button></div>)}</div></fieldset>
    {error ? <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</p> : null}{success ? <p className="rounded border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">Timeline settings saved.</p> : null}
  </div>;
}
