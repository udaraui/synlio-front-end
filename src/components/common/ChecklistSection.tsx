'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, Loader2, Pencil, Plus, Save, Trash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  createTmChecklist,
  deleteTmChecklist,
  getTmChecklistByTask,
  updateTmChecklist,
} from '@/services/task-management/task-checklist.service';
import {
  createTicketChecklist,
  deleteTicketChecklist,
  getTicketChecklistByTicket,
  updateTicketChecklist,
} from '@/services/ticket-management/ticket-checklist.service';
import type { TaskChecklist } from '@/interfaces/task-checklist';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * One checklist row. Task and ticket rows are structurally identical apart
 * from their owning foreign key, so the UI works against this shared shape.
 */
export type ChecklistItem = Omit<TaskChecklist, 'taskId'> & {
  taskId?: number;
  ticketId?: number;
};

/** A selectable assignee — matches the shape of a Resource row. */
export interface ChecklistResource {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_pic?: string | null;
}

/**
 * Per-entity CRUD binding, so the section body stays entity-agnostic.
 */
const CHECKLIST_API = {
  Task: {
    list: (id: number) => getTmChecklistByTask(id),
    create: (id: number, name: string) => createTmChecklist({ taskId: id, name }),
    update: updateTmChecklist,
    remove: deleteTmChecklist,
  },
  Ticket: {
    list: (id: number) => getTicketChecklistByTicket(id),
    create: (id: number, name: string) => createTicketChecklist({ ticketId: id, name }),
    update: updateTicketChecklist,
    remove: deleteTicketChecklist,
  },
} as const;

