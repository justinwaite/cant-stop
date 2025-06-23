import clsx from 'clsx';
import type { ComponentProps } from 'react';

export function IconButton({
  className,
  children,
  ...buttonProps
}: ComponentProps<'button'>) {
  return (
    <button
      className={clsx(
        className,
        'flex items-center justify-center w-10 h-10 p-2 cursor-pointer rounded-xl transition-colors duration-200',
      )}
      style={{
        background: '#FBF0E3',
        border: '2px solid #E2BFA3',
        color: '#842616',
        boxShadow: '0 2px 8px rgba(132,38,22,0.10)',
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
