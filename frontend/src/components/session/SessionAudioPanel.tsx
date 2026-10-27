import { useCallback, useEffect, useRef, useState } from 'react';
import { audioRequest, assetUploadBase, formatAudioTime, type RecordingView, type ChapterView, type NativeTranscript,
  type TranscriptSegmentInput, type AudioSettingsPayload } from '@/lib/sessionAudio';
import { apiFetch } from '@/lib/api';
import { getOrCreateUploadRetryKey } from '@/lib/uploadRetryKey';
import { useWiki } from '@/contexts/WikiContext';
import { resolveCanonicalPagePath } from '@/lib/campaignPaths';

const button = 'rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50';
const field = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
type Upload = { id: string; name: string; offsetBytes: string; sizeBytes: string; status: string; fileId?: string };
type Job = { id: string; status: string; failureCode: string | null };
export function SessionAudioPanel({ campaignHandle, timelineId }: { campaignHandle: string; timelineId: string }) {
  const { flatPages } = useWiki();
  const [recordings, setRecordings] = useState<RecordingView[]>([]), [selected, setSelected] = useState('');
  const [settings, setSettings] = useState<AudioSettingsPayload | null>(null), [error, setError] = useState('');
  const [tab, setTab] = useState<'chapters' | 'transcript' | 'files'>('chapters');
  const [fileIndex, setFileIndex] = useState(0), [position, setPosition] = useState(0), [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1), [sticky, setSticky] = useState(false);
  const [chapter, setChapter] = useState<{ id?: string; title: string; description: string; startMs: number; wikiPageId: string }>({ title: '', description: '', startMs: 0, wikiPageId: '' });
  const [chapterOpen, setChapterOpen] = useState(false), [transcript, setTranscript] = useState<NativeTranscript | null>(null);
  const [segments, setSegments] = useState<TranscriptSegmentInput[]>([]), [search, setSearch] = useState('');
  const [resultJobId, setResultJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]), [upload, setUpload] = useState<Upload | null>(null), [busy, setBusy] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]), [uploadIndex, setUploadIndex] = useState(0);
  const [timelineReview, setTimelineReview] = useState<{ revision: number; fileIds: string[];
    affected: { id: string; label: string }[]; resolutions: Record<string, { mode: string; fileId: string; startMs: number; endMs?: number }> } | null>(null);
  const timelineDialog = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLAudioElement>(null), player = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const pendingSeek = useRef<{ localMs: number; play: boolean } | null>(null), abort = useRef<AbortController | null>(null);
  const recording = recordings.find((r) => r.id === selected) ?? recordings[0];
  const caps = settings?.capabilities ?? [], canManage = caps.includes('audio.manage');
  const canChapters = caps.includes('audio.chapters.edit') && (canManage || settings?.settings.allowChapters);
  const canTranscript = caps.includes('audio.transcript.edit') && (canManage || settings?.settings.allowTranscripts);
  const canTranscribe = caps.includes('audio.transcribe');
  const canUpload = settings?.global.enabled && settings.settings.enabled && caps.includes('assets.upload') && (canManage || settings.settings.allowContributors);
  const request = useCallback(<T,>(path: string, method = 'GET', body?: unknown, headers?: Record<string, string>) => path.startsWith('/uploads') ?
    apiFetch<T>(`${assetUploadBase(campaignHandle)}${path.slice('/uploads'.length)}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...(headers ? { headers: { 'Content-Type': 'application/json', ...headers } } : {}) }) :
    audioRequest<T>(campaignHandle, path, method, body, headers), [campaignHandle]);
  const reload = useCallback(async () => {
    const [rows, config] = await Promise.all([request<RecordingView[]>(`/sessions/${timelineId}/recordings`), request<AudioSettingsPayload>('/settings')]);
    setRecordings(rows); setSettings(config);
  }, [request, timelineId]);
  const run = async (action: () => Promise<unknown>) => { setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete action'); } };
  useEffect(() => { setSelected(''); setFileIndex(0); setPosition(0); void run(reload); return () => abort.current?.abort(); }, [reload]);
  useEffect(() => {
    if (!recording) { setTranscript(null); return; }
    void request<NativeTranscript>(`/recordings/${recording.id}/transcript`).then((data) => { setTranscript(data); setSegments(data.current?.segments ?? []); }).catch((e) => setError(e.message));
    if (!canTranscript && !canTranscribe) return;
    const loadJobs = () => request<Job[]>(`/recordings/${recording.id}/jobs`).then(setJobs).catch(() => {});
    void loadJobs(); const timer = window.setInterval(loadJobs, 4000); return () => window.clearInterval(timer);
  }, [recording?.id, request, canTranscript, canTranscribe]);
  useEffect(() => {
    const node = player.current; if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setSticky(!entry.isIntersecting)); observer.observe(node); return () => observer.disconnect();
  }, [recording?.id]);
  useEffect(() => { if (audio.current) { audio.current.playbackRate = speed; audio.current.volume = volume; } }, [speed, volume, fileIndex]);
  useEffect(() => { if (chapterOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [chapterOpen]);
  useEffect(() => { if (timelineReview) timelineDialog.current?.showModal(); else timelineDialog.current?.close(); }, [Boolean(timelineReview)]);
  function seek(ms: number, play = false) {
    if (!recording) return;
    const index = recording.files.findIndex((f, i) => ms >= f.offsetMs && (ms < f.offsetMs + f.durationMs || i === recording.files.length - 1));
    if (index < 0) return;
    const localMs = ms - recording.files[index].offsetMs;
    setPosition(ms);
    if (index === fileIndex && audio.current) { audio.current.currentTime = localMs / 1000; if (play) void audio.current.play().catch(() => {}); }
    else { pendingSeek.current = { localMs, play }; setFileIndex(index); }
  }
  function openChapter(ms: number, existing?: ChapterView) {
    setChapter({ id: existing?.id, title: existing?.title ?? '', description: existing?.description ?? '', startMs: ms, wikiPageId: existing?.wikiPageId ?? '' }); setChapterOpen(true);
  }
  async function loadTranscript(revisionId?: string) {
    if (!recording) return;
    const data = await request<NativeTranscript>(`/recordings/${recording.id}/transcript${revisionId ? `?revisionId=${encodeURIComponent(revisionId)}` : ''}`);
    setTranscript(data); setSegments(data.current?.segments ?? []); setResultJobId(null);
  }
  async function saveSegments(next: TranscriptSegmentInput[], imported = false) {
    if (!recording) return;
    await request(`/recordings/${recording.id}/transcript/revisions`, 'POST', { expectedRevision: transcript?.revision ?? 0, segments: next,
      ...(resultJobId ? { sourceJobId: resultJobId } : transcript?.current ? { baseRevisionId: transcript.current.id } : {}) });
    await loadTranscript();
  }
  async function uploadFiles(files = pendingFiles, startIndex = uploadIndex) {
    if (!recording) return;
    setBusy(true); const controller = new AbortController(); abort.current = controller;
    try {
      for (let i = startIndex; i < files.length; i++) {
        setUploadIndex(i);
        const file = files[i];
        const key = `esiana-audio:${campaignHandle}:${recording.id}:${file.name}:${file.size}:${file.lastModified}`;
        const creationKey = `${key}:create-key`;
        let session: Upload | null = null;
        const previous = localStorage.getItem(key);
        if (previous) { try { session = await request<Upload>(`/uploads/${previous}`); } catch { localStorage.removeItem(key); } }
        if (session && ['appending', 'finalizing'].includes(session.status)) throw new Error('This upload is still processing. Retry shortly to resume.');
        if (session && !['uploading', 'complete'].includes(session.status)) localStorage.removeItem(creationKey);
        if (!session || !['uploading', 'complete'].includes(session.status)) {
          const retryKey = getOrCreateUploadRetryKey(creationKey);
          session = await request<Upload>('/uploads', 'POST', { recordingId: recording.id, name: file.name, sizeBytes: String(file.size) }, { 'Idempotency-Key': retryKey });
        }
        localStorage.setItem(key, session.id); setUpload(session);
        let offset = Number(session.offsetBytes);
        while (offset < file.size) {
          if (controller.signal.aborted) throw new Error('Upload paused. Select Retry to resume.');
          const blob = file.slice(offset, offset + 8388608);
          const progress = await apiFetch<{ offsetBytes: string }>(`${assetUploadBase(campaignHandle)}/${session.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/octet-stream', 'Upload-Offset': String(offset) }, body: blob, signal: controller.signal });
          offset = Number(progress.offsetBytes); setUpload({ ...session, offsetBytes: String(offset) });
        }
        await request(`/uploads/${session.id}/finalize`, 'POST', {}); localStorage.removeItem(key); localStorage.removeItem(creationKey); setUpload(null); await reload();
      }
      setPendingFiles([]); setUploadIndex(0);
    } finally { setBusy(false); }
  }
  async function changeFiles(fileIds: string[]) {
    if (!recording) return;
    const preview = await request<{ revision: number; affectedChapters: { id: string; title: string }[]; affectedSegments: { id: string; startMs: number; endMs: number }[] }>(`/recordings/${recording.id}/timeline/preview`, 'POST', { fileIds });
    const affected = [...preview.affectedChapters.map((c) => ({ id: c.id, label: `Chapter: ${c.title}` })),
      ...preview.affectedSegments.map((s) => ({ id: s.id, label: `Transcript ${formatAudioTime(s.startMs)}–${formatAudioTime(s.endMs)}` }))];
    if (affected.length) {
      setTimelineReview({ revision: preview.revision, fileIds, affected, resolutions: Object.fromEntries(affected.map((item) => [item.id,
        { mode: '', fileId: fileIds[0] ?? '', startMs: 0, ...(preview.affectedSegments.some((s) => s.id === item.id) ? { endMs: 1000 } : {}) }])) }); return;
    }
    await request(`/recordings/${recording.id}/timeline/commit`, 'POST', { expectedRevision: preview.revision, fileIds, resolutions: {} });
    setFileIndex(0); setPosition(0); await reload(); await loadTranscript();
  }
  if (!recording && !canUpload) return error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null;
  return <section aria-label="Session recording" className="min-w-0 space-y-4">
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {canUpload && <div className="flex flex-wrap gap-2">
      <button className={button} onClick={() => void run(async () => { const title = window.prompt('Recording title', 'Session recording'); if (!title?.trim()) return;
        const created = await request<RecordingView>(`/sessions/${timelineId}/recordings`, 'POST', { title: title.trim() }); setSelected(created.id); setFileIndex(0); await reload(); })}>Add Recording</button>
      {recording && <label className={button}>Add audio files<input type="file" multiple accept="audio/*,.m4a,.flac,.opus" className="sr-only" disabled={busy}
        onChange={(e) => { const files = Array.from(e.target.files ?? []); setPendingFiles(files); setUploadIndex(0); void run(() => uploadFiles(files, 0)); e.target.value = ''; }} /></label>}
    </div>}
    {recording && <>
      {recordings.length > 1 && <label className="block text-sm">Recording<select className={field} value={recording.id} onChange={(e) => { audio.current?.pause(); setSelected(e.target.value); setFileIndex(0); setPosition(0); }}>{recordings.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>}
      <div ref={player} className="space-y-2">
        <h2 className="text-lg font-medium">{recording.title}</h2>
        <p className="text-sm text-muted">{formatAudioTime(recording.durationMs)} · {recording.files.length} files · {recording.visibility === 'uploader_and_managers' ? 'Uploader and campaign managers' : recording.visibility}</p>
        {recording.files[fileIndex] && <audio ref={audio} className="w-full" controls preload="metadata" src={`/api/assets/${recording.files[fileIndex].assetId}`}
          onLoadedMetadata={() => { if (!audio.current) return; audio.current.playbackRate = speed; audio.current.volume = volume;
            if (pendingSeek.current) { audio.current.currentTime = pendingSeek.current.localMs / 1000; if (pendingSeek.current.play) void audio.current.play().catch(() => {}); pendingSeek.current = null; } }}
          onTimeUpdate={() => setPosition((recording.files[fileIndex]?.offsetMs ?? 0) + Math.round((audio.current?.currentTime ?? 0) * 1000))}
          onEnded={() => { if (fileIndex + 1 < recording.files.length) { pendingSeek.current = { localMs: 0, play: true }; setFileIndex(fileIndex + 1); } }}
          onError={() => setError('This file is missing or your browser cannot play its codec. Use the authorized download in Files.')} />}
        {recording.files.length > 0 && <>
          <label className="block text-sm">Recording position {formatAudioTime(position)}<input type="range" className="w-full" min={0} max={recording.durationMs} step={1000} value={position} onChange={(e) => seek(Number(e.target.value), !audio.current?.paused)} /></label>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label>Speed <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[0.5, 0.75, 1, 1.25, 1.5, 2].map((n) => <option key={n}>{n}</option>)}</select></label>
            <label>Volume <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label>
            {canChapters && <button className={button} onClick={() => openChapter(position)}>Add chapter at current position</button>}
          </div>
        </>}
      </div>
      {sticky && recording.files.length > 0 && <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-2 text-sm shadow">
        <span>{recording.title} · {formatAudioTime(position)}</span><button className={button} onClick={() => { if (audio.current?.paused) void audio.current.play(); else audio.current?.pause(); }}>Play / pause</button>
        <button className={button} onClick={() => player.current?.scrollIntoView({ behavior: 'smooth' })}>Show player</button></div>}
      {upload && <div aria-live="polite" className="text-sm">{upload.name}: {Math.round(Number(upload.offsetBytes) / Number(upload.sizeBytes) * 100)}%
        <progress className="mx-2" max={Number(upload.sizeBytes)} value={Number(upload.offsetBytes)} />
        {busy ? <button className={button} onClick={() => abort.current?.abort()}>Pause</button> : <button className={button} onClick={() => void run(() => uploadFiles())}>Retry</button>}
        {!busy && <button className={button} onClick={() => void run(async () => { await request(`/uploads/${upload.id}`, 'DELETE'); setUpload(null); setPendingFiles([]); })}>Cancel upload</button>}
      </div>}
      <div className="flex gap-2" role="tablist" aria-label="Recording details" onKeyDown={(e) => {
        const tabs = ['chapters', 'transcript', 'files'] as const;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const index = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
        setTab(tabs[index]); document.getElementById(`audio-${tabs[index]}-tab`)?.focus();
      }}>{(['chapters', 'transcript', 'files'] as const).map((value) => <button key={value} id={`audio-${value}-tab`} role="tab" tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} aria-controls={`audio-${value}-panel`} className={button} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <div role="tabpanel" id={`audio-${tab}-panel`} aria-labelledby={`audio-${tab}-tab`} className="space-y-3">
        {tab === 'chapters' && <>
          {!recording.chapters.length && <p className="text-sm text-muted">Add chapters while listening to mark discoveries and memorable scenes.</p>}
          {recording.chapters.map((c, index) => <div key={c.id} className="flex flex-wrap items-start gap-2 text-sm">
            <button className={button} aria-current={position >= c.startMs && (!recording.chapters[index + 1] || position < recording.chapters[index + 1].startMs) ? 'true' : undefined} onClick={() => seek(c.startMs, true)}>{formatAudioTime(c.startMs)} · {c.title}</button>
            {c.description && <p>{c.description}</p>}{c.wikiPageId && flatPages.find((p) => p.id === c.wikiPageId) && <a href={resolveCanonicalPagePath(campaignHandle, flatPages.find((p) => p.id === c.wikiPageId)!, flatPages)}>Open wiki reference</a>}
            {canChapters && <><button className={button} onClick={() => openChapter(c.startMs, c)}>Edit</button><button className={button} onClick={() => void run(async () => { await request(`/recordings/${recording.id}/chapters/${c.id}`, 'DELETE'); await reload(); })}>Remove</button></>}
          </div>)}
        </>}
        {tab === 'transcript' && <>
          {resultJobId && <p role="status" className="text-sm text-muted">Reviewing a retained provider result. Missing source files become untimed text. Review all timestamps and save a draft before publishing.</p>}
          <label className="block text-sm">Search transcript<input type="search" className={field} value={search} onChange={(e) => setSearch(e.target.value)} /></label>
          {transcript?.revisions.length ? <label className="block text-sm">Revision<select className={field} value={transcript.current?.id ?? ''} onChange={(e) => void run(() => loadTranscript(e.target.value))}>{transcript.revisions.map((r) => <option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} · {r.source}{r.id === transcript.publishedRevisionId ? ' · Published' : ''}</option>)}</select></label> : <p className="text-sm text-muted">No transcript yet. You can write or import one without a transcription service.</p>}
          {segments.map((s, index) => !search || s.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ? <div key={index} className="space-y-2">
            {s.startMs !== null && <button className={button} onClick={() => seek(s.startMs!, true)}>{formatAudioTime(s.startMs)}</button>}
            {canTranscript ? <><input aria-label={`Speaker for segment ${index + 1}`} className={field} placeholder="Speaker" value={s.speaker ?? ''} onChange={(e) => setSegments(segments.map((item, i) => i === index ? { ...item, speaker: e.target.value } : item))} />
              <div className="flex flex-wrap gap-3">{(['startMs', 'endMs'] as const).map((key) => <label key={key} className="text-sm">{key === 'startMs' ? 'Start' : 'End'} in seconds (blank for untimed)<input className={field} type="number" min={0} step={0.001} value={s[key] === null ? '' : s[key]! / 1000} onChange={(e) => setSegments(segments.map((item, i) => i === index ? { ...item, [key]: e.target.value === '' ? null : Math.round(Number(e.target.value) * 1000) } : item))} /></label>)}</div>
              <textarea aria-label={`Transcript segment ${index + 1}`} className={field} value={s.text} onChange={(e) => setSegments(segments.map((item, i) => i === index ? { ...item, text: e.target.value } : item))} /></> : <p className="whitespace-pre-wrap text-sm">{s.speaker && `${s.speaker}: `}{s.text}</p>}
            {canTranscript && <button className={button} onClick={() => setSegments(segments.filter((_item, i) => i !== index))}>Remove segment</button>}
            {canChapters && s.startMs !== null && <button className={button} onClick={() => openChapter(s.startMs!)}>Create chapter here</button>}
          </div> : null)}
          {canTranscript && <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => setSegments([...segments, { startMs: null, endMs: null, text: '' }])}>Add text</button>
            <button className={button} onClick={() => void run(() => saveSegments(segments))}>Save transcript draft</button>
            <label className={button}>Import transcript<input type="file" accept=".txt,.srt,.vtt,.json" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return;
              void run(async () => { if (file.size > 10485760) throw new Error('Transcript import exceeds 10 MiB');
                const format = file.name.split('.').pop()?.toLowerCase() ?? 'txt'; await request(`/recordings/${recording.id}/transcript/revisions`, 'POST', { expectedRevision: transcript?.revision ?? 0, format, text: await file.text() }); await loadTranscript(); }); e.target.value = ''; }} /></label>
            {caps.includes('audio.transcript.publish') && transcript?.current && <button className={button} onClick={() => void run(async () => { await request(`/recordings/${recording.id}/transcript/publish`, 'POST', { revisionId: transcript.current!.id, expectedRevision: transcript.revision }); await loadTranscript(); })}>Publish selected revision</button>}
          </div>}
          {canTranscribe && settings?.global.transcriptionEnabled && settings.settings.transcriptionEnabled && <button className={button} onClick={() => void run(async () => { await request(`/recordings/${recording.id}/transcription`, 'POST', {}); setJobs(await request(`/recordings/${recording.id}/jobs`)); })}>Request transcription</button>}
          {(canTranscript || canTranscribe) && jobs.map((job) => <div key={job.id} className="flex flex-wrap gap-2 text-sm"><span>Transcription: {job.status}{job.failureCode && ` · ${job.failureCode.replaceAll('_', ' ')}`}</span>
            {canTranscript && !['queued', 'running'].includes(job.status) && <button className={button} onClick={() => void run(async () => { const result = await request<{ sourceJobId: string; segments: TranscriptSegmentInput[] }>(`/recordings/${recording.id}/jobs/${job.id}/result`); setSegments(result.segments); setResultJobId(result.sourceJobId); })}>Review retained result</button>}
            {['queued', 'running'].includes(job.status) ? <button className={button} disabled={!canTranscribe} onClick={() => void run(() => request(`/recordings/${recording.id}/jobs/${job.id}/cancel`, 'POST', {}))}>Cancel</button> : ['failed', 'interrupted', 'cancelled'].includes(job.status) ? <button className={button} disabled={!canTranscribe} onClick={() => void run(() => request(`/recordings/${recording.id}/jobs/${job.id}/retry`, 'POST', {}))}>Retry</button> : <button className={button} onClick={() => void run(() => loadTranscript())}>Refresh transcript</button>}</div>)}
        </>}
        {tab === 'files' && <>
          {canManage && <p className="text-sm text-muted">To replace a file, upload its replacement, then detach the original and review any affected timestamps.</p>}
          {recording.files.map((file, index) => <div key={file.id} className="flex flex-wrap items-center gap-2 text-sm"><span>{index + 1}. {file.name} · {formatAudioTime(file.durationMs)} · {(Number(file.sizeBytes) / 1048576).toFixed(1)} MiB</span>
            <a className={button} href={`/api/assets/${file.assetId}`} download={file.name}>Download</a>
            {canManage && <><button className={button} disabled={index === 0} onClick={() => void run(() => { const ids = recording.files.map((f) => f.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; return changeFiles(ids); })}>Move earlier</button>
              <button className={button} onClick={() => void run(() => changeFiles(recording.files.filter((f) => f.id !== file.id).map((f) => f.id)))}>Detach file</button></>}
          </div>)}
          {canManage && <div className="flex flex-wrap gap-2"><label className="text-sm">Visibility<select className={field} value={recording.visibility} onChange={(e) => void run(async () => { await request(`/recordings/${recording.id}`, 'PATCH', { expectedRevision: recording.revision, visibility: e.target.value }); await reload(); })}><option value="campaign">Campaign members with session access</option><option value="staff">Authorized narrative staff</option>{(settings?.settings.allowPov || recording.visibility === 'uploader_and_managers') && <option value="uploader_and_managers">Uploader and authorized campaign managers</option>}</select></label>
            <button className={button} onClick={() => void run(async () => { const title = window.prompt('Recording title', recording.title); if (title) { await request(`/recordings/${recording.id}`, 'PATCH', { expectedRevision: recording.revision, title }); await reload(); } })}>Rename</button>
            <button className={button} onClick={() => void run(async () => { await request(`/recordings/${recording.id}`, 'PATCH', { expectedRevision: recording.revision, status: recording.status === 'archived' ? 'ready' : 'archived' }); await reload(); })}>{recording.status === 'archived' ? 'Unarchive' : 'Archive'}</button>
            <button className={button} onClick={() => void run(async () => { await request(`/recordings/${recording.id}`, 'PATCH', { expectedRevision: recording.revision, isPrimary: true }); await reload(); })}>Make primary</button>
            <button className={button} onClick={() => void run(async () => { if (!window.confirm('Delete this recording and its annotations? Physical media is retained until explicitly purged.')) return; await request(`/recordings/${recording.id}`, 'DELETE'); setSelected(''); setFileIndex(0); await reload(); })}>Delete recording</button></div>}
        </>}
      </div>
    </>}
    <dialog ref={dialog} onCancel={() => setChapterOpen(false)} onClose={() => setChapterOpen(false)} className="w-full max-w-lg rounded-xl border border-border bg-background p-6 text-foreground backdrop:bg-black/60">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!recording) return; void run(async () => {
        await request(`/recordings/${recording.id}/chapters${chapter.id ? `/${chapter.id}` : ''}`, chapter.id ? 'PATCH' : 'POST', { title: chapter.title, description: chapter.description || null, startMs: chapter.startMs, wikiPageId: chapter.wikiPageId || null }); setChapterOpen(false); await reload(); }); }}>
        <h3 className="text-lg font-medium">{chapter.id ? 'Edit chapter' : 'Create chapter'}</h3>
        <label className="block text-sm">Title<input className={field} autoFocus required maxLength={200} value={chapter.title} onChange={(e) => setChapter({ ...chapter, title: e.target.value })} /></label>
        <label className="block text-sm">Position in seconds<input className={field} type="number" min={0} step={0.001} value={chapter.startMs / 1000} onChange={(e) => setChapter({ ...chapter, startMs: Math.round(Number(e.target.value) * 1000) })} /></label>
        <label className="block text-sm">Description<textarea className={field} value={chapter.description} onChange={(e) => setChapter({ ...chapter, description: e.target.value })} /></label>
        <label className="block text-sm">Wiki reference (optional)<select className={field} value={chapter.wikiPageId} onChange={(e) => setChapter({ ...chapter, wikiPageId: e.target.value })}><option value="">No reference</option>{flatPages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label>
        <div className="flex gap-2"><button className={button} type="submit">Save chapter</button><button className={button} type="button" onClick={() => setChapterOpen(false)}>Cancel</button></div>
      </form>
    </dialog>
    <dialog ref={timelineDialog} onCancel={() => setTimelineReview(null)} onClose={() => setTimelineReview(null)} className="w-full max-w-2xl rounded-xl border border-border bg-background p-6 text-foreground backdrop:bg-black/60">
      {timelineReview && recording && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(async () => {
        const resolutions = Object.fromEntries(Object.entries(timelineReview.resolutions).map(([id, value]) => [id, value.mode === 'remove' ? null : { fileId: value.fileId, startMs: value.startMs, ...(value.endMs === undefined ? {} : { endMs: value.endMs }) }]));
        await request(`/recordings/${recording.id}/timeline/commit`, 'POST', { expectedRevision: timelineReview.revision, fileIds: timelineReview.fileIds, resolutions });
        setTimelineReview(null); setFileIndex(0); setPosition(0); await reload(); await loadTranscript();
      }); }}>
        <h3 className="text-lg font-medium">Review affected timestamps</h3><p className="text-sm text-muted">Choose how to handle each annotation before changing these files. Previous transcript revisions remain available.</p>
        {error && <p role="alert" className="text-red-400">{error}</p>}
        {timelineReview.affected.map((item) => { const value = timelineReview.resolutions[item.id];
          const update = (patch: Partial<typeof value>) => setTimelineReview({ ...timelineReview, resolutions: { ...timelineReview.resolutions, [item.id]: { ...value, ...patch } } });
          return <fieldset key={item.id} className="space-y-2 border-t border-border pt-3"><legend className="text-sm">{item.label}</legend>
            <select required className={field} value={value.mode} onChange={(e) => update({ mode: e.target.value })}><option value="">Choose an action</option>{timelineReview.fileIds.length > 0 && <option value="reassign">Reassign to a retained file</option>}<option value="remove">Remove this annotation</option></select>
            {value.mode === 'reassign' && <><label className="block text-sm">File<select required className={field} value={value.fileId} onChange={(e) => update({ fileId: e.target.value })}>{recording.files.filter((f) => timelineReview.fileIds.includes(f.id)).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
              <label className="block text-sm">Start within file in seconds<input required className={field} type="number" min={0} step={0.001} value={value.startMs / 1000} onChange={(e) => update({ startMs: Math.round(Number(e.target.value) * 1000) })} /></label>
              {value.endMs !== undefined && <label className="block text-sm">End within file in seconds<input required className={field} type="number" min={0} step={0.001} value={value.endMs / 1000} onChange={(e) => update({ endMs: Math.round(Number(e.target.value) * 1000) })} /></label>}
            </>}
          </fieldset>;
        })}
        <div className="flex gap-2"><button className={button}>Apply reviewed changes</button><button type="button" className={button} onClick={() => setTimelineReview(null)}>Cancel</button></div>
      </form>}
    </dialog>
  </section>;
}
