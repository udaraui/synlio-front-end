"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CompanyFilterOption {
  id: number;
  company: string;
  isActive?: boolean | string;
  active_status?: boolean | string;
  is_self_created_company?: boolean;
  is_self_registered_company?: boolean;
  creator?: {
    email?: string;
  } | null;
  creatorEmail?: string | null;
  createdBy?: string;
  created_by?: string;
}

type CategoryFilter = "all" | "standard" | "self_created";

export interface CompanyFilterComboboxProps {
  companies: CompanyFilterOption[];
  value?: string;
  onChange?: (companyId: string) => void;
  placeholder?: string;
  itemsPerPage?: number;
  className?: string;
}

const DEFAULT_ITEMS_PER_PAGE = 10;

export function isCompanyActive(company: CompanyFilterOption): boolean {
  return (
    company?.isActive === true ||
    company?.isActive === "active" ||
    company?.active_status === true ||
    company?.active_status === "active"
  );
}

export function isSelfCreatedCompany(company: CompanyFilterOption): boolean {
  return Boolean(
    company?.is_self_created_company || company?.is_self_registered_company
  );
}

export function getCreatorEmail(company: CompanyFilterOption): string {
  return (
    company?.creator?.email ||
    company?.creatorEmail ||
    company?.createdBy ||
    company?.created_by ||
    ""
  ).trim();
}

export const CompanyFilterCombobox: React.FC<CompanyFilterComboboxProps> = ({
  companies = [],
  value = "",
  onChange,
  placeholder = "Company",
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Strictly filter for active companies only
  const activeCompanies = useMemo(() => {
    const safeList = Array.isArray(companies) ? companies : [];
    return safeList.filter(isCompanyActive);
  }, [companies]);

  // Selected company lookup
  const selectedCompany = useMemo(() => {
    if (!value) return undefined;
    return activeCompanies.find((c) => String(c.id) === String(value));
  }, [activeCompanies, value]);

  // Search-filtered active companies (used for tab counts & category filtering)
  const searchMatchedCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeCompanies;

    return activeCompanies.filter((c) => {
      const nameMatch = (c.company || "").toLowerCase().includes(query);
      if (isSelfCreatedCompany(c)) {
        const emailMatch = getCreatorEmail(c).toLowerCase().includes(query);
        return nameMatch || emailMatch;
      }
      return nameMatch;
    });
  }, [activeCompanies, searchQuery]);

  // Category counts for quick filter tabs
  const categoryCounts = useMemo(() => {
    let standard = 0;
    let selfCreated = 0;
    for (const c of searchMatchedCompanies) {
      if (isSelfCreatedCompany(c)) {
        selfCreated += 1;
      } else {
        standard += 1;
      }
    }
    return {
      all: searchMatchedCompanies.length,
      standard,
      self_created: selfCreated,
    };
  }, [searchMatchedCompanies]);

  // Final filtered companies by category tab
  const filteredCompanies = useMemo(() => {
    if (categoryFilter === "standard") {
      return searchMatchedCompanies.filter((c) => !isSelfCreatedCompany(c));
    }
    if (categoryFilter === "self_created") {
      return searchMatchedCompanies.filter((c) => isSelfCreatedCompany(c));
    }
    return searchMatchedCompanies;
  }, [searchMatchedCompanies, categoryFilter]);

  const totalItems = filteredCompanies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedCompanies = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompanies, safePage, itemsPerPage]);

  // Reset to page 1 whenever search query or category tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const handleSelectCompany = (companyId: string) => {
    onChange?.(companyId);
    setOpen(false);
  };

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, totalItems);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by company"
          className={cn(
            "h-7 w-[200px] sm:w-[220px] px-2.5 text-xs font-normal flex-shrink-0 border border-border bg-background shadow-none flex items-center justify-between gap-1.5 hover:bg-accent/50",
            className
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span
              className={cn(
                "truncate text-left flex-1",
                !selectedCompany && "text-muted-foreground"
              )}
            >
              {selectedCompany ? selectedCompany.company : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear company filter"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.("");
                  }
                }}
                className="rounded-sm p-0.5 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[320px] sm:w-[360px] p-0 rounded-xl shadow-lg border border-border overflow-hidden flex flex-col"
      >
        {/* Sticky Search & Category Filter Header */}
        <div className="sticky top-0 z-10 bg-popover border-b border-border/80 p-2.5 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search company or creator email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 pr-7 text-xs border-border shadow-none focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div
            role="tablist"
            aria-label="Company category filter"
            className="grid grid-cols-3 gap-1 bg-muted/60 p-0.5 rounded-lg"
          >
            {(
              [
                { id: "all", label: "All", count: categoryCounts.all },
                { id: "standard", label: "Standard", count: categoryCounts.standard },
                {
                  id: "self_created",
                  label: "Self-Created",
                  count: categoryCounts.self_created,
                },
              ] as const
            ).map((tab) => {
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setCategoryFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-6 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer truncate",
                    isActive
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="truncate">{tab.label}</span>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      isActive ? "text-primary" : "text-muted-foreground/80"
                    )}
                  >
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Company Options List */}
        <div
          role="listbox"
          aria-label="Active companies"
          className="max-h-[280px] overflow-y-auto p-1.5 space-y-0.5"
        >
          {/* Default "All Companies" Reset Option */}
          {safePage === 1 && !searchQuery.trim() && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => handleSelectCompany("")}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                !value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-accent text-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">All Companies</span>
              </div>
              {!value && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
            </button>
          )}

          {paginatedCompanies.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <Building2 className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1.5" />
              <p className="text-xs text-muted-foreground">
                No active companies found
              </p>
            </div>
          ) : (
            paginatedCompanies.map((company) => {
              const companyIdStr = String(company.id);
              const isSelected = String(value) === companyIdStr;
              const selfCreated = isSelfCreatedCompany(company);
              const creatorEmail = selfCreated ? getCreatorEmail(company) : "";

              return (
                <button
                  key={company.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCompany(companyIdStr)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Building2
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 mt-0.5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "text-xs truncate",
                            isSelected ? "font-semibold" : "font-medium"
                          )}
                        >
                          {company.company}
                        </span>
                        {selfCreated && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 py-0 text-[10px] font-medium leading-none shrink-0 rounded"
                          >
                            Self
                          </Badge>
                        )}
                      </div>
                      {selfCreated && creatorEmail && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {creatorEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Sticky Pagination Footer */}
        <div className="sticky bottom-0 z-10 border-t border-border/80 bg-muted/30 px-3 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {totalItems > 0
              ? `Showing ${startItem}-${endItem} of ${totalItems}`
              : "Showing 0 of 0"}
          </span>

          <div className="flex items-center gap-1">
            <span className="mr-1 tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={safePage <= 1}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              className="h-6 w-6 p-0 shadow-none disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={safePage >= totalPages}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              className="h-6 w-6 p-0 shadow-none disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CompanyFilterCombobox;

