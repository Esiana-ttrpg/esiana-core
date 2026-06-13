import type { FooterConfig } from '@/types/admin';

export { DEFAULT_FAVICON, DEFAULT_LOGO } from '@/lib/faviconConfig';

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  customText: '',
  tosUrl: '',
  privacyPolicyUrl: '',
  discordUrl: '',
  githubUrl: '',
  alignment: 'center',
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
  };
}

export function hasFooterContent(footer: FooterConfig): boolean {
  if (footer.customText.trim()) return true;
  return (
    Boolean(footer.tosUrl.trim()) ||
    Boolean(footer.privacyPolicyUrl.trim()) ||
    Boolean(footer.discordUrl.trim()) ||
    Boolean(footer.githubUrl.trim())
  );
}
