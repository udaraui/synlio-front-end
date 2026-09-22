'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, Users, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

import { Resource } from '@/interfaces/resource';
import { ResourcePool } from '@/interfaces/resource-pool';
// Adjust your imports based on your actual service file paths:
import { loadResource, getResourceSkills, searchResourcesWithSkills } from '@/services/resource-service';
import { loadResourcePools } from '@/services/resource-pool-service';

interface ResourceSelectorProps {
  projectGroupId?: number;
  projectId?: number;
  selectedResources: Resource[];
  onChange: (resources: Resource[]) => void;
  onClose?: () => void;
  mode: 'single' | 'multi';
  label?: string;
  placeholder?: string;
  required?: boolean;
  triggerElement?: React.ReactNode;
  showTrigger?: boolean;
  disabled?: boolean;
  showAllTabs?: boolean;
  showResourceGroups?: boolean;
  selectionType?: 'assignee' | 'co-assignee' | 'member';
}

// ─── SkillsHoverPopover: dynamic skill fetching on hover ──────────────────
function SkillsHoverPopover({
  resourceId,
  emptyText,
  children,
}: {
  resourceId: number;
  emptyText?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  // Fetch skills only when popover opens and hasn't been cached yet
  useEffect(() => {
    if (open && !hasFetched && resourceId) {
      const fetchSkills = async () => {
        setLoading(true);
        try {
          // Pass the resourceId and desired count (3)
          const response = await getResourceSkills(resourceId, 3);

          // Handles both direct array responses or wrapped data structures safely
          const skillData = Array.isArray(response) ? response : (response?.data || []);
          setSkills(skillData);
          setHasFetched(true);
        } catch (error) {
          console.error("Error fetching resource skills:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSkills();
    }
  }, [open, hasFetched, resourceId]);

  // Reset skills state if the row instance represents a completely different resource ID
  useEffect(() => {
    setSkills([]);
    setHasFetched(false);
  }, [resourceId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div onMouseEnter={enter} onMouseLeave={leave} className="flex-1 min-w-0">
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-3 w-auto min-w-[200px] max-w-[300px] z-[9999]"
        side="right"
        align="start"
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <p className="text-[11px] font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Skills
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
            Loading skills...
          </div>
        ) : !skills || skills.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">{emptyText ?? 'No skills'}</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {skills.map((skillItem, index) => (
              <span
                key={skillItem?.id || `skill-${index}`}
                className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-0.5 text-xs text-gray-800 dark:text-gray-200"
              >
                {skillItem?.skillName || 'Unknown Skill'}
              </span>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ResourceSelector({
  projectGroupId,
  projectId,
  selectedResources,
  onChange,
  onClose,
  mode,
  label,
  placeholder = 'Select resource...',
  required,
  triggerElement,
  showTrigger = true,
  disabled,
  showAllTabs = true,
  showResourceGroups = true,
  selectionType,
}: ResourceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'project' | 'all' | 'pools'>('project');
  const [searchQuery, setSearchQuery] = useState('');

  const [projectResources, setProjectResources] = useState<Resource[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [resourcePools, setResourcePools] = useState<ResourcePool[]>([]);
  
  // ── Backend Skill Search States ──
  const [searchedResources, setSearchedResources] = useState<Resource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default active tab logic
  useEffect(() => {
    if (!projectGroupId && !projectId && showAllTabs) {
      setActiveTab('all');
    }
  }, [projectGroupId, projectId, showAllTabs]);

  // Baseline Data Fetching (When empty query or tab switches)
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let companyId = 0;
        if (typeof window !== 'undefined') {
          const storedCompanyId = localStorage.getItem('active_company');
          companyId = JSON.parse(storedCompanyId || '{}').companyId;
        }
        const filters: any[] = [
          { field: "active_status", matchMode: "equals", value: true },
        ];

        if (companyId) {
          filters.push({
            field: "companyId",
            matchMode: "equals",
            value: companyId,
          });
        }

        const queryParam = { filters };
        if (activeTab === 'project' && (projectGroupId || projectId)) {
          if (projectResources.length === 0) {
            // const data = await getProjectGroupResources(projectGroupId || projectId || 0);
            // setProjectResources(data || []);
          }
        } else if (activeTab === 'all') {
          if (allResources.length === 0) {
            const response = await loadResource(queryParam);
            setAllResources(response?.data || []);
          }
        } else if (activeTab === 'pools') {
          if (resourcePools.length === 0) {
            const response = await loadResourcePools(queryParam);
            setResourcePools(response?.data || []);
          }
        }
      } catch (error) {
        toast.error('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, activeTab, projectGroupId, projectId]);

  // ── Debounced Server-Side Skill Searching Effect ──
  useEffect(() => {
    if (!isOpen || activeTab !== 'all') {
      setSearchedResources([]);
      return;
    }

    if (!searchQuery.trim()) {
      setSearchedResources([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Calls the updated backend skill index routing
        const data = await searchResourcesWithSkills(searchQuery, 50);
        setSearchedResources(data || []);
      } catch (error) {
        console.error("Error searching resources with skills:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms delay window

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab, isOpen]);

  // Handlers
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
      setSearchedResources([]);
      if (onClose) onClose();
    }
  };

  const handleTabChange = (tab: 'project' | 'all' | 'pools') => {
    setActiveTab(tab);
    setSearchQuery('');
    setSearchedResources([]);
  };

  const handleResourceToggle = (resource: Resource) => {
    const resourceId = resource.id || (resource as any).resourceId;
    const isSelected = selectedResources.some((r) => (r.id || (r as any).resourceId) === resourceId);

    if (mode === 'single') {
      onChange(isSelected ? [] : [resource]);
      setIsOpen(false);
    } else {
      if (isSelected) {
        onChange(selectedResources.filter((r) => (r.id || (r as any).resourceId) !== resourceId));
      } else {
        onChange([...selectedResources, resource]);
      }
    }
  };

  const handlePoolSelect = (pool: ResourcePool) => {
    if (!pool.resources || pool.resources.length === 0) return;

    if (mode === 'single') {
      toast.warning('Cannot select entire group in single selection mode');
      return;
    }

    const newResources = [...selectedResources];
    let addedCount = 0;

    pool.resources.forEach((poolRes: any) => {
      const resId = poolRes.id || poolRes.resourceId;
      if (!newResources.some(r => (r.id || (r as any).resourceId) === resId)) {
        newResources.push(poolRes);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      onChange(newResources);
      toast.success(`Added ${addedCount} members from group`);
    } else {
      toast.info('All group members are already selected');
    }
  };

  // Derived Data Lists
  const currentResourceList = activeTab === 'project' ? projectResources : allResources;

  const sortedFilteredResources = useMemo(() => {
    let result = [];
    if (activeTab === 'all' && searchQuery.trim()) {
      result = [...searchedResources];
    } else {
      if (!searchQuery.trim()) {
        result = [...currentResourceList];
      } else {
        const query = searchQuery.toLowerCase();
        result = currentResourceList.filter(r =>
          r.first_name?.toLowerCase().includes(query) ||
          r.last_name?.toLowerCase().includes(query) ||
          r.email?.toLowerCase().includes(query) ||
          ((r as any).skills ?? []).some((s: string) => s.toLowerCase().includes(query))
        );
      }
    }
    
    return result.sort((a, b) => {
      const aName = a.first_name || '';
      const bName = b.first_name || '';
      return aName.localeCompare(bName);
    });
  }, [currentResourceList, searchQuery, searchedResources, activeTab]);

  const filteredResourcePools = useMemo(() => {
    if (!searchQuery.trim()) return resourcePools;
    const query = searchQuery.toLowerCase();
    return resourcePools.filter(p => {
      const poolName = ((p as any).resource_pool_name || p.name || '').toLowerCase();
      if (poolName.includes(query)) return true;
      if (p.resources && Array.isArray(p.resources)) {
        return (p.resources as any[]).some(r =>
          r.first_name?.toLowerCase().includes(query) ||
          r.last_name?.toLowerCase().includes(query) ||
          r.email?.toLowerCase().includes(query) ||
          (r.skills ?? []).some((s: string) => s.toLowerCase().includes(query))
        );
      }
      return false;
    });
  }, [resourcePools, searchQuery]);

  const getDisplayText = () => {
    if (selectedResources.length === 0) return placeholder;
    if (mode === 'single' || selectedResources.length === 1) {
      const r = selectedResources[0];
      return `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Selected';
    }
    return `${selectedResources.length} resources selected`;
  };

  const defaultTrigger = (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={`w-full text-left flex items-center justify-between px-3 py-2 border border-input rounded-md text-sm ${disabled
        ? 'cursor-not-allowed opacity-60'
        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-black'
        }`}
    >
      <span
        className={`truncate ${disabled
          ? 'text-gray-400 dark:text-gray-600'
          : selectedResources.length > 0
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-muted-foreground'
          }`}
      >
        {getDisplayText()}
      </span>
    </div>
  );

  return (
    <div className="relative w-full">
      {showTrigger && label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label} {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          {showTrigger ? (triggerElement || defaultTrigger) : <div className="hidden" />}
        </PopoverTrigger>

        <PopoverContent
          className="w-96 p-0 flex flex-col z-[9999]"
          style={{ height: 'min(420px, var(--radix-popover-content-available-height, 420px))' }}
          align="start"
          sideOffset={8}
          avoidCollisions={true}
          collisionPadding={12}
        >
          {/* ── Tab header ── */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {(!showAllTabs || !!projectGroupId || !!projectId) && (
              <button
                onClick={() => handleTabChange('project')}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'project'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                Project Team
              </button>
            )}

            {(showAllTabs || (!projectGroupId && !projectId)) && (
              <>
                <button
                  onClick={() => handleTabChange('all')}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'all'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  All Resources
                </button>
                {showResourceGroups && (
                  <button
                    onClick={() => handleTabChange('pools')}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'pools'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    Resource Groups
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Command List ── */}
          <Command shouldFilter={false} className="flex flex-col flex-1 overflow-hidden">
            <CommandInput
              placeholder="Search by name, email or skill..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-none focus:ring-0"
            />
            <CommandList className="flex-1 max-h-none overflow-y-auto">
              {/* Added handles for live network querying */}
              {(loading || isSearching) && (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Searching...
                </div>
              )}

              {/* Individual Resources Tab (Project / All) */}
              {!(loading || isSearching) && activeTab !== 'pools' && sortedFilteredResources.length === 0 && (
                <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                  No resources found
                </CommandEmpty>
              )}

              {!(loading || isSearching) && activeTab !== 'pools' && sortedFilteredResources.length > 0 && (
                <CommandGroup heading={searchQuery.trim() ? 'Search results' : 'Resources'}>
                  {sortedFilteredResources.map((r) => {
                    const resourceId = r.id || (r as any).resourceId;
                    const isSelected = selectedResources.some(
                      (sr) => (sr.id || (sr as any).resourceId) === resourceId
                    );

                    return (
                      <CommandItem
                        key={resourceId}
                        onSelect={() => handleResourceToggle(r)}
                        className="flex items-center gap-3 py-2 px-3 cursor-pointer mb-1"
                      >
                        <Avatar className="h-8 w-8 bg-primary/10">
                          <AvatarImage src={(r as any).profile_pic || ''} />
                          <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                            {((r.first_name?.[0] || '') + (r.last_name?.[0] || '')).toUpperCase() || ''}
                          </AvatarFallback>
                        </Avatar>

                        <SkillsHoverPopover resourceId={Number(resourceId)} emptyText="No skills">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">
                              {r.first_name} {r.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate leading-tight">
                              {r.email}
                            </p>
                          </div>
                        </SkillsHoverPopover>

                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Groups Tab */}
              {showResourceGroups && (
                <>
                  {!(loading || isSearching) && activeTab === 'pools' && filteredResourcePools.length === 0 && (
                    <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                      No resource groups found
                    </CommandEmpty>
                  )}

                  {!(loading || isSearching) && activeTab === 'pools' && filteredResourcePools.length > 0 && (
                    <CommandGroup heading="Groups">
                      {filteredResourcePools.map((pool) => {
                        const poolName = (pool as any).resource_pool_name || pool.name;
                        const count = pool.resources?.length || 0;

                        const selectedCount = pool.resources?.filter(pr =>
                          selectedResources.some(sr => (sr.id || (sr as any).resourceId) === (pr.id || (pr as any).resourceId))
                        ).length || 0;

                        const isFullySelected = count > 0 && selectedCount === count;

                        return (
                          <CommandItem
                            key={pool.id}
                            onSelect={() => handlePoolSelect(pool)}
                            className="flex items-center justify-between py-2.5 px-3 cursor-pointer mb-1"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium leading-tight">{poolName}</p>
                                <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                  {count} member{count !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            {isFullySelected ? (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <div className="h-6 w-6 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                                <Plus className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}