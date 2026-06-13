import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type HubActionVariant = 'narrative' | 'utility' | 'world';

interface HubActionButtonBaseProps {
  variant: HubActionVariant;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

interface HubActionButtonLinkProps extends HubActionButtonBaseProps {
  to: string;
  onClick?: never;
  type?: never;
}

interface HubActionButtonButtonProps extends HubActionButtonBaseProps {
  to?: never;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

type HubActionButtonProps = HubActionButtonLinkProps | HubActionButtonButtonProps;

export function HubActionButton({
  variant,
  children,
  className = '',
  disabled,
  ...rest
}: HubActionButtonProps) {
  const classes = `hub-btn hub-btn--${variant} ${className}`.trim();

  if ('to' in rest && rest.to) {
    return (
      <Link to={rest.to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={rest.type ?? 'button'}
      onClick={rest.onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
