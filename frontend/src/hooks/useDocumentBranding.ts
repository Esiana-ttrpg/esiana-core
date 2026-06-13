import { useEffect } from 'react';
import { DEFAULT_FAVICON } from '@/lib/footerConfig';

const FAVICON_LINK_ID = 'esiana-favicon';

export function useDocumentBranding(
  globalTitle: string,
  faviconUrl: string | null,
): void {
  useEffect(() => {
    document.title = globalTitle.trim() || 'Esiana';
  }, [globalTitle]);

  useEffect(() => {
    const href = faviconUrl?.trim() || DEFAULT_FAVICON;
    let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = FAVICON_LINK_ID;
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [faviconUrl]);
}
