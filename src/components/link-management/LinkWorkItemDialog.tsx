'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Loader2, X, Folder, Ticket as TicketIcon, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Command, CommandInput } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { getHierarchyLevelIcon } from '@/enums/space-configure-icon.enum';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import { useAuth } from '@/contexts/auth.context';
import { searchTasks } from '@/services/task-management/task.service';
import { searchTaskSpaces } from '@/services/task-management/task-space.service';
import { searchTickets } from '@/services/ticket-management/ticket.service';
import { searchTicketSpaces } from '@/services/ticket-management/ticket-space.service';
import {
  createWorkItemLink,
  type WorkItemType,
} from '@/services/common/work-item-link.service';
import type { LinkType } from '@/services/common/link-type.service';

interface LinkWorkItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentType: WorkItemType;
  currentId: number;
  linkTypes: LinkType[];
  /** ids already linked to the current item, keyed by type, to hide from search */
  linkedKeys: Set<string>;
  onLinked: () => void;
}

const ALL_SPACES = 'all';

/** A single row in the task hierarchy browser — no left-indent on children,
 *  per design: only the expand/collapse chevron communicates depth, and the
 *  chevron itself only renders when the task actually has sub-tasks. */
function TaskTreeRow({
  task,
  childrenByParent,
  expandedIds,
  onToggle,
  onSelect,
  isExcluded,
  renderIcon,
}: {
  task: any;
  childrenByParent: Record<number, any[]>;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelect: (task: any) => void;
  isExcluded: (id: number) => boolean;
  renderIcon: (t: any) => React.ReactNode;
}) {
  const children = childrenByParent[task.id] ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = hasChildren && expandedIds.has(task.id);
  const excluded = isExcluded(task.id);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 text-sm rounded-md',
          excluded
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
        )}
        onClick={() => {
          if (!excluded) onSelect(task);
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-[18px] h-[18px] flex-shrink-0" />
        )}
        {renderIcon(task)}
        <span className="font-semibold flex-shrink-0 text-blue-500">{task.code}</span>
        <span
          className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300"
          title={`${task.code} — ${task.name}`}
        >
          {task.name}
        </span>
      </div>
      {isExpanded && (
        <div>
          {children.map((child) => (
            <TaskTreeRow
              key={child.id}
              task={child}
              childrenByParent={childrenByParent}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              isExcluded={isExcluded}
              renderIcon={renderIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LinkWorkItemDialog({
  open,
  onOpenChange,
  currentType,
  currentId,
  linkTypes,
  linkedKeys,
  onLinked,
}: LinkWorkItemDialogProps) {
  const { user } = useAuth();
  const canViewAllTaskSpaces = usePrivilegeGuard('106') as boolean;
  const canViewAllTicketSpaces = usePrivilegeGuard('105') as boolean;
  const [targetType, setTargetType] = useState<WorkItemType>(currentType);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(ALL_SPACES);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [linkTypeId, setLinkTypeId] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse-by-space state: Task mode loads the full task list for the space
  // once and builds the tree client-side (so we know upfront which rows have
  // children, and only those get an expand chevron). Ticket mode is flat.
  const [browseItems, setBrowseItems] = useState<any[]>([]);
  const [isLoadingBrowseItems, setIsLoadingBrowseItems] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const childrenByParent = useMemo(() => {
    const map: Record<number, any[]> = {};
    browseItems.forEach((t) => {
      if (t.parentTaskId) {
        (map[t.parentTaskId] ??= []).push(t);
      }
    });
    return map;
  }, [browseItems]);

  const rootTasks = useMemo(
    () => browseItems.filter((t) => !t.parentTaskId),
    [browseItems],
  );

  const isExcluded = (type: WorkItemType, id: number) =>
    (type === currentType && id === currentId) || linkedKeys.has(`${type}:${id}`);

  // Reset everything when the dialog opens/closes
  useEffect(() => {
    if (open) {
      setTargetType(currentType);
      setSearch('');
      setResults([]);
      setSelected(null);
      setNote('');
      setSelectedSpaceId(ALL_SPACES);
      setLinkTypeId('');
      setBrowseItems([]);
      setExpandedIds(new Set());
    }
  }, [open, currentType]);

  // Load the space list whenever the dialog is open and the target type changes
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const searchFn = targetType === 'Task' ? searchTaskSpaces : searchTicketSpaces;
        const canViewAllSpaces = targetType === 'Task' ? canViewAllTaskSpaces : canViewAllTicketSpaces;
        const filters: any[] = [];
        if (!canViewAllSpaces && user?.id) {
          filters.push({ field: 'userId', value: user.id, matchMode: 'member' });
        }
        const res = await searchFn({
          first: 0,
          rows: 200,
          filters,
          multiSorts: [{ field: 'name', order: 1 }],
        });
        if (!cancelled) setSpaces(res?.data ?? []);
      } catch {
        if (!cancelled) setSpaces([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetType, canViewAllTaskSpaces, canViewAllTicketSpaces, user?.id]);

  // Re-run search when target type or space filter changes
  useEffect(() => {
    setResults([]);
    setSelected(null);
    if (search.trim()) runSearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, selectedSpaceId]);

  // Browse-by-space: load the full item list whenever a specific space is
  // chosen. Task mode fetches the whole space's tasks in one shot (so the
  // tree — root + all descendants — can be derived client-side and we know
  // upfront which rows have children); ticket mode is a flat list.
  useEffect(() => {
    setExpandedIds(new Set());

    if (!open || selectedSpaceId === ALL_SPACES) {
      setBrowseItems([]);
      return;
    }

    let cancelled = false;
    setIsLoadingBrowseItems(true);
    (async () => {
      try {
        if (targetType === 'Task') {
          const res = await searchTasks({
            filters: [{ field: 'taskSpaceId', value: Number(selectedSpaceId), matchMode: 'equals' }],
            first: 0,
            rows: 500,
            multiSorts: [{ field: 'createdAt', order: -1 }],
          });
          if (!cancelled) setBrowseItems(res?.data ?? []);
        } else {
          const res = await searchTickets({
            filters: [{ field: 'ticketSpaceId', value: Number(selectedSpaceId), matchMode: 'equals' }],
            first: 0,
            rows: 200,
            multiSorts: [{ field: 'createdAt', order: -1 }],
          });
          if (!cancelled) setBrowseItems(res?.data ?? []);
        }
      } catch {
        if (!cancelled) setBrowseItems([]);
      } finally {
        if (!cancelled) setIsLoadingBrowseItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetType, selectedSpaceId]);

  const toggleExpand = (taskId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const runSearch = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const searchFn = targetType === 'Task' ? searchTasks : searchTickets;
        const spaceField = targetType === 'Task' ? 'taskSpaceId' : 'ticketSpaceId';
        const canViewAllSpaces = targetType === 'Task' ? canViewAllTaskSpaces : canViewAllTicketSpaces;
        const spaceFilter =
          selectedSpaceId !== ALL_SPACES
            ? [{ field: spaceField, value: Number(selectedSpaceId), matchMode: 'equals' }]
            : !canViewAllSpaces
              ? [{ field: spaceField, value: spaces.map((s) => s.id), matchMode: 'in' }]
              : [];
        const [nameRes, codeRes] = await Promise.all([
          searchFn({
            filters: [...spaceFilter, { field: 'name', value: q, matchMode: 'contains' }],
            first: 0,
            rows: 8,
            multiSorts: [{ field: 'updatedAt', order: -1 }],
          }),
          searchFn({
            filters: [...spaceFilter, { field: 'code', value: q, matchMode: 'startsWith' }],
            first: 0,
            rows: 8,
            multiSorts: [{ field: 'updatedAt', order: -1 }],
          }),
        ]);
        const nameData: any[] = nameRes?.data ?? [];
        const codeData: any[] = codeRes?.data ?? [];
        const seen = new Set<number>();
        const merged: any[] = [];
        for (const t of [...codeData, ...nameData]) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            merged.push(t);
          }
        }
        // Exclude current item and already-linked items
        setResults(merged.filter((t) => !isExcluded(targetType, t.id)));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSave = async () => {
    if (!selected) {
      toast.error('Please select a work item to link');
      return;
    }
    if (!linkTypeId) {
      toast.error('Please choose a link type');
      return;
    }
    setIsSaving(true);
    try {
      await createWorkItemLink({
        sourceType: currentType,
        sourceId: currentId,
        targetType,
        targetId: selected.id,
        linkTypeId: Number(linkTypeId),
        note: note.trim() || undefined,
      });
      toast.success('Work item linked');
      onLinked();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to link work item');
    } finally {
      setIsSaving(false);
    }
  };

  const renderRowIcon = (t: any) => {
    if (targetType === 'Ticket') {
      return <TicketIcon className="w-3.5 h-3.5 flex-shrink-0 text-purple-500" />;
    }
    const Icon = t.hierarchyLevelIcon ? getHierarchyLevelIcon(t.hierarchyLevelIcon) : Folder;
    const color = t.hierarchyLevelColor || '#6B7280';
    return <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />;
  };

  // A dropdown panel is shown whenever there's something to show it for:
  // active search text, or a specific space chosen to browse.
  const showPanel = search.trim().length > 0 || selectedSpaceId !== ALL_SPACES;
  const isSearchMode = search.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[600px] lg:max-w-[680px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Link Task or Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 min-w-0">
          {/* Step 1: choose target type */}
          <div className="space-y-1.5">
            <div className="flex w-fit gap-1 rounded-lg border p-0.5 bg-white dark:bg-gray-800 shrink-0">
              {(['Task', 'Ticket'] as WorkItemType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={targetType === t ? 'default' : 'ghost'}
                  className="h-6 text-xs px-2.5"
                  onClick={() => {
                    setTargetType(t);
                    setSelectedSpaceId(ALL_SPACES);
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: filter by space + search / browse & select target */}
          <div className="space-y-1.5">
            {selected ? (
              <div className="flex items-center gap-2 min-w-0 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
                {renderRowIcon(selected)}
                <span className="font-semibold text-blue-500 flex-shrink-0">{selected.code}</span>
                <span
                  className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300"
                  title={`${selected.code} — ${selected.name}`}
                >
                  {selected.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                  <SelectTrigger className="h-9 text-sm w-[130px] flex-shrink-0">
                    <SelectValue placeholder="Space" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SPACES}>All spaces</SelectItem>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-0">
                  <Command
                    shouldFilter={false}
                    className="relative overflow-visible h-9 w-full rounded-md border border-input bg-transparent shadow-xs [&_[cmdk-input-wrapper]]:h-full [&_[cmdk-input-wrapper]]:border-b-0 [&_[cmdk-input-wrapper]]:px-3 [&_input]:h-full [&_input]:py-0"
                  >
                    <CommandInput
                      autoFocus
                      placeholder={`Search ${targetType.toLowerCase()}s by name or code`}
                      value={search}
                      onValueChange={(v) => {
                        setSearch(v);
                        runSearch(v);
                      }}
                    />
                  </Command>

                  {/* Single floating panel — search results OR the browse list,
                      whichever applies. Same container for both, per design. */}
                  {showPanel && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-58 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-popover shadow-lg z-50 p-1">
                      {isSearchMode ? (
                        isSearching ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : results.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-center text-muted-foreground">
                            No {targetType.toLowerCase()}s found
                          </p>
                        ) : (
                          results.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-1 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={() => {
                                setSelected(t);
                                setSearch('');
                                setResults([]);
                              }}
                            >
                              {renderRowIcon(t)}
                              <span className="font-semibold flex-shrink-0 text-blue-500">{t.code}</span>
                              <span
                                className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300"
                                title={`${t.code} — ${t.name}`}
                              >
                                {t.name}
                              </span>
                            </div>
                          ))
                        )
                      ) : isLoadingBrowseItems ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : targetType === 'Task' ? (
                        rootTasks.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-center text-muted-foreground">
                            No tasks in this space
                          </p>
                        ) : (
                          rootTasks.map((task) => (
                            <TaskTreeRow
                              key={task.id}
                              task={task}
                              childrenByParent={childrenByParent}
                              expandedIds={expandedIds}
                              onToggle={toggleExpand}
                              onSelect={setSelected}
                              isExcluded={(id) => isExcluded('Task', id)}
                              renderIcon={renderRowIcon}
                            />
                          ))
                        )
                      ) : browseItems.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-center text-muted-foreground">
                          No tickets in this space
                        </p>
                      ) : (
                        browseItems.map((t) => {
                          const excluded = isExcluded('Ticket', t.id);
                          return (
                            <div
                              key={t.id}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1.5 text-sm rounded-md',
                                excluded
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
                              )}
                              onClick={() => {
                                if (!excluded) setSelected(t);
                              }}
                            >
                              {renderRowIcon(t)}
                              <span className="font-semibold flex-shrink-0 text-blue-500">{t.code}</span>
                              <span
                                className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300"
                                title={`${t.code} — ${t.name}`}
                              >
                                {t.name}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: link type (required) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Link type <span className="text-red-500">*</span>
            </label>
            <Select value={linkTypeId} onValueChange={setLinkTypeId}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-64 min-w-0">
                <SelectValue className="truncate" placeholder="Select a link type" />
              </SelectTrigger>
              <SelectContent>
                {linkTypes.map((lt) => (
                  <SelectItem key={lt.id} value={String(lt.id)}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 4: note (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note or reason (optional)"
              className="text-sm min-h-[60px] w-full max-w-full break-words [field-sizing:fixed]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !selected || !linkTypeId}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
            {targetType === 'Task'
              ? `Link ${selected?.hierarchyLevelName || 'Task'}`
              : 'Link Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