export interface ChecklistSectionProps {
  /** Mode of operation. If 'unbound', it manages state locally without API calls. */
  mode?: 'bound' | 'unbound';
  /** Initial items for unbound mode. */
  initialItems?: ChecklistItem[];
  /** Which entity this checklist belongs to. Drives which service is called. */
  entityType: 'Task' | 'Ticket';
  /** The entity's id. The section only renders/loads once this is present. */
  entityId: number;
  /**
   * Resources selectable as a checklist-item assignee — normally the same list
   * used by the parent's assignee dropdown (space members + guests).
   */
  resources: ChecklistResource[];
  /** Ids that are members of the space, used only for section grouping. */
  memberIds?: number[];
  /** True while `resources` is still being fetched. */
  isResourcesLoading?: boolean;
  /** Notifies the parent that something was persisted (for the autosave stamp). */
  onSaved?: (at: Date) => void;
  /** Notifies the parent whenever the item list changes (e.g. for a count badge). */
  onItemsChange?: (items: ChecklistItem[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initialsOf = (r?: { first_name?: string; last_name?: string } | null) =>
  `${r?.first_name?.charAt(0) ?? ''}${r?.last_name?.charAt(0) ?? ''}`.toUpperCase() || '?';

const fullNameOf = (r?: { first_name?: string; last_name?: string } | null) =>
  `${r?.first_name ?? ''} ${r?.last_name ?? ''}`.trim();

/**
 * Assignee picker for one checklist item. Mirrors the task assignee dropdown,
 * but opens straight onto the resource list — no skill step.
 */
function ChecklistAssigneePicker({
  value,
  valueName,
  valueProfilePic,
  resources,
  memberIds,
  isLoading,
  onSelect,
}: {
  value?: number | null;
  valueName?: string | null;
  valueProfilePic?: string | null;
  resources: ChecklistResource[];
  memberIds: number[];
  isLoading?: boolean;
  onSelect: (resourceId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = resources.find((r) => r.id === value);
  // Fall back to the denormalized fields when the resource isn't in the list
  // (e.g. a guest who has since been removed from the space).
  const displayName = selected ? fullNameOf(selected) : valueName ?? '';
  const displayPic = selected ? selected.profile_pic : valueProfilePic;

  const filtered = resources.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      fullNameOf(r).toLowerCase().startsWith(q) ||
      !!r.email?.toLowerCase().startsWith(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const aSelected = value === a.id ? 1 : 0;
    const bSelected = value === b.id ? 1 : 0;
    if (aSelected !== bSelected) return bSelected - aSelected;

    const aIsMember = memberIds.includes(a.id) ? 1 : 0;
    const bIsMember = memberIds.includes(b.id) ? 1 : 0;
    if (aIsMember !== bIsMember) return bIsMember - aIsMember;

    return (a.first_name ?? '').localeCompare(b.first_name ?? '');
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-shrink-0 focus:outline-none rounded-full"
          title={value ? `${displayName} — click to change` : 'Assign'}
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity">
            {value ? (
              <>
                <AvatarImage src={displayPic ?? undefined} alt={displayName} />
                <AvatarFallback className="text-[10px] font-semibold bg-primary text-primary-foreground">
                  {selected ? initialsOf(selected) : displayName.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </>
            ) : (
              <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground">
                <Plus className="w-3 h-3" />
              </AvatarFallback>
            )}
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0"
        style={{ height: '280px' }}
        align="end"
        side="bottom"
        avoidCollisions
      >
        <Command shouldFilter={false} className="flex flex-col h-full">
          <CommandInput
            placeholder="Search resources..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="flex-1 overflow-y-auto max-h-none">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading resources...
              </div>
            ) : (
              <>
                <CommandEmpty>No resource found.</CommandEmpty>
                <CommandGroup>
                  {sorted.map((r, index, arr) => {
                    const isSelected = value === r.id;
                    const isMember = !isSelected && memberIds.includes(r.id);
                    const isOther = !isSelected && !isMember;

                    const prev = arr[index - 1];
                    const prevIsSelected = prev ? value === prev.id : false;
                    const prevIsMember =
                      prev && !prevIsSelected ? memberIds.includes(prev.id) : false;
                    const prevIsOther = prev ? !prevIsSelected && !prevIsMember : false;

                    const showAssigned = isSelected && !prevIsSelected;
                    const showMember = isMember && !prevIsMember && memberIds.length > 0;
                    const showOther =
                      isOther && (!prev || (!prevIsOther && (prevIsSelected || prevIsMember)));

                    return (
                      <React.Fragment key={r.id}>
                        {showAssigned && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Assigned
                            </span>
                          </div>
                        )}
                        {showMember && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Space Members
                            </span>
                          </div>
                        )}
                        {showOther && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Guest Members
                            </span>
                          </div>
                        )}
                        <CommandItem
                          value={`${r.first_name} ${r.last_name} ${r.email}`}
                          onSelect={() => {
                            // Clicking the current assignee unassigns.
                            onSelect(isSelected ? null : r.id);
                            setOpen(false);
                            setSearch('');
                          }}
                        >
                          <Check
                            className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                          />
                          <Avatar className="h-6 w-6 mr-2 flex-shrink-0">
                            <AvatarImage src={r.profile_pic ?? undefined} alt={fullNameOf(r)} />
                            <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                              {initialsOf(r)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate leading-tight">
                              {fullNameOf(r)}
                            </div>
                            {r.email && (
                              <div className="text-xs text-muted-foreground truncate leading-tight">
                                {r.email}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      </React.Fragment>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── ChecklistSection ────────────────────────────────────────────────────────

export function ChecklistSection({
  mode = 'bound',
  initialItems,
  entityType,
  entityId,
  resources,
  memberIds = [],
  isResourcesLoading,
  onSaved,
  onItemsChange,
}: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const api = CHECKLIST_API[entityType];

  const applyItems = useCallback(
    (next: ChecklistItem[]) => {
      setItems(next);
      onItemsChange?.(next);
    },
    [onItemsChange],
  );

  useEffect(() => {
    if (mode === 'unbound') {
      applyItems(initialItems || []);
      setIsLoading(false);
      return;
    }

    if (!entityId) return;
    let cancelled = false;
    setIsLoading(true);
    api.list(entityId)
      .then((res) => {
        if (cancelled) return;
        applyItems(res ?? []);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType, mode, initialItems]);

  const done = items.filter((i) => i.isChecked).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || isAdding) return;
    
    if (mode === 'unbound') {
      const created = {
        id: -Date.now(), // Fake ID
        name,
        isChecked: false,
        assigneeId: null,
      } as ChecklistItem;
      applyItems([...items, created]);
      setNewName('');
      return;
    }

    setIsAdding(true);
    try {
      const created = await api.create(entityId, name);
      applyItems([...items, created]);
      setNewName('');
      toast.success('Item added');
      onSaved?.(created?.updatedAt ? new Date(created.updatedAt) : new Date());
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    const next = !item.isChecked;
    applyItems(items.map((i) => (i.id === item.id ? { ...i, isChecked: next } : i)));
    if (mode === 'unbound') return;

    try {
      await api.update(item.id!, { isChecked: next });
      onSaved?.(new Date());
    } catch {
      applyItems(items.map((i) => (i.id === item.id ? item : i)));
      toast.error('Failed to update item');
    }
  };

  const commitRename = async (item: ChecklistItem) => {
    const name = editingName.trim();
    setEditingId(null);
    if (!name || name === item.name) return;
    applyItems(items.map((i) => (i.id === item.id ? { ...i, name } : i)));
    if (mode === 'unbound') return;

    try {
      await api.update(item.id!, { name });
      onSaved?.(new Date());
    } catch {
      applyItems(items.map((i) => (i.id === item.id ? item : i)));
      toast.error('Failed to rename item');
    }
  };

  const handleAssign = async (item: ChecklistItem, assigneeId: number | null) => {
    const resource = resources.find((r) => r.id === assigneeId);
    const optimistic: ChecklistItem = {
      ...item,
      assigneeId,
      assigneeName: resource ? fullNameOf(resource) : null,
      assigneeEmail: resource?.email ?? null,
      assigneeProfilePicUrl: resource?.profile_pic ?? null,
    };
    applyItems(items.map((i) => (i.id === item.id ? optimistic : i)));
    if (mode === 'unbound') return;

    try {
      const updated = await api.update(item.id!, { assigneeId });
      applyItems(items.map((i) => (i.id === item.id ? updated : i)));
      onSaved?.(new Date());
    } catch {
      applyItems(items.map((i) => (i.id === item.id ? item : i)));
      toast.error('Failed to update assignee');
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    const prev = [...items];
    applyItems(items.filter((i) => i.id !== item.id));
    if (mode === 'unbound') return;

    try {
      await api.remove(item.id!);
      toast.success('Item deleted');
      onSaved?.(new Date());
    } catch {
      applyItems(prev);
      toast.error('Failed to delete item');
    }
  };

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {isLoading ? (
        <div className="p-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Progress bar — unchanged behaviour, shown whenever there are items */}
          {total > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 shrink-0 text-right">{pct}%</span>
            </div>
          )}

          {/* Column headers */}
          {total > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              {/* Spacer matching the row checkbox, so "Name" lines up with item names */}
              <span className="w-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0 text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-500">
                Item
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-500 text-right">
                Assignee
              </span>
            </div>
          )}

          {items.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                idx < items.length - 1 && 'border-b border-gray-100 dark:border-gray-800',
              )}
            >
              {/* Checkbox */}
              <button
                type="button"
                disabled={mode === 'unbound'}
                className={cn(
                  "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  mode === 'unbound'
                    ? "border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed"
                    : "border-gray-400 dark:border-gray-500 hover:border-primary"
                )}
                style={{
                  backgroundColor: item.isChecked ? 'var(--primary)' : 'transparent',
                  borderColor: item.isChecked && mode !== 'unbound' ? 'var(--primary)' : undefined,
                }}
                onClick={() => handleToggle(item)}
              >
                {item.isChecked && <Check className="w-2.5 h-2.5 text-white" />}
              </button>

              {/* Name / rename input */}
              {editingId === item.id ? (
                <input
                  autoFocus
                  className="flex-1 min-w-0 text-xs bg-transparent border-b border-primary outline-none py-0.5"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename(item);
                    else if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => void commitRename(item)}
                />
              ) : (
                <span
                  className={cn(
                    'flex-1 min-w-0 text-xs select-none truncate',
                    item.isChecked
                      ? 'line-through text-muted-foreground'
                      : 'text-gray-800 dark:text-gray-200',
                  )}
                  title={item.name}
                  onDoubleClick={() => {
                    setEditingId(item.id!);
                    setEditingName(item.name);
                  }}
                >
                  {item.name}
                </span>
              )}

              {/* Row actions — revealed on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  type="button"
                  title="Edit"
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => {
                    setEditingId(item.id!);
                    setEditingName(item.name);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  className="p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 text-gray-400"
                  onClick={() => void handleDelete(item)}
                >
                  <Trash className="w-3 h-3" />
                </button>
              </div>

              {/* Assignee */}
              <ChecklistAssigneePicker
                value={item.assigneeId}
                valueName={item.assigneeName}
                valueProfilePic={item.assigneeProfilePicUrl}
                resources={resources}
                memberIds={memberIds}
                isLoading={isResourcesLoading}
                onSelect={(assigneeId) => void handleAssign(item, assigneeId)}
              />
            </div>
          ))}

          {/* Add new item */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2',
              total > 0 && 'border-t border-gray-100 dark:border-gray-800',
            )}
          >
            {isAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 flex-shrink-0" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <input
              type="text"
              placeholder="Add checklist item and press Enter"
              className="flex-1 min-w-0 text-xs bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
              value={newName}
              disabled={isAdding}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd();
                else if (e.key === 'Escape') setNewName('');
              }}
            />
            {(newName.trim() || isAdding) && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Save — same action as pressing Enter */}
                <button
                  type="button"
                  title="Save (Enter)"
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  disabled={isAdding || !newName.trim()}
                  onClick={() => void handleAdd()}
                >
                  {isAdding
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    : <Save className="w-3.5 h-3.5 text-primary" />}
                </button>
                {/* Cancel — same action as pressing Escape */}
                <button
                  type="button"
                  title="Cancel (Escape)"
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  disabled={isAdding}
                  onClick={() => setNewName('')}
                >
                  <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ChecklistSection;
