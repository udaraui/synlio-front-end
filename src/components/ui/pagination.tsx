import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

export type PaginationLinkProps = {
  isActive?: boolean;
  size?: VariantProps<typeof buttonVariants>["size"];
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  disabled,
  ...props
}: PaginationLinkProps) => (
  <button
    type="button"
    aria-current={isActive ? "page" : undefined}
    disabled={disabled}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      "h-7 w-7 p-0 cursor-pointer text-xs font-medium disabled:opacity-50 disabled:pointer-events-none",
      isActive && "bg-background border-border text-foreground font-semibold shadow-xs",
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

export interface PaginationNavProps extends Omit<PaginationLinkProps, "size"> {
  showText?: boolean;
  size?: VariantProps<typeof buttonVariants>["size"];
}

const PaginationFirst = ({
  className,
  showText = false,
  ...props
}: PaginationNavProps) => (
  <PaginationLink
    aria-label="Go to first page"
    size="icon"
    className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", className)}
    {...props}
  >
    <ChevronsLeft className="h-3.5 w-3.5" />
    <span className="sr-only">First page</span>
  </PaginationLink>
);
PaginationFirst.displayName = "PaginationFirst";

const PaginationPrevious = ({
  className,
  showText = false,
  children,
  ...props
}: PaginationNavProps) => (
  <PaginationLink
    aria-label="Go to previous page"
    size={showText ? "default" : "icon"}
    className={cn(
      showText ? "gap-1 px-2.5 h-7 w-auto" : "h-7 w-7",
      "text-muted-foreground hover:text-foreground",
      className
    )}
    {...props}
  >
    <ChevronLeft className="h-3.5 w-3.5" />
    {showText && <span>{children || "Previous"}</span>}
    {!showText && <span className="sr-only">Previous page</span>}
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  showText = false,
  children,
  ...props
}: PaginationNavProps) => (
  <PaginationLink
    aria-label="Go to next page"
    size={showText ? "default" : "icon"}
    className={cn(
      showText ? "gap-1 px-2.5 h-7 w-auto" : "h-7 w-7",
      "text-muted-foreground hover:text-foreground",
      className
    )}
    {...props}
  >
    {showText && <span>{children || "Next"}</span>}
    <ChevronRight className="h-3.5 w-3.5" />
    {!showText && <span className="sr-only">Next page</span>}
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationLast = ({
  className,
  showText = false,
  ...props
}: PaginationNavProps) => (
  <PaginationLink
    aria-label="Go to last page"
    size="icon"
    className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", className)}
    {...props}
  >
    <ChevronsRight className="h-3.5 w-3.5" />
    <span className="sr-only">Last page</span>
  </PaginationLink>
);
PaginationLast.displayName = "PaginationLast";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-7 w-7 items-center justify-center text-muted-foreground", className)}
    {...props}
  >
    <MoreHorizontal className="h-3.5 w-3.5" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationFirst,
  PaginationPrevious,
  PaginationNext,
  PaginationLast,
  PaginationEllipsis,
};
