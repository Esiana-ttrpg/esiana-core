import { FormEvent, useEffect, useState } from 'react';
import { HardDrive, Upload } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchAdminSettings, updateAdminSettings } from '@/lib/adminSettings';
import type { SystemSettings } from '@/types/admin';
import {
  AdminSectionCard,
  FieldLabel,
  ToggleRow,
} from '@/components/admin/AdminSectionCard';
import { controlClasses } from '@/components/admin/adminFormStyles';

const IMAGE_TYPE_OPTIONS = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPEG' },
  { id: 'webp', label: 'WEBP' },
  { id: 'gif', label: 'GIF' },
  { id: 'svg', label: 'SVG' },
] as const;

function parseImageTypes(raw: string): Set<string> {
  return new Set(
    raw
      .split(/[\s,;]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

function serializeImageTypes(selected: Set<string>): string {
  return IMAGE_TYPE_OPTIONS.filter((opt) => selected.has(opt.id))
    .map((opt) => opt.id)
    .join(',');
}

export function AdminAssetsUploadsForm() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState('10');
  const [mapMaxUploadSizeMb, setMapMaxUploadSizeMb] = useState('');
  const [mapDisplayMaxEdge, setMapDisplayMaxEdge] = useState('8192');
  const [mapThumbMaxEdge, setMapThumbMaxEdge] = useState('2048');
  const [mapPreserveFullRes, setMapPreserveFullRes] = useState(true);
  const [allowedTypes, setAllowedTypes] = useState<Set<string>>(
    new Set(['png', 'jpeg', 'webp']),
  );
  const [maxImageWidth, setMaxImageWidth] = useState('16384');
  const [maxImageHeight, setMaxImageHeight] = useState('16384');
  const [urlImportsEnabled, setUrlImportsEnabled] = useState(true);
  const [urlImportAllowHttp, setUrlImportAllowHttp] = useState(false);
  const [urlImportMaxDownloadMb, setUrlImportMaxDownloadMb] = useState('50');
  const [urlImportTimeoutSeconds, setUrlImportTimeoutSeconds] = useState('15');

  function applySettings(row: SystemSettings) {
    setMaxUploadSizeMb(String(row.uploads.maxUploadSizeMb));
    setMapMaxUploadSizeMb(
      row.uploads.mapMaxUploadSizeMb ? String(row.uploads.mapMaxUploadSizeMb) : '',
    );
    setMapDisplayMaxEdge(String(row.uploads.mapDisplayMaxEdge));
    setMapThumbMaxEdge(String(row.uploads.mapThumbMaxEdge));
    setMapPreserveFullRes(row.uploads.mapPreserveFullRes);
    setAllowedTypes(parseImageTypes(row.uploads.allowedImageTypes ?? 'png,jpeg,webp'));
    setMaxImageWidth(String(row.uploads.maxImageWidth ?? 16384));
    setMaxImageHeight(String(row.uploads.maxImageHeight ?? 16384));
    setUrlImportsEnabled(row.urlImports?.enabled ?? true);
    setUrlImportAllowHttp(row.urlImports?.allowHttp ?? false);
    setUrlImportMaxDownloadMb(String(row.urlImports?.maxDownloadMb ?? 50));
    setUrlImportTimeoutSeconds(String(row.urlImports?.timeoutSeconds ?? 15));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminSettings()
      .then((row) => {
        if (!cancelled) applySettings(row);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load settings.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const parsedMaxUpload = Number.parseInt(maxUploadSizeMb, 10);
    if (!Number.isInteger(parsedMaxUpload) || parsedMaxUpload < 1) {
      setSaveError('Max upload size must be a positive whole number of MB.');
      setSaving(false);
      return;
    }

    const parsedMapDisplayEdge = Number.parseInt(mapDisplayMaxEdge, 10);
    const parsedMapThumbEdge = Number.parseInt(mapThumbMaxEdge, 10);
    const parsedMaxWidth = Number.parseInt(maxImageWidth, 10);
    const parsedMaxHeight = Number.parseInt(maxImageHeight, 10);
    const parsedMaxDownload = Number.parseInt(urlImportMaxDownloadMb, 10);
    const parsedTimeout = Number.parseInt(urlImportTimeoutSeconds, 10);

    const trimmedMapMax = mapMaxUploadSizeMb.trim();
    let parsedMapMaxUpload: number | null = null;
    if (trimmedMapMax) {
      parsedMapMaxUpload = Number.parseInt(trimmedMapMax, 10);
      if (!Number.isInteger(parsedMapMaxUpload) || parsedMapMaxUpload < 1) {
        setSaveError('Map max upload size must be a positive integer or blank.');
        setSaving(false);
        return;
      }
    }

    if (allowedTypes.size === 0) {
      setSaveError('Select at least one allowed image type.');
      setSaving(false);
      return;
    }

    try {
      await updateAdminSettings({
        uploads: {
          maxUploadSizeMb: parsedMaxUpload,
          mapMaxUploadSizeMb: parsedMapMaxUpload,
          mapDisplayMaxEdge: parsedMapDisplayEdge,
          mapThumbMaxEdge: parsedMapThumbEdge,
          mapPreserveFullRes,
          allowedImageTypes: serializeImageTypes(allowedTypes),
          maxImageWidth: parsedMaxWidth,
          maxImageHeight: parsedMaxHeight,
        },
        urlImports: {
          enabled: urlImportsEnabled,
          allowHttp: urlImportAllowHttp,
          maxDownloadMb: parsedMaxDownload,
          timeoutSeconds: parsedTimeout,
        },
      });
      setSaveMessage('Assets & upload settings saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <AdminSectionCard
        title="Upload Guardrails"
        description="File size and image validation for avatars, wiki images, portraits, and maps."
        icon={Upload}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Max upload size (MB)</FieldLabel>
            <input
              type="number"
              min={1}
              value={maxUploadSizeMb}
              onChange={(e) => setMaxUploadSizeMb(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Map max upload size (MB)</FieldLabel>
            <input
              type="number"
              min={1}
              value={mapMaxUploadSizeMb}
              onChange={(e) => setMapMaxUploadSizeMb(e.target.value)}
              placeholder="Use general limit"
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Max image width (px)</FieldLabel>
            <input
              type="number"
              min={256}
              value={maxImageWidth}
              onChange={(e) => setMaxImageWidth(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Max image height (px)</FieldLabel>
            <input
              type="number"
              min={256}
              value={maxImageHeight}
              onChange={(e) => setMaxImageHeight(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Allowed image types</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-3">
              {IMAGE_TYPE_OPTIONS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowedTypes.has(opt.id)}
                    onChange={(e) => {
                      setAllowedTypes((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(opt.id);
                        else next.delete(opt.id);
                        return next;
                      });
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Cartography Processing"
        description="Map display and thumbnail variants generated at upload time."
        icon={Upload}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Map display max edge (px)</FieldLabel>
            <input
              type="number"
              min={512}
              max={16384}
              value={mapDisplayMaxEdge}
              onChange={(e) => setMapDisplayMaxEdge(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Map thumbnail max edge (px)</FieldLabel>
            <input
              type="number"
              min={128}
              max={4096}
              value={mapThumbMaxEdge}
              onChange={(e) => setMapThumbMaxEdge(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div className="sm:col-span-2">
            <ToggleRow
              label="Preserve full-resolution map originals"
              description="Keep the original upload alongside display and thumbnail variants."
              checked={mapPreserveFullRes}
              onChange={setMapPreserveFullRes}
            />
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="URL Imports"
        description="Remote image import into managed assets. SSRF protections always apply."
        icon={HardDrive}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ToggleRow
              label="Enable URL imports"
              description="Allow importing images from external URLs into campaign assets."
              checked={urlImportsEnabled}
              onChange={setUrlImportsEnabled}
            />
          </div>
          <div className="sm:col-span-2">
            <ToggleRow
              label="Allow HTTP URLs"
              description="When off, only HTTPS import sources are accepted."
              checked={urlImportAllowHttp}
              onChange={setUrlImportAllowHttp}
            />
          </div>
          <div>
            <FieldLabel>Max download size (MB)</FieldLabel>
            <input
              type="number"
              min={1}
              max={500}
              value={urlImportMaxDownloadMb}
              onChange={(e) => setUrlImportMaxDownloadMb(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Download timeout (seconds)</FieldLabel>
            <input
              type="number"
              min={5}
              max={120}
              value={urlImportTimeoutSeconds}
              onChange={(e) => setUrlImportTimeoutSeconds(e.target.value)}
              className={controlClasses}
            />
          </div>
        </div>
      </AdminSectionCard>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
      {saveMessage ? <p className="text-sm text-emerald-400">{saveMessage}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
