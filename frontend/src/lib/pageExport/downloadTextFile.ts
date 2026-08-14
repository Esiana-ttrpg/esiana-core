export function downloadTextFile(options: {
  filename: string;
  content: string;
  mimeType?: string;
}): void {
  const mimeType = options.mimeType ?? 'text/plain;charset=utf-8';
  const blob = new Blob([options.content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
