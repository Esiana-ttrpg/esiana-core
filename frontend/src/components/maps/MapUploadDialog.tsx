import { useEffect, useState } from 'react';
import { mapTitleFromFilename } from '@/lib/maps';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';

interface MapUploadDialogProps {
  file: File | null;
  uploading: boolean;
  error?: string | null;
  onClose: () => void;
  onUpload: (file: File, displayName: string) => Promise<void>;
}

export function MapUploadDialog({
  file,
  uploading,
  error,
  onClose,
  onUpload,
}: MapUploadDialogProps) {
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setDisplayName(file ? mapTitleFromFilename(file.name) : '');
  }, [file]);

  if (!file) return null;

  const title = displayName.trim();
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <form
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-upload-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (title) void onUpload(file, title);
        }}
      >
        <h3 id="map-upload-title" className={TYPE_DISPLAY_CLASS}>Upload map</h3>
        <p className="mt-2 truncate text-sm text-muted" title={file.name}>
          {file.name}
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor="map-display-name">
          Map title
        </label>
        <input
          id="map-display-name"
          autoFocus
          value={displayName}
          disabled={uploading}
          onChange={(event) => setDisplayName(event.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/10"
            disabled={uploading}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground disabled:opacity-50"
            disabled={uploading || !title}
          >
            {uploading ? 'Uploading…' : 'Upload map'}
          </button>
        </div>
      </form>
    </div>
  );
}
