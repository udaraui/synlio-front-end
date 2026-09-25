'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronDown,
  Globe,
  Layers,
  Loader2,
  Lock,
  Save,
  Search,
  Share2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  CategorizedFilterTemplates,
  FilterTemplate,
  FilterTemplateVisibility,
  shareFilterTemplate,
} from '@/services/filter-template/filter-template-service';
import { getCompanyUsers } from '@/services/user-management/user-service';
import { toast } from "@/lib/toast";

interface CompanyUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string | null;
}

type TemplateCategory = 'ALL' | 'PRIVATE' | 'SHARED' | 'PUBLIC';

interface DisplayFilterTemplate extends FilterTemplate {
  categoryType: 'PRIVATE' | 'SHARED' | 'PUBLIC';
}

interface FilterTemplateButtonProps {
  /** Categorized templates object */
  categorizedTemplates?: CategorizedFilterTemplates;
  /** Flat list of templates fallback */
  templates?: FilterTemplate[];
  /** ID of the currently active (applied) template, or null if none */
  activeTemplateId: string | number | null;
  /** Whether any filter is currently active */
  isFilterActive?: boolean;
  /** Whether the save operation is in progress */
  isSaving?: boolean;
  /** Save callback */
  onSave: (name: string) => Promise<void> | void;
  /** Apply callback */
  onApply: (template: FilterTemplate) => void;
  /** Delete callback */
  onDelete: (templateId: number | string) => Promise<void> | void;
  /** Refresh callback after sharing or updating */
  onRefresh?: () => void;
  /** Extra className */
  className?: string;
}

