import type { FooterConfig } from '@/types/admin';

export { DEFAULT_FAVICON, DEFAULT_LOGO } from '@/lib/faviconConfig';

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  customText: '',
  tosUrl: '',
  privacyPolicyUrl: '',
  discordUrl: '',
  githubUrl: '',
  alignment: 'center',
  showToUnauthorized: false,
};

export function normalizeFooterConfig(
  footer: Partial<FooterConfig> | null | undefined,
): FooterConfig {
  if (!footer) return { ...DEFAULT_FOOTER_CONFIG };
  return {
    customText: footer.customText ?? '',
    tosUrl: footer.tosUrl ?? '',
    privacyPolicyUrl: footer.privacyPolicyUrl ?? '',
    discordUrl: footer.discordUrl ?? '',
    githubUrl: footer.githubUrl ?? '',
    alignment: footer.alignment ?? 'center',
    showToUnauthorized: footer.showToUnauthorized === true,
  };
}

export function footerNavLinks(footer: FooterConfig): Array<{ label: string; url: string }> {
  return [
    { label: 'Terms of Service', url: footer.tosUrl.trim() },
    { label: 'Privacy Policy', url: footer.privacyPolicyUrl.trim() },
    { label: 'Discord', url: footer.discordUrl.trim() },
    { label: 'GitHub', url: footer.githubUrl.trim() },
  ].filter((item) => item.url);
}

export function footerNavLinksForAudience(
  footer: FooterConfig,
  isAuthenticated: boolean,
): Array<{ label: string; url: string }> {
  if (!isAuthenticated && !footer.showToUnauthorized) return [];
  return footerNavLinks(footer);
}

export function hasFooterContent(footer: FooterConfig): boolean {
  if (footer.customText.trim()) return true;
  return footerNavLinks(footer).length > 0;
}
