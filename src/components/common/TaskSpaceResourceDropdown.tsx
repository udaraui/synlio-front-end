'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  searchResourcesForTaskSpace,
  getResourcePoolsForTaskSpace,
  searchResourcePoolsForTaskSpace,
  addResourceToTaskSpace,
  removeResourceFromTaskSpace,
} from '@/services/task-management/task-space.service';
import { searchResourcesWithSkills } from '@/services/resource-management/resource-service';
import { loadResourcePools } from '@/services/resource-management/resource-pool-service';

// ─── SkillsHoverPopover: show skills in a popover on hover ──────────────────

function SkillsHoverPopover({
  skills,
  emptyText,
  children,
}: {
  skills: string[];
  emptyText?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div onMouseEnter={enter} onMouseLeave={leave} className="flex-1 min-w-0">
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-3 w-auto max-w-64 z-[9999]"
        side="right"
        align="start"
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Skills
        </p>
        {skills.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">
            {emptyText ?? 'No skills'}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {skills.map((s, si) => (
              <Badge key={`${s}-${si}`} variant="outline" className="text-xs font-normal">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface TaskSpaceResourceDropdownProps {
  /** The task space ID used for API calls */
  taskSpaceId: number;
  /** Set of currently-assigned resource IDs (for checked state) */
  selectedResourceIds: Set<number>;
  /** Called after a resource is successfully added. Parent should update its list. */
  onResourceAdded: (resource: any) => void;
  /** Called after a resource is successfully removed. Parent should update its list. */
  onResourceRemoved: (resourceId: number) => void;
  /** Custom trigger element — defaults to a "+ Add Resource" button */
  trigger?: React.ReactNode;
  /** Popover alignment relative to the trigger */
  align?: 'start' | 'center' | 'end';
  /** Popover side relative to the trigger */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Disables the trigger when true */
  disabled?: boolean;
  /**
   * Preloaded resources to show in a dedicated "Space Resources" tab.
   * When provided a 3rd tab appears that filters this list locally — no extra API call.
   */
  preloadedResources?: any[];
  /**
   * When true, skip all add/remove API calls and rely solely on the
   * onResourceAdded / onResourceRemoved callbacks (useful in form pages
   * where state is managed locally before saving).
   */
  skipApi?: boolean;
  disabledResourceIds?: Set<number>;
  /** Whether to use generic ticket/company APIs instead of task space ones */
  spaceType?: 'task' | 'ticket';
}


// ─── Component ───────────────────────────────────────────────────────────────

export function TaskSpaceResourceDropdown({
  taskSpaceId,
  selectedResourceIds,
  onResourceAdded,
  onResourceRemoved,
  trigger,
  align = 'end',
  side = 'bottom',
  disabled = false,
  preloadedResources,
  skipApi = false,
  disabledResourceIds = new Set<number>(),
  spaceType = 'task',
}: TaskSpaceResourceDropdownProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'search' | 'groups' | 'space'>(
    preloadedResources ? 'space' : 'search',
  );
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceResults, setResourceResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Groups tab state
  const [pools, setPools] = useState<any[]>([]);
  const [searchedPools, setSearchedPools] = useState<any[] | null>(null);
  const [poolsLoaded, setPoolsLoaded] = useState(false);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [processingPoolId, setProcessingPoolId] = useState<number | null>(null);
  const [poolSearch, setPoolSearch] = useState('');
  const [isSearchingPools, setIsSearchingPools] = useState(false);
  // Filter for resources *within* group rows (name or skill)
  const [groupResourceFilter, setGroupResourceFilter] = useState('');
  // ── Search: load resources on open or search change ──────────────────────
  useEffect(() => {
    if (!searchOpen || dropdownTab !== 'search') {
      setResourceResults([]);
      return;
    }

    const loadResources = async () => {
      setIsSearching(true);
      try {
        let results = [];
        if (spaceType === 'ticket') {
          results = await searchResourcesWithSkills(resourceSearch.trim() || undefined, 6);
        } else {
          results = await searchResourcesForTaskSpace(
            taskSpaceId,
            resourceSearch.trim() || undefined,
            6,
          );
        }
        const sortedResults = results.sort((a, b) => {
          const aName = a.first_name || '';
          const bName = b.first_name || '';
          return aName.localeCompare(bName);
        });
        setResourceResults(sortedResults);
      } catch {
        setResourceResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    loadResources();
  }, [resourceSearch, searchOpen, dropdownTab, taskSpaceId]);

  // ── Groups: load initial 3 latest pools when groups tab is first opened ──────
  useEffect(() => {
    if (dropdownTab !== 'groups' || !searchOpen || poolsLoaded) return;
    setPoolsLoading(true);
    if (spaceType === 'ticket') {
      loadResourcePools({ rows: 3 })
        .then((data: any) => {
          setPools(data.data || []);
          setPoolsLoaded(true);
        })
        .catch(() => toast.error('Failed to load resource groups'))
        .finally(() => setPoolsLoading(false));
    } else {
      getResourcePoolsForTaskSpace(taskSpaceId)
        .then((data: any[]) => {
          setPools(data);
          setPoolsLoaded(true);
        })
        .catch(() => toast.error('Failed to load resource groups'))
        .finally(() => setPoolsLoading(false));
    }
  }, [dropdownTab, searchOpen, poolsLoaded, taskSpaceId]);

  // ── Groups: debounced search via API ──────────────────────────────────────
  useEffect(() => {
    if (!searchOpen || dropdownTab !== 'groups') return;

    if (!poolSearch.trim()) {
      setSearchedPools(null); // clear search → show initial pools
      return;
    }

    const t = setTimeout(async () => {
      setIsSearchingPools(true);
      try {
        let results = [];
        if (spaceType === 'ticket') {
          const res = await loadResourcePools({ search: poolSearch.trim() });
          results = res.data || [];
        } else {
          results = await searchResourcePoolsForTaskSpace(taskSpaceId, poolSearch.trim());
        }
        setSearchedPools(results);
      } catch {
        setSearchedPools([]);
        toast.error('Failed to search resource groups');
      } finally {
        setIsSearchingPools(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [poolSearch, searchOpen, dropdownTab, taskSpaceId]);

  // ── Toggle individual resource ────────────────────────────────────────────
  const handleToggleResource = async (r: any) => {
    const isAdded = selectedResourceIds.has(r.id);
    setTogglingId(r.id);
    try {
      if (skipApi) {
        // Local-only mode — no API calls
        if (isAdded) { onResourceRemoved(r.id); } else { onResourceAdded(r); }
      } else if (isAdded) {
        await removeResourceFromTaskSpace(taskSpaceId, r.id);
        onResourceRemoved(r.id);
        toast.success('Resource removed');
      } else {
        await addResourceToTaskSpace(taskSpaceId, r.id);
        onResourceAdded(r);
        toast.success('Resource added');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update resource');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Toggle all resources in a pool ────────────────────────────────────────
  const handleToggleAllInPool = async (pool: any) => {
    const poolResources: any[] = pool.resources ?? [];
    const addedInPool = poolResources.filter((r) => selectedResourceIds.has(r.id));
    const notAddedInPool = poolResources.filter((r) => !selectedResourceIds.has(r.id));

    setProcessingPoolId(pool.id);
    try {
      if (addedInPool.length > 0) {
        // Some/all already added → remove them
        for (const r of addedInPool) {
          if (!skipApi) await removeResourceFromTaskSpace(taskSpaceId, r.id);
          onResourceRemoved(r.id);
        }
        if (!skipApi) {
          toast.success(`Removed ${addedInPool.length} resource${addedInPool.length !== 1 ? 's' : ''}`);
        }
      } else {
        // None added → add all
        for (const r of notAddedInPool) {
          if (!skipApi) await addResourceToTaskSpace(taskSpaceId, r.id);
          onResourceAdded(r);
        }
        if (!skipApi) {
          toast.success(`Added ${notAddedInPool.length} resource${notAddedInPool.length !== 1 ? 's' : ''}`);
        }
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update resources');
    } finally {
      setProcessingPoolId(null);
    }
  };

  // ── Reset on close ────────────────────────────────────────────────────────
  const handleOpenChange = (open: boolean) => {
    setSearchOpen(open);
    if (!open) {
      setResourceSearch('');
      setPoolSearch('');
      setGroupResourceFilter('');
      setSearchedPools(null);
      setDropdownTab(preloadedResources ? 'space' : 'search');
    }
  };

  // ── Space resources tab: local filter ─────────────────────────────────────
  const [spaceSearch, setSpaceSearch] = useState('');
  const filteredSpaceResources = (preloadedResources ?? []).filter((r) => {
    const q = spaceSearch.toLowerCase();
    if (!q) return true;
    return (
      `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      (r.skills ?? []).some((s: string) => s.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    const aSelected = selectedResourceIds.has(a.id) ? -1 : 0;
    const bSelected = selectedResourceIds.has(b.id) ? -1 : 0;
    if (aSelected !== bSelected) return aSelected - bSelected;
    const aName = a.first_name || '';
    const bName = b.first_name || '';
    return aName.localeCompare(bName);
  });

  const defaultTrigger = (
    <Button size="sm" variant="outline" className="h-8 gap-1" disabled={disabled}>
      <Plus className="h-3.5 w-3.5" /> Add Member
    </Button>
  );

  return (
    <Popover open={searchOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0 flex flex-col"
        style={{ height: '420px' }}
        align={align}
        side={side}
        avoidCollisions={true}
      >
        {/* ── Tab header ── */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {preloadedResources && (
            <button
              onClick={() => setDropdownTab('space')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${dropdownTab === 'space'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Space Members
            </button>
          )}
          <button
            onClick={() => setDropdownTab('search')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${dropdownTab === 'search'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Resource
          </button>
          <button
            onClick={() => setDropdownTab('groups')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${dropdownTab === 'groups'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Resource Groups
          </button>
        </div>

        {/* ── Tab 1: Search ── */}
        {dropdownTab === 'search' && (
          <Command shouldFilter={false} className="flex flex-col flex-1 overflow-hidden">
            <CommandInput
              placeholder="Search by name, skill..."
              value={resourceSearch}
              onValueChange={setResourceSearch}
            />
            <CommandList className="flex-1 max-h-none overflow-y-auto">
              {isSearching && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                  Searching...
                </div>
              )}
              {!isSearching && resourceResults.length === 0 && (
                <CommandEmpty>No resources found</CommandEmpty>
              )}
              {!isSearching && resourceResults.length > 0 && (() => {
                // Client-side skill filter on top of API results
                const q = resourceSearch.trim().toLowerCase();
                const filtered = q
                  ? resourceResults.filter((r) =>
                    `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(q) ||
                    r.email?.toLowerCase().includes(q) ||
                    (r.skills ?? []).some((s: string) => s.toLowerCase().includes(q)),
                  )
                  : resourceResults;
                return (
                  <CommandGroup
                    heading={resourceSearch.trim() ? 'Search results' : 'Resources'}
                  >
                    {filtered.length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground italic">No resources match &ldquo;{resourceSearch}&rdquo;</div>
                    )}
                    {[...filtered]
                      .sort((a, b) => {
                        const selA = selectedResourceIds.has(a.id) ? 1 : 0;
                        const selB = selectedResourceIds.has(b.id) ? 1 : 0;
                        if (selA !== selB) return selB - selA;
                        const aName = a.first_name || '';
                        const bName = b.first_name || '';
                        return aName.localeCompare(bName);
                      })
                      .flatMap((r, index, arr) => {
                        const isAdded = selectedResourceIds.has(r.id) || disabledResourceIds.has(r.id);
                        const isDisabled = disabledResourceIds.has(r.id);
                        const isToggling = togglingId === r.id;
                        const prevR = arr[index - 1];
                        const showDivider = index > 0 && selectedResourceIds.has(prevR?.id) && !isAdded;
                        const items: React.ReactNode[] = [];
                        if (showDivider) {
                          items.push(
                            <div key={`divider-${r.id}`} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-t border-b border-gray-200 dark:border-gray-700">
                              <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                                Others
                              </span>
                            </div>
                          );
                        }
                        items.push(
                          <CommandItem
                            key={r.id}
                            value={String(r.id)}
                            onSelect={() => { if (!isToggling && !isDisabled) handleToggleResource(r); }}
                            className={cn("gap-2", isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")}
                            disabled={isDisabled}
                          >
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage
                                src={
                                  r.profile_pic
                                    ? r.profile_pic.startsWith('http')
                                      ? r.profile_pic
                                      : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${r.profile_pic}`
                                    : undefined
                                }
                                alt={`${r.first_name} ${r.last_name}`}
                              />
                              <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                                {((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || ''}
                              </AvatarFallback>
                            </Avatar>
                            <SkillsHoverPopover skills={r.skills ?? []} emptyText="No skills">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium truncate leading-tight">
                                  {r.first_name} {r.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate leading-tight">
                                  {r.email}
                                </p>
                              </div>
                            </SkillsHoverPopover>
                            {isToggling ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0" />
                            ) : isAdded ? (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : null}
                          </CommandItem>
                        );
                        return items;
                      })}
                  </CommandGroup>
                );
              })()}
            </CommandList>
          </Command>
        )}

        {/* ── Tab 2: Resource Groups ── */}
        {dropdownTab === 'groups' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {poolsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground flex-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Loading groups...
              </div>
            ) : (
              <>
                {/* Search bar for pools — matches CommandInput style */}
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* Resource filter within groups */}
                <div className="flex items-center border-b px-3 bg-gray-50 dark:bg-gray-900/30">
                  <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
                  <input
                    type="text"
                    placeholder="Filter resources by name, skill..."
                    value={groupResourceFilter}
                    onChange={(e) => setGroupResourceFilter(e.target.value)}
                    className="flex h-8 w-full rounded-md bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
                  />
                  {groupResourceFilter && (
                    <button
                      onClick={() => setGroupResourceFilter('')}
                      className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0"
                    >
                      <Plus className="h-3 w-3 rotate-45" />
                    </button>
                  )}
                </div>

                {/* Searching spinner */}
                {isSearchingPools ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                    Searching...
                  </div>
                ) : (() => {
                  // searchedPools = null → show initial; array → show search results
                  const displayPools = searchedPools ?? pools;
                  const isSearchMode = searchedPools !== null;

                  if (displayPools.length === 0) {
                    return (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {isSearchMode ? `No groups match "${poolSearch}"` : 'No resource groups found'}
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-y-auto flex-1">
                      {displayPools.map((pool) => {
                        const addedInPool = (pool.resources as any[]).filter((r) =>
                          selectedResourceIds.has(r.id),
                        );
                        const allAdded =
                          pool.resources.length > 0 &&
                          addedInPool.length === pool.resources.length;
                        const someAdded = addedInPool.length > 0 && !allAdded;
                        const isProcessingPool = processingPoolId === pool.id;

                        return (
                          <div
                            key={pool.id}
                            className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                          >
                            {/* Pool header */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted sticky top-0 z-10">
                              {isProcessingPool ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary flex-shrink-0" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={allAdded}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someAdded;
                                  }}
                                  disabled={pool.resources.length === 0}
                                  onChange={() => handleToggleAllInPool(pool)}
                                  className="h-3.5 w-3.5 rounded cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                                  title={
                                    allAdded || someAdded
                                      ? 'Uncheck all in group'
                                      : 'Add all in group'
                                  }
                                />
                              )}
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-xs font-semibold truncate">{pool.name}</span>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                  ({(pool.resources as any[]).length})
                                </span>
                                {/*{addedInPool.length > 0 && (*/}
                                {/*  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">*/}
                                {/*    {addedInPool.length} added*/}
                                {/*  </span>*/}
                                {/*)}*/}
                              </div>
                            </div>

                            {/* Resources in this pool */}
                            {pool.resources.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-muted-foreground italic">
                                No resources in this group
                              </p>
                            ) : (() => {
                              const rq = groupResourceFilter.trim().toLowerCase();
                              const visibleResources = (rq
                                ? (pool.resources as any[]).filter((r) =>
                                  `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(rq) ||
                                  r.email?.toLowerCase().includes(rq) ||
                                  (r.skills ?? []).some((s: string) => s.toLowerCase().includes(rq)),
                                )
                                : [...(pool.resources as any[])]
                              ).sort((a, b) => {
                                const aName = a.first_name || '';
                                const bName = b.first_name || '';
                                return aName.localeCompare(bName);
                              });
                              if (visibleResources.length === 0) {
                                return (
                                  <p className="px-3 py-2 text-xs text-muted-foreground italic">
                                    No resources match &ldquo;{groupResourceFilter}&rdquo;
                                  </p>
                                );
                              }
                              return visibleResources.map((r) => {
                                const isAdded = selectedResourceIds.has(r.id) || disabledResourceIds.has(r.id);
                                const isDisabled = disabledResourceIds.has(r.id);
                                const isToggling = togglingId === r.id;
                                return (
                                  <div
                                    key={r.id}
                                    onClick={() =>
                                      !isToggling && !isProcessingPool && !isDisabled && handleToggleResource(r)
                                    }
                                    className={`flex items-center gap-2 px-3 py-2 transition-colors ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50'
                                      } ${isAdded ? 'bg-primary/5' : ''
                                      } ${isToggling || isProcessingPool || isDisabled ? 'pointer-events-none opacity-60' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAdded}
                                      disabled={isToggling || isProcessingPool || isDisabled}
                                      onChange={() => { }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isToggling && !isProcessingPool && !isDisabled)
                                          handleToggleResource(r);
                                      }}
                                      className="h-3.5 w-3.5 rounded cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                                    />
                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                      <AvatarImage
                                        src={
                                          r.profile_pic
                                            ? r.profile_pic.startsWith('http')
                                              ? r.profile_pic
                                              : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${r.profile_pic}`
                                            : undefined
                                        }
                                        alt={`${r.first_name} ${r.last_name}`}
                                      />
                                      <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                                        {((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <SkillsHoverPopover skills={r.skills ?? []}>
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-medium truncate">
                                          {r.first_name} {r.last_name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                          {r.email}
                                        </p>
                                      </div>
                                    </SkillsHoverPopover>
                                    <div className="flex-shrink-0 w-4">
                                      {isToggling && (
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        );
                      })}
                      {/* Footer hint when showing initial results */}
                      {!isSearchMode && (
                        <p className="px-3 py-2 text-center text-[11px] text-muted-foreground border-t border-gray-100 dark:border-gray-800">
                          Showing {displayPools.length} latest groups — search to find more
                        </p>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── Tab 3: Space Members (preloaded) ── */}
        {dropdownTab === 'space' && preloadedResources && (
          <Command shouldFilter={false} className="flex flex-col flex-1 overflow-hidden">
            <CommandInput
              placeholder="Search by name, skill..."
              value={spaceSearch}
              onValueChange={setSpaceSearch}
            />
            <CommandList className="flex-1 max-h-none overflow-y-auto">
              {filteredSpaceResources.length === 0 && (
                <CommandEmpty>No members found</CommandEmpty>
              )}
              {filteredSpaceResources.length > 0 && (
                <CommandGroup heading={`${filteredSpaceResources.length} member${filteredSpaceResources.length !== 1 ? 's' : ''}`}>
                  {filteredSpaceResources.flatMap((r, index) => {
                    const isAdded = selectedResourceIds.has(r.id) || disabledResourceIds.has(r.id);
                    const isDisabled = disabledResourceIds.has(r.id);
                    const isToggling = togglingId === r.id;
                    const prevR = filteredSpaceResources[index - 1];
                    const showDivider = index > 0 && selectedResourceIds.has(prevR?.id) && !isAdded;
                    const items: React.ReactNode[] = [];
                    if (showDivider) {
                      items.push(
                        <div key={`divider-${r.id}-${index}`} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50 border-t border-b border-gray-200 dark:border-gray-700">
                          <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                            Others
                          </span>
                        </div>
                      );
                    }
                    items.push(
                      <CommandItem
                        key={`resource-${r.id}-${index}`}
                        value={String(r.id)}
                        onSelect={() => { if (!isToggling && !isDisabled) handleToggleResource(r); }}
                        className={cn("gap-2", isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")}
                        disabled={isDisabled}
                      >
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage
                            src={
                              r.profile_pic
                                ? r.profile_pic.startsWith('http')
                                  ? r.profile_pic
                                  : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${r.profile_pic}`
                                : undefined
                            }
                            alt={`${r.first_name} ${r.last_name}`}
                          />
                          <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                            {((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <SkillsHoverPopover skills={r.skills ?? []} emptyText="No skills">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium truncate leading-tight">
                              {r.first_name} {r.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate leading-tight">
                              {r.email}
                            </p>
                          </div>
                        </SkillsHoverPopover>
                        {isToggling ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0" />
                        ) : isAdded ? (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : null}
                      </CommandItem>
                    );
                    return items;
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default TaskSpaceResourceDropdown;

