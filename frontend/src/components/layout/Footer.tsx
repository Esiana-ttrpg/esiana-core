import { useBranding } from '@/contexts/BrandingContext';
import { hasFooterContent } from '@/lib/footerConfig';
import type { FooterAlignment } from '@/types/admin';

const alignmentClasses: Record<FooterAlignment, string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

const linkRowAlignmentClasses: Record<FooterAlignment, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export function Footer() {
  const { footer } = useBranding();

  if (!hasFooterContent(footer)) {
    return null;
  }

  const alignment = footer.alignment ?? 'center';
  const customText = footer.customText.trim();
  const links = [
    { label: 'Terms of Service', url: footer.tosUrl.trim() },
    { label: 'Privacy Policy', url: footer.privacyPolicyUrl.trim() },
    { label: 'Discord', url: footer.discordUrl.trim() },
    { label: 'GitHub', url: footer.githubUrl.trim() },
  ].filter((item) => item.url);

  return (
    <footer className="mt-auto border-t border-border bg-background/80 px-4 py-6">
      <div
        className={`mx-auto flex max-w-5xl flex-col gap-3 ${alignmentClasses[alignment]}`}
      >
        {customText ? (
          <p className="text-sm text-muted-foreground">{customText}</p>
        ) : null}
        {links.length > 0 ? (
          <nav
            aria-label="Footer links"
            className={`flex flex-wrap gap-x-4 gap-y-2 ${linkRowAlignmentClasses[alignment]}`}
          >
            {links.map((item) => (
              <a
                key={item.label}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
