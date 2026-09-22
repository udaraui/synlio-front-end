// components/SortableTaskRow.tsx
"use client";

import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from 'lucide-react'; 

/**
 * A wrapper around TableRow that makes it draggable/sortable.
 * Accepts native <tr> attributes like className, onMouseEnter, etc.
 * Uses Omit to avoid conflict with HTML 'id' attribute.
 */
export interface SortableTaskRowProps extends Omit<React.HTMLAttributes<HTMLTableRowElement>, 'id'> {
  /** Unique identifier for dnd-kit to track this row */
  id: number | string;
  /** Cell content of the row */
  children: React.ReactNode;
}

export function SortableTaskRow({
  id,
  children,
  className,
  style: userStyle,
  ...rest
}: SortableTaskRowProps) {
  // Hook to make this row sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Merge user styles with dnd-kit transform/transition styles
  const style: React.CSSProperties = {
    ...userStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
    <TableRow
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={className}
      style={style}
      {...rest}
    >
          {/* 1st cell: your drag handle */}
          <TableCell className="cursor-grab p-1">
          <GripVertical
            {...attributes}
            {...listeners}
            // onPointerDown={(e:any) => e.stopPropagation()}
            className="w-4 h-4"
          />
        </TableCell>
      {children}
    </TableRow>
  );
}