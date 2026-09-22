import * as React from 'react';
import { cn } from '@/lib/utils';

function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} {...props} />
  );
}

export { Kbd, KbdGroup };

