'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, Flag, Check, Loader2, X, Folder } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import { fetchResourceSkills } from '@/services/resource-management/resource-service';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
  patchTaskStatus,
  patchTaskSeverity,
  patchTaskAssignee,
  patchTaskCoAssignees,
} from '@/services/task-management/task.service';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';

// ─── User Avatar ─────────────────────────────────────────────────────────────

const UserAvatar = ({
  firstName,
  lastName,
  profilePic,
  size = 'sm',
}: {
  firstName?: string;
  lastName?: string;
  profilePic?: string | null;
  size?: 'xs' | 'sm' | 'md';
}) => {
  const sizeClasses = { xs: 'w-5 h-5 text-[10px]', sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm' };
  const fName = (firstName || '').trim();
  const lName = (lastName || '').trim();
  let initials = '?';

  if (fName && lName) {
    initials = (fName.charAt(0) + lName.charAt(0)).toUpperCase();
  } else if (fName && fName.includes(' ')) {
    const parts = fName.split(' ').filter(Boolean);
    if (parts.length > 1) {
      initials = (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    } else {
      initials = fName.substring(0, 2).toUpperCase();
    }
  } else if (fName) {
    initials = fName.substring(0, 2).toUpperCase();
  } else if (lName) {
    initials = lName.substring(0, 2).toUpperCase();
  }

  let finalProfilePic: string | undefined = undefined;
  if (profilePic && typeof profilePic === 'string' && profilePic.trim().length > 0 && profilePic !== 'null') {
    finalProfilePic = profilePic.startsWith('http')
      ? profilePic
      : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${profilePic}`;
  }

  return (
    <Avatar key={finalProfilePic || initials} className={sizeClasses[size]}>
      {finalProfilePic && <AvatarImage src={finalProfilePic} alt={`${firstName} ${lastName}`} className="object-cover" />}
      <AvatarFallback className="text-xs font-semibold dark:text-black">{initials}</AvatarFallback>
    </Avatar>
  );
};

// ─── Resource Row with skills hover ──────────────────────────────────────────

export function ResourceRow({
  r,
  selected,
  selectedSkill,
  onSelectSkill,
}: {
  r: any;
  /** Whether this resource is the currently-selected assignee (enables skill picking) */
  selected?: boolean;
  /** The skill currently recorded against the assignee, if any */
  selectedSkill?: string | null;
  /** Called when the user clicks a skill badge to (de)select it for the assignee */
  onSelectSkill?: (skill: string) => void;
}) {
  // An empty array means the config payload carried no skills for this resource
  // (e.g. a stale cache) — treat it as "unknown" so the hover fallback still
  // asks the per-resource endpoint rather than showing "No skills listed".
  const [fetchedSkills, setFetchedSkills] = useState<string[] | null>(
    r.skills?.length ? [...new Set<string>((r.skills as any[]).map((s: any) => {
      if (typeof s === 'string') return s;
      const skill = s?.skill ?? s?.name ?? s?.skillName;
      if (typeof skill === 'string') return skill;
      if (skill && typeof skill === 'object') return skill?.name ?? skill?.skill ?? JSON.stringify(skill);
      return JSON.stringify(s);
    }))] : null,
  );
  const [isFetchingSkills, setIsFetchingSkills] = useState(false);
  const fetchedRef = useRef(false);

  const handleMouseEnter = useCallback(async () => {
    if (fetchedRef.current || fetchedSkills !== null) return;
    fetchedRef.current = true;
    setIsFetchingSkills(true);
    try {
      const skills = await fetchResourceSkills(r.id);
      setFetchedSkills(skills);
    } catch {
      setFetchedSkills([]);
    } finally {
      setIsFetchingSkills(false);
    }
  }, [r.id, fetchedSkills]);

  const skills = fetchedSkills ?? [];

  const content = (
    <div className="flex items-center gap-2">
      <UserAvatar firstName={r.first_name} lastName={r.last_name} profilePic={r.profile_pic} size="sm" />
      <div className="flex flex-col">
        <span className="text-sm">{r.first_name} {r.last_name}</span>
        {r.email && <span className="text-xs text-muted-foreground">{r.email}</span>}
      </div>
    </div>
  );

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <div className="flex-1 min-w-0" onMouseEnter={handleMouseEnter}>{content}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-56 p-2.5" side="right" align="start">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
          Skills
        </p>
        {isFetchingSkills ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
          </div>
        ) : skills.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {skills.map((s, i) => {
              const isSkillSelected = !!selected && selectedSkill === s;
              return onSelectSkill ? (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectSkill(s);
                  }}
                >
                  <Badge
                    variant={isSkillSelected ? 'default' : 'outline'}
                    className="text-xs font-normal cursor-pointer gap-1 hover:bg-primary/10"
                  >
                    {isSkillSelected && <Check className="h-3 w-3" />}
                    {s}
                  </Badge>
                </button>
              ) : (
                <Badge key={i} variant="outline" className="text-xs font-normal">{s}</Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No skills listed</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}


// ─── Inline Editable Task Name ────────────────────────────────────────────────

interface InlineEditableTaskNameProps {
  name: string;
  onUpdate: (name: string) => Promise<void>;
  className?: string;
}

export function InlineEditableTaskName({
  name,
  onUpdate,
  className,
}: InlineEditableTaskNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value.trim() === '' || value === name) {
      setValue(name);
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await onUpdate(value.trim());
      setIsEditing(false);
    } catch {
      setValue(name);
      setIsEditing(false);
      toast.error('Failed to update task name', undefined, 'bottom-right');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    else if (e.key === 'Escape') { setValue(name); setIsEditing(false); }
  };

  if (isEditing) {
    return (
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'bg-transparent border-0 outline-none focus:outline-none focus:ring-0 m-0 p-0 text-sm font-semibold w-full leading-tight',
            isLoading && 'pr-5',
            className,
          )}
          style={{ boxShadow: 'inset 0 -2px 0 0 var(--primary)', padding: 0, margin: 0, border: 'none' }}
        />
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 absolute right-0 flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <span
      className={cn('cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors block', className)}
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      title="Click to edit"
    >
      {name}
    </span>
  );
}

// ─── Inline Editable Status ───────────────────────────────────────────────────

interface InlineEditableTaskStatusProps {
  status: any | null;
  statuses: any[];
  taskId: number;
  onUpdate?: (statusId: number) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableTaskStatus({
  status,
  statuses,
  taskId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableTaskStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);

  // Sync when parent confirms the new value — skip if ID already matches (avoids extra re-render)
  useEffect(() => { setLocalStatus((prev: any) => JSON.stringify(prev) === JSON.stringify(status) ? prev : status); }, [status]);

  const showLoading = externalLoading && !isLoading; // only config-loading blocks the button; saving is now optimistic

  const handleSelect = async (statusId: number) => {
    if (statusId === localStatus?.id) { setIsOpen(false); return; }
    const prev = localStatus;
    // ── Optimistic: show new value INSTANTLY before the PATCH ──
    const optimistic = statuses.find((s) => s.id === statusId) ?? prev;
    setLocalStatus(optimistic);
    setIsOpen(false);
    setIsLoading(true); // used for disabling re-click, no spinner shown
    try {
      if (onUpdate) {
        await onUpdate(statusId); // waits only for PATCH response
      } else {
        await patchTaskStatus(taskId, statusId);
        window.location.reload();
      }
    } catch {
      // console.error('Failed to update status:', error);
      setLocalStatus(prev); // revert on error
      toast.error('Failed to update task status', undefined, 'bottom-right');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer max-w-[140px] min-w-0"
          onClick={(e) => e.stopPropagation()}
          disabled={showLoading || readonly}
          title="Click to change status"
        >
          {showLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-gray-400 flex-shrink-0" />
              <span className="text-gray-400 italic whitespace-nowrap">Fetching...</span>
            </>
          ) : localStatus ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: localStatus.color }} />
              <span className="text-gray-700 dark:text-gray-300 truncate min-w-0 whitespace-nowrap">{localStatus.name}</span>
            </span>
          ) : (
            <span className="text-gray-400 italic whitespace-nowrap">No status</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()} onMouseLeave={() => setIsOpen(false)}>
        <DropdownMenuLabel className="text-xs">Select Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">No statuses configured</div>
        ) : (
          statuses.map((s) => {
            const isSelected = localStatus?.id === s.id;
            return (
              <DropdownMenuItem
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm flex-1">{s.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Severity ─────────────────────────────────────────────────

interface InlineEditableTaskSeverityProps {
  severity: any | null;
  severities: any[];
  taskId: number;
  onUpdate?: (severityId: number | null) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableTaskSeverity({
  severity,
  severities,
  taskId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableTaskSeverityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localSeverity, setLocalSeverity] = useState(severity);

  // Sync when parent confirms — skip if ID already matches
  useEffect(() => { setLocalSeverity((prev: any) => JSON.stringify(prev) === JSON.stringify(severity) ? prev : severity); }, [severity]);

  const showLoading = externalLoading && !isLoading;

  const handleSelect = async (severityId: number | null) => {
    if (severityId === (localSeverity?.id ?? null)) { setIsOpen(false); return; }
    const prev = localSeverity;
    // ── Optimistic: show new value INSTANTLY ──
    setLocalSeverity(severityId === null ? null : (severities.find((s) => s.id === severityId) ?? prev));
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(severityId);
      } else {
        await patchTaskSeverity(taskId, severityId);
        window.location.reload();
      }
    } catch {
      // console.error('Failed to update severity:', error);
      setLocalSeverity(prev);
      toast.error('Failed to update task severity', undefined, 'bottom-right');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          disabled={showLoading || readonly}
          title="Click to change severity"
        >
          {showLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-gray-400 flex-shrink-0" />
              <span className="text-gray-400 italic whitespace-nowrap">Fetching...</span>
            </>
          ) : localSeverity ? (
            <span className="inline-flex items-center gap-1.5">
              <Flag className="w-3 h-3 flex-shrink-0" fill={localSeverity.color} color={localSeverity.color} />
              <span className="text-gray-700 dark:text-gray-300">{localSeverity.name}</span>
            </span>
          ) : (
            <>
              <Flag className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span className="text-gray-400">No priority</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()} onMouseLeave={() => setIsOpen(false)}>
        <DropdownMenuLabel className="text-xs">Select Severity</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {severities.map((s) => {
          const isSelected = localSeverity?.id === s.id;
          return (
            <DropdownMenuItem
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
            >
              <div className="flex items-center gap-2 w-full">
                <Flag className="w-3 h-3 flex-shrink-0" fill={s.color} color={s.color} />
                <span className="text-sm flex-1">{s.name}</span>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Assignee ─────────────────────────────────────────────────

interface InlineEditableTaskAssigneeProps {
  assignee: any | null;
  /** Skill of the assignee relevant to this task (optional) */
  assigneeSkill?: string | null;
  resources: any[];
  taskMembers?: any[];
  taskId: number;
  onUpdate?: (assigneeId: number | null, assigneeSkill?: string | null) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableTaskAssignee({
  assignee,
  assigneeSkill,
  resources,
  taskMembers,
  taskId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableTaskAssigneeProps) {
  const [isOpen, setIsOpen] = useState(false); const [, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localAssignee, setLocalAssignee] = useState(assignee);
  const [localAssigneeSkill, setLocalAssigneeSkill] = useState<string | null | undefined>(assigneeSkill);
  // When set, the popover shows a "pick a skill" prompt for this resource instead of the
  // normal resource list (shown right after assigning without a skill).
  const [pendingSkillPrompt, setPendingSkillPrompt] = useState<any | null>(null);
  // Only block for external config loading; during save we show the optimistic avatar
  const showLoading = externalLoading;

  useEffect(() => { setLocalAssignee((prev: any) => JSON.stringify(prev) === JSON.stringify(assignee) ? prev : assignee); }, [assignee]);
  useEffect(() => { setLocalAssigneeSkill(assigneeSkill); }, [assigneeSkill]);
  useEffect(() => { if (!isOpen) setSearchQuery(''); }, [isOpen]);

  /** Close the "pick a skill" prompt without picking one. */
  const dismissSkillPrompt = () => {
    setPendingSkillPrompt(null);
    setIsOpen(false);
  };

  // `assigneeId` here is already the final desired value (null to unassign, or a resource id).
  // `skill` (when passed) is the final desired skill — callers compute the toggle themselves so
  // that removing just the skill never also unassigns the resource.
  const handleSelect = async (assigneeId: number | null, skill?: string | null) => {
    const newAssigneeId = assigneeId;
    const newSkill = newAssigneeId === null ? null : (skill ?? null);
    const prev = localAssignee;
    const prevSkill = localAssigneeSkill;

    // Freshly assigning via a plain row click (no skill picked yet) — keep the popover
    // open and switch it to a "pick a skill" prompt, if this resource has any skills.
    const isSkillClick = skill !== undefined;
    const r = newAssigneeId !== null ? resources.find((x) => x.id === newAssigneeId) : undefined;
    if (!isSkillClick && r && (r.skills ?? []).length > 0) {
      setPendingSkillPrompt(r);
    } else {
      setIsOpen(false);
      setPendingSkillPrompt(null);
    }

    // ── Optimistic: show new avatar INSTANTLY ──
    if (newAssigneeId === null) {
      setLocalAssignee(null);
    } else if (r) {
      setLocalAssignee({ id: r.id, first_name: r.first_name || r.firstName, last_name: r.last_name || r.lastName, profile_pic: r.profile_pic || r.profilePic });
    }
    setLocalAssigneeSkill(newSkill);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(newAssigneeId, newSkill);
      } else {
        await patchTaskAssignee(taskId, newAssigneeId, assignee?.id ?? null, undefined, newSkill);
        window.location.reload();
      }
    } catch {
      setLocalAssignee(prev); // revert on error
      setLocalAssigneeSkill(prevSkill);
      toast.error('Failed to update task assignee', undefined, 'bottom-right');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return resources
      .filter((r) =>
        `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aSelected = assignee?.id === a.id ? 1 : 0;
        const bSelected = assignee?.id === b.id ? 1 : 0;
        if (aSelected !== bSelected) return bSelected - aSelected;

        const aIsMember = taskMembers?.some(m => m.id === a.id) ? 1 : 0;
        const bIsMember = taskMembers?.some(m => m.id === b.id) ? 1 : 0;
        if (aIsMember !== bIsMember) return bIsMember - aIsMember;

        const aName = a.first_name || '';
        const bName = b.first_name || '';
        return aName.localeCompare(bName);
      });
  }, [resources, searchQuery, assignee, taskMembers]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(o) => { setIsOpen(o); if (!o) setPendingSkillPrompt(null); }}
    >
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center hover:ring-2 hover:ring-primary/50 rounded-full transition-all"
          onClick={(e) => e.stopPropagation()}
          disabled={showLoading}
          title={localAssignee
            ? `${localAssignee.first_name} ${localAssignee.last_name}\nSkill: ${localAssigneeSkill || 'Not selected'}`
            : 'Add co-assignees'}
        >
          {showLoading ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
            </div>
          ) : localAssignee ? (
            <UserAvatar
              firstName={localAssignee.first_name || localAssignee.firstName || localAssignee.userFirstName}
              lastName={localAssignee.last_name || localAssignee.lastName || localAssignee.userLastName}
              profilePic={localAssignee.profile_pic || localAssignee.profilePic || localAssignee.userProfilePicture}
              size="sm"
            />
          ) : (
            <div className="w-6 h-6 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0"
              title="Add assignee">
              <Plus className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" avoidCollisions={true} className="w-[300px] p-0" onClick={(e) => e.stopPropagation()} onMouseLeave={pendingSkillPrompt ? undefined : () => setIsOpen(false)}>
        {pendingSkillPrompt ? (
          <div className="relative flex flex-col p-3">
            <button
              type="button"
              onClick={dismissSkillPrompt}
              className="absolute top-2 right-2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-3 pr-5">
              <UserAvatar firstName={pendingSkillPrompt.first_name} lastName={pendingSkillPrompt.last_name} profilePic={pendingSkillPrompt.profile_pic} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate leading-tight">{pendingSkillPrompt.first_name} {pendingSkillPrompt.last_name}</div>
                <div className="text-[12px] text-muted-foreground leading-tight mt-0.5">Pick a relevant skill for this task</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto content-start">
              {[...new Set<string>(pendingSkillPrompt.skills as string[])].map((s: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(pendingSkillPrompt.id, s)}
                >
                  <Badge variant="outline" className="text-xs font-normal cursor-pointer hover:bg-primary/10">{s}</Badge>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search resources..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              {filteredResources.length === 0 && <CommandEmpty>No resource found.</CommandEmpty>}
              <CommandGroup>
                {filteredResources.map((r, index) => {
                  const isSelected = assignee?.id === r.id;
                  const isMember = !isSelected && !!taskMembers?.some(m => m.id === r.id);
                  const isOther = !isSelected && !isMember;

                  const prevR = filteredResources[index - 1];
                  const prevIsSelected = prevR ? assignee?.id === prevR.id : false;
                  const prevIsMember = prevR && !prevIsSelected ? !!taskMembers?.some(m => m.id === prevR.id) : false;
                  const prevIsOther = prevR ? !prevIsSelected && !prevIsMember : false;

                  const showAssignedTitle = isSelected && !prevIsSelected;
                  const showMemberTitle = isMember && !prevIsMember && taskMembers && taskMembers.length > 0;
                  const showOtherTitle = isOther && (!prevR || (!prevIsOther && (prevIsSelected || prevIsMember)));

                  return (
                    <React.Fragment key={r.id}>
                      {showAssignedTitle && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                          <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                            Assigned
                          </span>
                        </div>
                      )}
                      {showMemberTitle && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                          <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                            Space Members
                          </span>
                        </div>
                      )}
                      {showOtherTitle && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                          <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                            Guest Members
                          </span>
                        </div>
                      )}
                      <CommandItem value={`${r.first_name} ${r.last_name} ${r.email}`} onSelect={() => handleSelect(isSelected ? null : r.id)} className="cursor-pointer">
                        <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                        <ResourceRow
                          r={r}
                          selected={isSelected}
                          selectedSkill={localAssigneeSkill}
                          onSelectSkill={(skill) => {
                            // Toggle only the skill — keep (or set) the resource as assignee either way.
                            const isSameSkillSelected = isSelected && localAssigneeSkill === skill;
                            handleSelect(r.id, isSameSkillSelected ? null : skill);
                          }}
                        />
                      </CommandItem>
                    </React.Fragment>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Inline Editable Co-Assignees ─────────────────────────────────────────────

interface InlineEditableTaskCoAssigneesProps {
  coAssignees: any[];
  resources: any[];
  taskMembers?: any[];
  taskId: number;
  onUpdate?: (coAssigneeIds: number[]) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableTaskCoAssignees({
  coAssignees,
  resources,
  taskMembers,
  taskId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableTaskCoAssigneesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Only block trigger for external loading; during save the optimistic avatars are shown
  const showLoading = (!isOpen && externalLoading);

  const initialIds = useMemo(() => coAssignees.map((c) => c.id), [coAssignees]);
  const [selectedIds, setSelectedIds] = useState<number[]>(initialIds);
  const [savedIds, setSavedIds] = useState<number[]>(initialIds);

  useEffect(() => {
    const ids = coAssignees.map((c) => c.id);
    setSelectedIds(ids);
    setSavedIds(ids);
  }, [coAssignees]);

  useEffect(() => { if (!isOpen) setSearchQuery(''); }, [isOpen]);

  const localCoAssignees = useMemo(() => {
    const originalOrder = new Map(coAssignees.map((c, i) => [c.id, i]));
    const selected = resources.filter((r) => selectedIds.includes(r.id));
    selected.sort((a, b) => {
      const indexA = originalOrder.has(a.id) ? originalOrder.get(a.id)! : Infinity;
      const indexB = originalOrder.has(b.id) ? originalOrder.get(b.id)! : Infinity;
      if (indexA !== indexB) return indexA - indexB;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
    return selected;
  }, [resources, selectedIds, coAssignees]);

  const handleOpenChange = async (open: boolean) => {
    if (!open && !isLoading) {
      const hasChanged = selectedIds.length !== savedIds.length || selectedIds.some((id) => !savedIds.includes(id));
      if (hasChanged) {
        setIsLoading(true);
        try {
          if (onUpdate) {
            await onUpdate(selectedIds);
          } else {
            await patchTaskCoAssignees(taskId, selectedIds);
            window.location.reload();
          }
          setSavedIds(selectedIds);
        } catch {
          setSelectedIds(savedIds);
          toast.error('Failed to update task co-assignees', undefined, 'bottom-right');
        } finally {
          setIsLoading(false);
        }
      }
    }
    setIsOpen(open);
  };

  const handleToggle = (resourceId: number) => {
    setSelectedIds((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId],
    );
  };

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return resources
      .filter((r) => `${r.first_name ?? ''} ${r.last_name ?? ''}`.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q))
      .sort((a, b) => {
        const aSelected = selectedIds.includes(a.id) ? 1 : 0;
        const bSelected = selectedIds.includes(b.id) ? 1 : 0;
        if (aSelected !== bSelected) return bSelected - aSelected;

        const aIsMember = taskMembers?.some(m => m.id === a.id) ? 1 : 0;
        const bIsMember = taskMembers?.some(m => m.id === b.id) ? 1 : 0;
        if (aIsMember !== bIsMember) return bIsMember - aIsMember;

        const aName = a.first_name || '';
        const bName = b.first_name || '';
        return aName.localeCompare(bName);
      });
  }, [resources, searchQuery, selectedIds, taskMembers]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center group/avatars rounded-full transition-all"
          onClick={(e) => e.stopPropagation()}
          disabled={isLoading || externalLoading || readonly}
          title={localCoAssignees.length > 0 ? `Co-assignees: ${localCoAssignees.map((r) => `${r.first_name || r.firstName} ${r.last_name || r.lastName}`).join(', ')}` : 'Add co-assignees'}
        >
          <AvatarGroup className={cn("*:transition-all *:ring-1 *:ring-border *:group-hover/avatars:ring-2 *:group-hover/avatars:ring-primary/50", localCoAssignees.length <= 1 ? '-space-x-0' : '')}>
            {showLoading ? (
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              </div>
            ) : localCoAssignees.length > 0 ? (
              <>
                {localCoAssignees.slice(0, 1).map((r) => (
                  <div key={r.id} className="relative rounded-full overflow-hidden">
                    <UserAvatar firstName={r.first_name || r.firstName} lastName={r.last_name || r.lastName} profilePic={r.profile_pic || r.profilePic} size="sm" />
                  </div>
                ))}
                {localCoAssignees.length > 1 && (
                  <AvatarGroupCount>
                    +{localCoAssignees.length - 1}
                  </AvatarGroupCount>
                )}
              </>
            ) : (
              <div className="w-6 h-6 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </AvatarGroup>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" avoidCollisions={true} className="w-[300px] p-0" onClick={(e) => e.stopPropagation()} onMouseLeave={() => handleOpenChange(false)}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search resources..." value={searchQuery} onValueChange={setSearchQuery} />
          <CommandList>
            {filteredResources.length === 0 && <CommandEmpty>No resource found.</CommandEmpty>}
            <CommandGroup>
              {filteredResources.map((r, index) => {
                const isSelected = selectedIds.includes(r.id);
                const isMember = !isSelected && !!taskMembers?.some(m => m.id === r.id);
                const isOther = !isSelected && !isMember;

                const prevR = filteredResources[index - 1];
                const prevIsSelected = prevR ? selectedIds.includes(prevR.id) : false;
                const prevIsMember = prevR && !prevIsSelected ? !!taskMembers?.some(m => m.id === prevR.id) : false;
                const prevIsOther = prevR ? !prevIsSelected && !prevIsMember : false;

                const showAssignedTitle = isSelected && !prevIsSelected;
                const showMemberTitle = isMember && !prevIsMember && taskMembers && taskMembers.length > 0;
                const showOtherTitle = isOther && (!prevR || (!prevIsOther && (prevIsSelected || prevIsMember)));

                return (
                  <React.Fragment key={r.id}>
                    {showAssignedTitle && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                          Selected
                        </span>
                      </div>
                    )}
                    {showMemberTitle && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                          Space Members
                        </span>
                      </div>
                    )}
                    {showOtherTitle && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                          Guest Members
                        </span>
                      </div>
                    )}
                    <CommandItem value={`${r.first_name} ${r.last_name} ${r.email}`} onSelect={() => handleToggle(r.id)} className="cursor-pointer">
                      <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      <ResourceRow r={r} />
                    </CommandItem>
                  </React.Fragment>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────
// Inline Editable Hierarchy Level
// ─────────────────────────────────────────────────────────────────

interface InlineEditableTaskHierarchyLevelProps {
  hierarchyLevel: any | null;
  hierarchyLevels: any[];
  taskId: number;
  onUpdate?: (hierarchyLevelConfigId: number) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableTaskHierarchyLevel({
  hierarchyLevel,
  hierarchyLevels,
  taskId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableTaskHierarchyLevelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localLevel, setLocalLevel] = useState(hierarchyLevel);

  // Sync when parent confirms the new value
  useEffect(() => {
    setLocalLevel((prev: any) => (JSON.stringify(prev) === JSON.stringify(hierarchyLevel) ? prev : hierarchyLevel));
  }, [hierarchyLevel]);

  const showLoading = externalLoading && !isLoading;
  const sortedLevels = [...(hierarchyLevels ?? [])].sort((a: any, b: any) => a.sequence - b.sequence);
  const CurrentIcon = localLevel?.icon ? getHierarchyLevelIcon(localLevel.icon) : Folder;
  const currentColor = localLevel?.color ?? '#6B7280';

  const handleSelect = async (levelId: number) => {
    if (levelId === localLevel?.id) {
      setIsOpen(false);
      return;
    }
    const prev = localLevel;
    const optimistic = hierarchyLevels.find((l) => l.id === levelId) ?? prev;
    setLocalLevel(optimistic);
    setIsOpen(false);
    setIsLoading(true);

    try {
      if (onUpdate) {
        await onUpdate(levelId);
      } else {
        window.location.reload();
      }
    } catch {
      setLocalLevel(prev);
      toast.error('Failed to update task hierarchy level');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center rounded px-0.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          disabled={showLoading || readonly}
        // title={showLoading ? 'Fetching' : `Click to change hierarchy level (${localLevel?.name ?? 'No level'})`}
        >
          {showLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
          ) : (
            <CurrentIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentColor }} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="text-xs font-semibold text-gray-500">Select Level</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedLevels.map((level) => {
          const isSelected = localLevel?.id === level.id;
          const LevelIcon = level.icon ? getHierarchyLevelIcon(level.icon) : Folder;
          return (
            <DropdownMenuItem
              key={level.id}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(level.id);
              }}
              className={cn('flex items-center gap-2 cursor-pointer', isSelected && 'bg-gray-100 dark:bg-gray-800')}
            >
              <LevelIcon className="w-4 h-4 flex-shrink-0" style={{ color: level.color || '#6B7280' }} />
              <span className="flex-1 truncate">{level.name}</span>
              {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-primary flex-shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
