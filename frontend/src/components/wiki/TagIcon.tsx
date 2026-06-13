import { resolveTagIcon } from '@/lib/resolveTagIcon';

interface TagIconProps {
  name: string;
  icon?: string | null;
  iconAssetUrl?: string | null;
  className?: string;
  size?: number;
}

export function TagIcon({
  name,
  icon,
  iconAssetUrl,
  className = 'size-3.5 shrink-0',
  size,
}: TagIconProps) {
  const resolved = resolveTagIcon(icon, name, iconAssetUrl);
  const sizeClass = size ? undefined : className;
  const style = size ? { width: size, height: size } : undefined;

  if (resolved.kind === 'image') {
    return (
      <img
        src={resolved.url}
        alt=""
        className={sizeClass ?? 'shrink-0 object-contain'}
        style={style}
        aria-hidden
      />
    );
  }

  const Icon = resolved.Icon;
  return (
    <Icon
      className={sizeClass ?? 'shrink-0'}
      style={style}
      aria-hidden
    />
  );
}
