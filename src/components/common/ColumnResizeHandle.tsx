import React from 'react';
import { cn } from '@/lib/utils';

interface ColumnResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  isResizing?: boolean;
  className?: string;
}

export const ColumnResizeHandle: React.FC<ColumnResizeHandleProps> = ({
  onMouseDown,
  onDoubleClick,
  isResizing,
  className,
}) => {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize column (double-click to reset)"
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(e);
      }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize select-none touch-none z-20 flex justify-end items-center group/resizer',
        className
      )}
    >
      <div
        className={cn(
          'w-[2px] h-full transition-colors',
          isResizing
            ? 'bg-primary'
            : 'bg-transparent group-hover/resizer:bg-primary/80 group-active/resizer:bg-primary'
        )}
      />
    </div>
  );
};

export default ColumnResizeHandle;
