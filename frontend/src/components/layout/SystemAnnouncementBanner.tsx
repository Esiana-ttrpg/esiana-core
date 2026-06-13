import { useEffect, useState } from 'react';
import { fetchPublicSystemStatus } from '@/lib/publicSystem';
import type { PublicSystemStatus } from '@/types/admin';

/** True when banner text exists and the expiration timestamp is still in the future. */
export function isSystemBannerVisible(
  status: Pick<PublicSystemStatus, 'systemBannerText' | 'systemBannerExpiresAt'>,
  now: Date = new Date(),
): boolean {
  const text = status.systemBannerText.trim();
  if (!text) return false;
  if (!status.systemBannerExpiresAt) return false;
  const expiresAt = new Date(status.systemBannerExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return now < expiresAt;
}

export function SystemAnnouncementBanner() {
  const [bannerText, setBannerText] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchPublicSystemStatus()
      .then((status) => {
        if (cancelled) return;
        if (!isSystemBannerVisible(status)) {
          setBannerText('');
          return;
        }
        setBannerText(status.systemBannerText.trim());
      })
      .catch(() => {
        if (!cancelled) setBannerText('');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!bannerText) {
    return null;
  }

  return (
    <div
      role="status"
      className="w-full border-b border-primary/60 bg-primary px-4 py-2 text-center text-sm font-semibold tracking-wide text-background"
    >
      {bannerText}
    </div>
  );
}
