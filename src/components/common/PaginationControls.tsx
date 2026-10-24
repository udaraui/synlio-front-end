import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationFirst,
  PaginationPrevious,
  PaginationNext,
  PaginationLast,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  showPageNumbers?: boolean;
  className?: string;
  showFirstLast?: boolean;
}

export function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage = 12,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [12, 20, 50, 100],
  itemName = 'items',
  showPageNumbers = false,
  className,
  showFirstLast = true,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers for full pagination mode (e.g. 1 ... 4 [5] 6 ... 10)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-1.5 border-t border-border bg-background",
        className
      )}
    >
      {/* Left: Summary text */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {totalItems > 0 ? (
          <>
            Showing {startItem} – {endItem} of {totalItems} {itemName}
          </>
        ) : (
          `No ${itemName} found`
        )}
      </span>

      {/* Right: Rows per page selector + Pagination navigation */}
      <div className="flex items-center gap-3">
        {onItemsPerPageChange && (
          <Field orientation="horizontal" className="items-center gap-2">
            <FieldLabel htmlFor="pagination-rows-per-page" className="text-xs text-muted-foreground">
              Rows per page
            </FieldLabel>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                onItemsPerPageChange(parseInt(value, 10));
                onPageChange(1);
              }}
            >
              <SelectTrigger
                id="pagination-rows-per-page"
                className="h-7 text-xs w-18 bg-background border-border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}

        <Pagination className="mx-0 w-auto">
          <PaginationContent className="gap-1">
            {showFirstLast && (
              <PaginationItem>
                <PaginationFirst
                  onClick={() => onPageChange(1)}
                  disabled={currentPage <= 1}
                />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              />
            </PaginationItem>

            {showPageNumbers ? (
              getPageNumbers().map((p, idx) => (
                <PaginationItem key={idx}>
                  {p === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      isActive={currentPage === p}
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))
            ) : (
              <PaginationItem>
                <span className="text-xs text-muted-foreground px-2 select-none whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              />
            </PaginationItem>

            {showFirstLast && (
              <PaginationItem>
                <PaginationLast
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

export default PaginationControls;