export function FilterTemplateButton({
  categorizedTemplates,
  templates = [],
  activeTemplateId,
  isFilterActive = false,
  isSaving = false,
  onSave,
  onApply,
  onDelete,
  onRefresh,
  className = '',
}: FilterTemplateButtonProps) {
  // Save Dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Share Dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [templateToShare, setTemplateToShare] = useState<FilterTemplate | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [shareVisibility, setShareVisibility] = useState<FilterTemplateVisibility>('SHARED');
  const [isSavingShare, setIsSavingShare] = useState(false);

  // Filter & Search states for the templates dropdown
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TemplateCategory>('ALL');
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
  const typeFilterRef = useRef<HTMLDivElement>(null);

  // Close type filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        typeFilterRef.current &&
        !typeFilterRef.current.contains(event.target as Node)
      ) {
        setIsTypeFilterOpen(false);
      }
    };
    if (isTypeFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypeFilterOpen]);

  // Unified templates list tagged with categoryType
  const { allTemplates, privateCount, sharedCount, publicCount } = useMemo(() => {
    let priv: FilterTemplate[] = [];
    let shared: FilterTemplate[] = [];
    let pub: FilterTemplate[] = [];

    if (categorizedTemplates) {
      priv = categorizedTemplates.private || [];
      shared = categorizedTemplates.sharedWithMe || [];
      pub = categorizedTemplates.public || [];
    } else {
      templates.forEach((t) => {
        if (t.visibility === 'PUBLIC') pub.push(t);
        else if (t.visibility === 'SHARED' && !t.isOwner) shared.push(t);
        else priv.push(t);
      });
    }

    const all: DisplayFilterTemplate[] = [
      ...priv.map((t) => ({ ...t, categoryType: 'PRIVATE' as const })),
      ...shared.map((t) => ({ ...t, categoryType: 'SHARED' as const })),
      ...pub.map((t) => ({ ...t, categoryType: 'PUBLIC' as const })),
    ];

    // Show all templates unified without separation, sorted newest first
    all.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });

    return {
      allTemplates: all,
      privateCount: priv.length,
      sharedCount: shared.length,
      publicCount: pub.length,
    };
  }, [categorizedTemplates, templates]);

  // Filtered templates based on templateSearchQuery and typeFilter
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      // Visibility type filter
      if (typeFilter !== 'ALL' && t.categoryType !== typeFilter) {
        return false;
      }
      // Search query (matches name or creator)
      if (templateSearchQuery.trim()) {
        const q = templateSearchQuery.toLowerCase().trim();
        const matchesName = t.name.toLowerCase().includes(q);
        const creatorName = t.creator
          ? `${t.creator.first_name} ${t.creator.last_name}`.toLowerCase()
          : '';
        return matchesName || creatorName.includes(q);
      }
      return true;
    });
  }, [allTemplates, typeFilter, templateSearchQuery]);

  // Filter dropdown configuration
  const typeFilterOptions: {
    key: TemplateCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    color: string;
  }[] = [
    {
      key: 'ALL',
      label: 'All Templates',
      icon: Layers,
      count: allTemplates.length,
      color: 'text-muted-foreground',
    },
    {
      key: 'PRIVATE',
      label: 'Private',
      icon: Lock,
      count: privateCount,
      color: 'text-amber-500 dark:text-amber-400',
    },
    {
      key: 'SHARED',
      label: 'Shared',
      icon: Users,
      count: sharedCount,
      color: 'text-blue-500 dark:text-blue-400',
    },
    {
      key: 'PUBLIC',
      label: 'Public',
      icon: Globe,
      count: publicCount,
      color: 'text-emerald-500 dark:text-emerald-400',
    },
  ];

  const currentFilterOption =
    typeFilterOptions.find((opt) => opt.key === typeFilter) || typeFilterOptions[0];
  const CurrentFilterIcon = currentFilterOption.icon;

  // Handle Save Dialog
  const handleOpenSaveDialog = () => {
    setTemplateName('');
    setIsSaveDialogOpen(true);
  };

  const handleCloseSaveDialog = () => {
    setIsSaveDialogOpen(false);
    setTemplateName('');
  };

  const handleConfirmSave = async () => {
    if (!templateName.trim()) return;
    await onSave(templateName.trim());
    handleCloseSaveDialog();
  };

  // Open Share Dialog
  const handleOpenShareDialog = async (template: FilterTemplate) => {
    setTemplateToShare(template);
    setShareVisibility(template.visibility === 'PUBLIC' ? 'PUBLIC' : 'SHARED');
    setSelectedUserIds(new Set(template.sharedUserIds || []));
    setUserSearch('');
    setIsShareDialogOpen(true);

    // Fetch company users if not already loaded
    if (companyUsers.length === 0) {
      try {
        setIsLoadingUsers(true);
        const users = await getCompanyUsers();
        const mapped: CompanyUser[] = (users || []).map((u: any) => ({
          id: u.id,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email || '',
          profile_picture: u.profile_picture || null,
        }));
        setCompanyUsers(mapped);
      } catch (err) {
        console.error('Failed to load company users:', err);
        toast.error('Failed to load company users');
      } finally {
        setIsLoadingUsers(false);
      }
    }
  };

  const handleToggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedUserIds);
    filteredCompanyUsers.forEach((u) => next.add(u.id));
    setSelectedUserIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const handleConfirmShare = async () => {
    if (!templateToShare) return;

    try {
      setIsSavingShare(true);
      const userIds = Array.from(selectedUserIds);
      const finalVisibility: FilterTemplateVisibility =
        shareVisibility === 'PUBLIC'
          ? 'PUBLIC'
          : userIds.length > 0
          ? 'SHARED'
          : 'PRIVATE';

      await shareFilterTemplate(templateToShare.id, {
        userIds,
        visibility: finalVisibility,
      });

      toast.success(
        finalVisibility === 'PUBLIC'
          ? `Template "${templateToShare.name}" is now Public to all company users`
          : finalVisibility === 'SHARED'
          ? `Template "${templateToShare.name}" shared with ${userIds.length} user(s)`
          : `Template "${templateToShare.name}" is now Private`,
      );

      setIsShareDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error sharing template:', err);
      toast.error('Failed to update share settings');
    } finally {
      setIsSavingShare(false);
    }
  };

  // Filtered users for search in dialog
  const filteredCompanyUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return companyUsers;
    return companyUsers.filter(
      (u) =>
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [companyUsers, userSearch]);

  const totalTemplates = allTemplates.length;

  return (
    <TooltipProvider delayDuration={150}>
      {/* Chevron Trigger */}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) {
            setTemplateSearchQuery('');
            setTypeFilter('ALL');
            setIsTypeFilterOpen(false);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Filter Templates"
            className={`h-7 w-7 px-0 rounded-l-none -ml-px text-muted-foreground hover:text-foreground ${className}`}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className={cn(
            "w-[340px] max-h-[490px] p-1.5 flex flex-col !overflow-visible transition-[min-height] duration-150",
            isTypeFilterOpen ? "min-h-[275px]" : "min-h-0"
          )}
        >
          {/* Action: Save current filters */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={handleOpenSaveDialog}
              className="cursor-pointer text-xs font-medium flex items-center justify-between py-1.5 px-2 rounded-md text-foreground hover:bg-muted focus:bg-muted"
            >
              <div className="flex items-center gap-2 truncate">
                <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">Save current filters</span>
              </div>
              {isFilterActive && (
                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 shrink-0">
                  Active
                </span>
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {totalTemplates === 0 ? (
            <div className="py-6 px-3 text-center border-t border-border/50 mt-1.5">
              <Bookmark className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-foreground">No saved templates</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Save your active filters above to quickly access them later.
              </p>
            </div>
          ) : (
            <>
              <DropdownMenuSeparator className="my-1.5" />

              {/* Search bar & Type Filter Dropdown Header */}
              <div className="relative flex items-center gap-1.5 px-1 py-1">
                {/* Search Input */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs pl-7 pr-6 rounded-md bg-muted/40 border-border/70 placeholder:text-muted-foreground/70"
                  />
                  {templateSearchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateSearchQuery('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* 3 Types Filter Dropdown */}
                <div className="relative shrink-0" ref={typeFilterRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTypeFilterOpen((prev) => !prev);
                    }}
                    className={cn(
                      "h-7 text-xs px-2 rounded-md border flex items-center gap-1.5 font-medium transition-all cursor-pointer select-none",
                      typeFilter !== 'ALL'
                        ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
                        : "bg-muted/40 hover:bg-muted/70 border-border/70 text-foreground"
                    )}
                    title="Filter by visibility type"
                  >
                    <CurrentFilterIcon className={cn("h-3 w-3 shrink-0", currentFilterOption.color)} />
                    <span className="truncate max-w-[65px]">
                      {currentFilterOption.label.replace(' Templates', '')}
                    </span>
                    <span className="text-[10px] opacity-70">
                      ({currentFilterOption.count})
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 opacity-60 transition-transform duration-150 shrink-0",
                        isTypeFilterOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Filter Menu Popover */}
                  {isTypeFilterOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-popover p-1 shadow-lg z-[70] animate-in fade-in-0 zoom-in-95 space-y-0.5"
                    >
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Filter by Type
                      </div>
                      {typeFilterOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = typeFilter === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTypeFilter(opt.key);
                              setIsTypeFilterOpen(false);
                            }}
                            className={cn(
                              "w-full text-left flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors cursor-pointer",
                              isSelected
                                ? "bg-muted font-medium text-foreground"
                                : "text-foreground/90 hover:bg-muted/60"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon className={cn("h-3 w-3 shrink-0", opt.color)} />
                              <span className="truncate">{opt.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full border border-border/40">
                                {opt.count}
                              </span>
                              {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Show All Templates in One Unified List Without Separation */}
              <div className="overflow-y-auto max-h-[300px] mt-1 space-y-0.5 flex-1 min-h-0">
                {filteredTemplates.length === 0 ? (
                  <div className="py-6 px-3 text-center">
                    <Search className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-foreground">No matching templates</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {templateSearchQuery
                        ? `No templates found for "${templateSearchQuery}"`
                        : `No ${typeFilter.toLowerCase()} templates available.`}
                    </p>
                    {(templateSearchQuery || typeFilter !== 'ALL') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTemplateSearchQuery('');
                          setTypeFilter('ALL');
                        }}
                        className="mt-2 h-6 text-xs text-primary hover:text-primary/80"
                      >
                        Reset filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <DropdownMenuGroup>
                    {filteredTemplates.map((template) => {
                      const isActive = String(activeTemplateId) === String(template.id);
                      const isOwner = template.isOwner;
                      const canManage =
                        template.categoryType === 'PRIVATE' ||
                        (template.categoryType === 'PUBLIC' && isOwner);
                      const creatorName = template.creator
                        ? `${template.creator.first_name} ${template.creator.last_name}`.trim()
                        : null;

                      return (
                        <div key={template.id} className="relative group flex items-center w-full bg-muted/50 rounded-md mb-1 hover:bg-muted">
                          <DropdownMenuItem
                            className={`flex-1 ${
                              canManage ? 'pr-14' : ''
                            } cursor-pointer text-xs rounded-md py-1.5 px-2 transition-colors flex items-center gap-2 ${
                              isActive
                                ? 'bg-muted font-medium text-foreground'
                                : 'text-foreground/90 hover:bg-muted/60'
                            }`}
                            onSelect={() => onApply(template)}
                          >
                            {/* Type Icon with Tooltip to identify what type this template is */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "flex items-center justify-center h-4.5 w-4.5 rounded shrink-0 cursor-help transition-colors",
                                    template.categoryType === 'PRIVATE' && "text-amber-500 hover:bg-amber-500/10",
                                    template.categoryType === 'SHARED' && "text-blue-500 hover:bg-blue-500/10",
                                    template.categoryType === 'PUBLIC' && "text-emerald-500 hover:bg-emerald-500/10"
                                  )}
                                  title={
                                    template.categoryType === 'PRIVATE'
                                      ? 'Private (only you)'
                                      : template.categoryType === 'SHARED'
                                      ? (creatorName ? `Shared by ${creatorName}` : 'Shared with you')
                                      : 'Public (organization)'
                                  }
                                >
                                  {template.categoryType === 'PRIVATE' && <Lock className="h-3 w-3" />}
                                  {template.categoryType === 'SHARED' && <Users className="h-3 w-3" />}
                                  {template.categoryType === 'PUBLIC' && <Globe className="h-3 w-3" />}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className="z-[80] text-xs py-1 px-2.5 shadow-md bg-popover text-popover-foreground border"
                              >
                                {template.categoryType === 'PRIVATE' && (
                                  <div className="flex items-center gap-1.5">
                                    <Lock className="h-3 w-3 text-amber-500" />
                                    <span>Private template &bull; Visible only to you</span>
                                  </div>
                                )}
                                {template.categoryType === 'SHARED' && (
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-3 w-3 text-blue-500" />
                                    <span>
                                      {creatorName
                                        ? `Shared by ${creatorName}`
                                        : 'Shared template &bull; Shared with you'}
                                    </span>
                                  </div>
                                )}
                                {template.categoryType === 'PUBLIC' && (
                                  <div className="flex items-center gap-1.5">
                                    <Globe className="h-3 w-3 text-emerald-500" />
                                    <span>Public template &bull; Visible to entire company</span>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>

                            <div className="flex flex-col truncate min-w-0 flex-1">
                              <span className="truncate">{template.name}</span>
                              {/* {template.categoryType === 'SHARED' && creatorName && (
                                <span className="text-[10px] text-muted-foreground truncate leading-tight">
                                  by {creatorName}
                                </span>
                              )} */}
                            </div>

                            {/* Active checkmark */}
                            {isActive && (
                              <Check className="h-3 w-3 text-foreground shrink-0 ml-auto mr-1 group-hover:hidden" />
                            )}
                          </DropdownMenuItem>

                          {/* Owner actions (Share & Delete) */}
                          {canManage && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenShareDialog(template);
                                }}
                                title={
                                  template.categoryType === 'PUBLIC'
                                    ? 'Edit share settings'
                                    : 'Share template'
                                }
                              >
                                <Share2 className="h-3 w-3" />
                              </button>

                              <button
                                type="button"
                                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(template.id);
                                }}
                                title="Delete template"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </DropdownMenuGroup>
                )}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ────────────────── Save Template Dialog ────────────────── */}
      <Dialog
        open={isSaveDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseSaveDialog();
          else setIsSaveDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Save Filter Template</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save current filters as a template to quickly access them later.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-1.5">
            <label className="text-xs font-medium text-foreground block">Template Name</label>
            <Input
              placeholder="e.g. High Priority Open Items"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim() && !isSaving) {
                  handleConfirmSave();
                }
              }}
              className="h-8 text-xs"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={handleCloseSaveDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSave}
              disabled={!templateName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────── Share Template Dialog ────────────────── */}
      <Dialog
        open={isShareDialogOpen}
        onOpenChange={(open) => {
          if (!open) setIsShareDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              Share Filter Template
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share &ldquo;{templateToShare?.name}&rdquo; with team members or make it public to your organization.
            </DialogDescription>
          </DialogHeader>

          {/* Visibility Mode Selection */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50 mt-3">
            <button
              type="button"
              onClick={() => setShareVisibility('SHARED')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                shareVisibility === 'SHARED'
                  ? 'bg-background text-foreground shadow-xs border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Specific Users
            </button>

            <button
              type="button"
              onClick={() => setShareVisibility('PUBLIC')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                shareVisibility === 'PUBLIC'
                  ? 'bg-background text-foreground shadow-xs border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Public (Everyone)
            </button>
          </div>

          {/* Content for 'SHARED' Mode: Select Company Users */}
          {shareVisibility === 'SHARED' ? (
            <div className="flex-1 flex flex-col mt-3 min-h-[250px] overflow-hidden">
              {/* Search & Actions Bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                  {userSearch && (
                    <button
                      onClick={() => setUserSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>

              {/* Users List */}
              <div className="flex-1 border border-border/60 rounded-lg overflow-y-auto max-h-[220px] divide-y divide-border/40">
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading members...
                  </div>
                ) : filteredCompanyUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  filteredCompanyUsers.map((user) => {
                    const isSelected = selectedUserIds.has(user.id);
                    const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;
                    const initials = (
                      (user.first_name?.[0] || '') + (user.last_name?.[0] || '')
                    ).toUpperCase() || 'U';

                    return (
                      <div
                        key={user.id}
                        onClick={() => handleToggleUser(user.id)}
                        className={`flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-muted/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleUser(user.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar className="h-6 w-6 text-[10px]">
                            <AvatarImage src={user.profile_picture || ''} alt={fullName} />
                            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Count */}
              <div className="text-right text-[11px] text-muted-foreground mt-2">
                {selectedUserIds.size} user{selectedUserIds.size === 1 ? '' : 's'} selected
              </div>
            </div>
          ) : (
            /* Content for 'PUBLIC' Mode */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-border/60 rounded-lg mt-3 bg-muted/20">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-2.5 text-muted-foreground">
                <Globe className="h-4 w-4" />
              </div>
              <div className="text-xs font-semibold text-foreground mb-1">Visible to Everyone</div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                All members of your organization will be able to view and apply this template from their Public list.
              </p>
            </div>
          )}

          <DialogFooter className="mt-4 gap-3 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(false)}
              disabled={isSavingShare}
              className={'mr-3'}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmShare} disabled={isSavingShare}>
              {isSavingShare ? (
                <>
                  <Loader2 className="animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                'Save & Share'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default FilterTemplateButton;
