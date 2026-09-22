import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName = 'items',
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems <= itemsPerPage) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-muted/20">
      <p className="text-xs text-muted-foreground">
        Showing {startItem} - {endItem} of {totalItems} {itemName}
      </p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
