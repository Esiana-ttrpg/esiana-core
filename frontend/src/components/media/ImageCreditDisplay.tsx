import {
  hasImageCredit,
  imageCreditDisplayRows,
  type ImageCredit,
} from '@shared/imageCredit';

interface ImageCreditDisplayProps {
  credit: ImageCredit | null | undefined;
  className?: string;
}

export function ImageCreditDisplay({ credit, className = '' }: ImageCreditDisplayProps) {
  if (!hasImageCredit(credit)) return null;

  const rows = imageCreditDisplayRows(credit);

  return (
    <dl
      className={`space-y-0.5 text-xs text-muted ${className}`.trim()}
      aria-label="Image credit"
    >
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap gap-x-1">
          <dt className="shrink-0">{row.label}</dt>
          <dd className="min-w-0">
            {row.href ? (
              <a
                href={row.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {row.text}
              </a>
            ) : (
              <span className="text-foreground/90">{row.text}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
