'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBreadcrumb } from '@/contexts/breadcrumb.context';
import { usePrivilegeGuard } from '@/hooks/use-privilege-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertCircle, Clock, Target, Plus, Trash, GripVertical, ArrowLeft, Pencil,
  Circle, Loader2, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package, X, Flag, Bug, Users, Bell,
  FolderClosed, Save,
} from 'lucide-react';
import {
  TICKET_TYPE_ICONS,
  DEFAULT_TICKET_TYPE_ICON,
  getTicketTypeIcon,
} from '@/enums/space-configure-icon.enum';
import {
  STATUS_COLORS,
  DEFAULT_STATUS_COLOR,
  SEVERITY_COLORS,
  DEFAULT_SEVERITY_COLOR,
} from '@/enums/space-configure-color.enum';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { toast } from 'sonner';
import DeleteModal from '@/components/DeleteModal';
import { TaskSpaceResourceDropdown } from '@/components/common/TaskSpaceResourceDropdown';
import { PaginationControls } from '@/components/common/PaginationControls';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addStatusToTicketSpace,
  removeStatusFromTicketSpace,
  updateStatusSequence,
  addSeverityToTicketSpace,
  removeSeverityFromTicketSpace,
  addTypeToTicketSpace,
  removeTypeFromTicketSpace,
  updateTicketSpaceStatus,
  updateTicketSpaceSeverity,
} from '@/services/ticket-management/ticket-space.service';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertsTabContent } from '@/components/common/AlertsTabContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


// Sortable Status
function SortableStatusItem({ status, onDelete, canEdit, onUpdate }: { status: any; index?: number; onDelete: () => void; canEdit?: boolean; onUpdate?: (id: number, data: { name?: string; color?: string }) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const inUseCount = status.taskCount || status.ticketCount || 0;
  const isItemEditable = canEdit && inUseCount === 0;

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setEditName(status.name);
  }, [status.name]);

  const handleNameSave = async () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== status.name && onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(status.id, { name: editName.trim() });
      } finally {
        setIsUpdating(false);
      }
    } else {
      setEditName(status.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(status.name);
    }
  };


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''} ${isUpdating ? 'opacity-50 pointer-events-none animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Drag Handle */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}

        {/* Color Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0">
                {isItemEditable && onUpdate ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="w-4 h-4 rounded-full flex-shrink-0 border shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: status.color }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Choose color</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded-full transition-all ${status.color === color
                                ? 'opacity-100 ring-2 ring-offset-2 ring-gray-400 scale-110'
                                : 'opacity-60 hover:opacity-100 hover:scale-110'
                                }`}
                              style={{ backgroundColor: color }}
                              title={color}
                              onClick={async () => {
                                if (status.color !== color && onUpdate) {
                                  setIsUpdating(true);
                                  try {
                                    await onUpdate(status.id, { color });
                                  } finally {
                                    setIsUpdating(false);
                                  }
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: status.color }}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isItemEditable ? "Click to change color" : "Cannot edit because already in use"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Status Name and Badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex-1 flex items-center gap-2 min-w-0 ${isItemEditable ? 'cursor-text rounded hover:bg-slate-50 dark:hover:bg-slate-900/50' : ''}`}
                onClick={() => {
                  if (isItemEditable) setIsEditing(true);
                }}
              >
                {isEditing && isItemEditable ? (
                  <input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="text-sm font-medium flex-1 bg-transparent outline-none border-b border-primary/50 focus:border-primary px-1 -mx-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={`text-sm font-medium shrink min-w-0 truncate ${isItemEditable ? 'px-1 -mx-1' : ''}`}>
                    {status.name}
                  </span>
                )}

                {/* Base Badge */}
                {status.base && (() => {
                  const baseIconMap: Record<string, React.ElementType> = { 'To Start': Circle, 'Processing': Loader2, 'Finished': CheckCircle2 };
                  const baseConfig: Record<string, { iconBg: string; iconColor: string; title: string; description: string; examples: string[] }> = {
                    'To Start': { iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-500 dark:text-slate-400', title: 'Initial State', description: "Assign this base to statuses where work hasn't started yet. The ticket exists but no action has been taken.", examples: ['Backlog', 'Open', 'To Do', 'Awaiting Start'] },
                    'Processing': { iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-500 dark:text-blue-400', title: 'Active Progress', description: 'Assign this base to statuses where work is actively underway. The ticket is being acted on right now.', examples: ['In Progress', 'In Review', 'Testing', 'Pending Approval'] },
                    'Finished': { iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', title: 'Completed State', description: 'Assign this base to statuses that mark the end of the workflow whether completed, closed, or cancelled.', examples: ['Done', 'Closed', 'Cancelled', 'Resolved'] },
                  };
                  const IconComp = baseIconMap[status.base as string];
                  const cfg = baseConfig[status.base as string];
                  if (!IconComp || !cfg) return null;
                  return (
                    <div onClick={(e) => e.stopPropagation()}>
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <Badge variant="outline" className="gap-1.5 cursor-default text-foreground font-normal flex-shrink-0">
                            {status.base}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72 p-3" side="top" align="start">
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
                              <IconComp className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{cfg.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{cfg.description}</p>
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {cfg.examples.map(ex => (
                                  <span key={ex} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  );
                })()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isItemEditable ? "Click to edit name" : "Cannot edit because already in use"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        {/* Delete Button */}
        {canEdit && !status.isPrimaryBase && (
          <div className="flex-shrink-0">
            <TooltipProvider delayDuration={0}>
              {inUseCount > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                        disabled
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Cannot delete because already in use</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={onDelete}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete Status</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}


// Severity Item Component (no drag functionality)
function SeverityItem({ severity, onDelete, canEdit, onUpdate }: { severity: any; onDelete: () => void; canEdit?: boolean; onUpdate?: (id: number, data: { name?: string; color?: string }) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(severity.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const inUseCount = severity.taskCount || severity.ticketCount || 0;
  const isItemEditable = canEdit && inUseCount === 0;
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setEditName(severity.name);
  }, [severity.name]);

  const handleNameSave = async () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== severity.name && onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(severity.id, { name: editName.trim() });
      } finally {
        setIsUpdating(false);
      }
    } else {
      setEditName(severity.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(severity.name);
    }
  };

  return (
    <div className={`flex items-center justify-between px-4 py-2 gap-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors ${isUpdating ? 'opacity-50 pointer-events-none animate-pulse' : ''}`}>
      {/* Color Flag */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0">
              {isItemEditable && onUpdate ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="flex-shrink-0 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-110 cursor-pointer"
                    >
                      <Flag className="w-5 h-5 drop-shadow-sm" fill={severity.color} color={severity.color} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Choose color</p>
                      <div className="flex flex-wrap gap-2">
                        {SEVERITY_COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-6 h-6 rounded-full transition-all ${severity.color === color
                              ? 'opacity-100 ring-2 ring-offset-2 ring-gray-400 scale-110'
                              : 'opacity-60 hover:opacity-100 hover:scale-110'
                              }`}
                            style={{ backgroundColor: color }}
                            title={color}
                            onClick={async () => {
                              if (severity.color !== color && onUpdate) {
                                setIsUpdating(true);
                                try {
                                  await onUpdate(severity.id, { color });
                                } finally {
                                  setIsUpdating(false);
                                }
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex-shrink-0">
                  <Flag className="w-5 h-5 drop-shadow-sm" fill={severity.color} color={severity.color} />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isItemEditable ? "Click to change color" : "Cannot edit because already in use"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Severity Name */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex-1 min-w-0 ${isItemEditable && onUpdate ? 'cursor-text rounded hover:bg-slate-50 dark:hover:bg-slate-900/50' : 'cursor-default'}`}
              onClick={() => {
                if (isItemEditable && onUpdate) setIsEditing(true);
              }}
            >
              {isEditing && isItemEditable && onUpdate ? (
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm font-medium bg-transparent outline-none border-b border-primary/50 focus:border-primary px-0 py-0.5 min-w-0"
                />
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 py-0.5">
                  <span className="text-sm font-medium truncate">
                    {severity.name}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isItemEditable ? "Click to edit name" : "Cannot edit because already in use"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Delete Button */}
      {canEdit && onDelete && (
        <div className="flex-shrink-0">
          <TooltipProvider delayDuration={0}>
            {inUseCount > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                      disabled
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Cannot delete because already in use</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete Severity</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

// Type Item Component (no drag functionality)
function TypeItem({ type, onDelete, canEdit, onUpdate }: { type: any; onDelete: () => void; canEdit?: boolean; onUpdate?: (id: number, data: { name?: string; icon?: string }) => void }) {
  const IconComponent = getTicketTypeIcon(type.icon);
  const inUseCount = type.ticketCount || 0;
  const isItemEditable = canEdit && inUseCount === 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(type.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setEditName(type.name);
  }, [type.name]);

  const handleNameSave = async () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== type.name && onUpdate) {
      setIsUpdating(true);
      try {
        await onUpdate(type.id, { name: editName.trim() });
      } finally {
        setIsUpdating(false);
      }
    } else {
      setEditName(type.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(type.name);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors ${isUpdating ? 'opacity-50 pointer-events-none animate-pulse' : ''}`}>
      {/* Icon */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0">
              {isItemEditable && onUpdate ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center justify-center p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Choose icon</p>
                      <div className="flex flex-wrap gap-2">
                        {TICKET_TYPE_ICONS.map(({ name, component: Icon }) => (
                          <button
                            key={name}
                            className={`w-8 h-8 rounded-md border-2 flex items-center justify-center transition-colors ${type.icon === name
                              ? 'border-primary bg-primary/10'
                              : 'border-transparent hover:border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            title={name}
                            onClick={async () => {
                              if (type.icon !== name && onUpdate) {
                                setIsUpdating(true);
                                try {
                                  await onUpdate(type.id, { icon: name });
                                } finally {
                                  setIsUpdating(false);
                                }
                              }
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center justify-center p-1">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isItemEditable ? "Click to change icon" : "Cannot edit because already in use"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Type Name */}
      {isEditing && isItemEditable && onUpdate ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="text-sm font-medium flex-1 bg-transparent outline-none border-b border-primary/50 focus:border-primary px-1 -mx-1"
        />
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`text-sm font-medium flex-1 ${isItemEditable && onUpdate ? 'cursor-text hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 -mx-1' : ''}`}
                onClick={() => {
                  if (isItemEditable && onUpdate) setIsEditing(true);
                }}
              >
                {type.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isItemEditable ? "Click to edit name" : "Cannot edit because already in use"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Delete Button */}
      {canEdit && (
        <div className="flex-shrink-0">
          <TooltipProvider delayDuration={0}>
            {!isItemEditable ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                      disabled
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Cannot delete because already in use</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete Type</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}


function StatusTabContent({
  ticketSpaceId,
  statusData,
  isLoading,
  onRefresh,
  onUpdateLocal,
}: {
  ticketSpaceId: string;
  statusData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateLocal?: (updater: (prev: any) => any) => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;
  const [statuses, setStatuses] = useState<any[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_STATUS_COLOR);
  const [selectedBase, setSelectedBase] = useState<string>('To Start');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingStatus, setDeletingStatus] = useState<{ id: number; name: string } | null>(null);


  const colors = STATUS_COLORS;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (statusData?.statuses) {
      // We do NOT sort here. The backend returns statuses ordered by 'sequence'.
      // If we sort them here, it will override the user's custom drag-and-drop sequence!
      setStatuses([...statusData.statuses]);
    }
  }, [statusData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);

      const newStatuses = arrayMove(statuses, oldIndex, newIndex);
      setStatuses(newStatuses);

      // Update sequence in backend
      try {
        const statusSequences = newStatuses.map((status, index) => ({
          statusId: status.id,
          sequence: index,
        }));
        await updateStatusSequence(Number(ticketSpaceId), statusSequences);
        toast.success('Status order updated');
      } catch {
        toast.error('Failed to update status order');
        // Revert on error
        onRefresh();
      }
    }
  };

  const handleAddStatus = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!newStatusName.trim()) {
      toast.error('Please enter a status name');
      return;
    }

    if (!selectedBase) {
      toast.error('Please select a base for the status');
      return;
    }

    setIsAdding(true);
    try {
      await addStatusToTicketSpace(Number(ticketSpaceId), newStatusName.trim(), selectedColor, selectedBase || null);
      toast.success('Status added');
      setNewStatusName('');
      setSelectedColor(DEFAULT_STATUS_COLOR);
      setSelectedBase('To Start');
      onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add status';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStatus = (statusId: number, statusName: string) => {
    setDeletingStatus({ id: statusId, name: statusName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingStatus) return;

    try {
      await removeStatusFromTicketSpace(Number(ticketSpaceId), deletingStatus.id);
      toast.success('Status removed');
      onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove status';
      toast.error(errorMessage);
      throw error; // Re-throw to let DeleteModal handle the error state
    } finally {
      setDeletingStatus(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddStatus();
    }
  };

  const handleUpdateStatus = async (statusId: number, data: { name?: string; color?: string }) => {
    try {
      const response = await updateTicketSpaceStatus(Number(ticketSpaceId), statusId, data);
      toast.success('Status updated');
      if (onUpdateLocal && response) {
        onUpdateLocal((prev: any) => {
          if (!prev || !prev.statuses) return prev;
          return {
            ...prev,
            statuses: prev.statuses.map((s: any) => s.id === statusId ? { ...s, ...data } : s),
          };
        });
      } else {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="flex items-center gap-2 text-lg font-medium">
          Status
        </h3>
        <p className="text-sm text-muted-foreground">
          Define the lifecycle statuses a ticket moves through. Drag to reorder, click name or color to edit.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status List with Drag and Drop */}
            {statuses.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={statuses.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {statuses.map((status: any) => (
                      <SortableStatusItem
                        key={status.id}
                        status={status}
                        canEdit={canEdit}
                        onDelete={() => handleDeleteStatus(status.id, status.name)}
                        onUpdate={handleUpdateStatus}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No statuses configured</p>
              </div>
            )}

            {canEdit && (
              <div className="space-y-1 py-4">
                <span className="text-sm font-semibold px-1">Add New Status</span>

                <div className="flex flex-col gap-4 pt-2">
                  {/* Row 1: input + actions */}
                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. In Testing"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isAdding}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button size="sm" onClick={() => handleAddStatus()} disabled={isAdding || !newStatusName.trim() || !selectedBase} className="flex-shrink-0">
                        <Plus className="h-4 w-4 mr-1" />{isAdding ? "Adding..." : "Add"}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  {/* Row 2: Bases and Colors */}
                  <div className="flex flex-col lg:flex-row items-start gap-5 px-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {(['To Start', 'Processing', 'Finished'] as const).map((val) => {
                          const baseConfig: Record<string, { icon: React.ElementType; iconBg: string; iconColor: string; title: string; description: string; examples: string[] }> = {
                            'To Start': { icon: Circle, iconBg: '', iconColor: 'text-slate-500 dark:text-slate-400', title: 'Initial State', description: "Assign this base to statuses where work hasn't started yet. The ticket exists but no action has been taken.", examples: ['Backlog', 'Open', 'To Do', 'Awaiting Start'] },
                            'Processing': { icon: Loader2, iconBg: '', iconColor: 'text-blue-500 dark:text-blue-400', title: 'Active Progress', description: 'Assign this base to statuses where work is actively underway. The ticket is being acted on right now', examples: ['In Progress', 'In Review', 'Testing', 'Pending Approval'] },
                            'Finished': { icon: CheckCircle2, iconBg: '', iconColor: 'text-emerald-600 dark:text-emerald-400', title: 'Completed State', description: 'Assign this base to statuses that mark the end of the workflow whether completed, closed, or cancelled.', examples: ['Done', 'Closed', 'Cancelled', 'Resolved'] },
                          };
                          const cfg = baseConfig[val];
                          const IconComp = cfg.icon;
                          const active = selectedBase === val;
                          return (
                            <HoverCard key={val} openDelay={200}>
                              <HoverCardTrigger asChild>
                                <button type="button" onClick={() => setSelectedBase(active ? '' : val)} disabled={isAdding}
                                  className={`transition-all ${active ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                                  <Badge variant="outline" className={`gap-1.5 cursor-pointer text-foreground font-normal ${active ? 'ring-2 ring-offset-1 ring-primary' : ''}`}>
                                    {val}
                                  </Badge>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-72 p-3" side="bottom" align="start">
                                <div className="flex items-start gap-2.5">
                                  {/* <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.iconBg}`}>
                                    <IconComp className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                                  </div> */}
                                  <div className="space-y-1.5 min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{cfg.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{cfg.description}</p>
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {cfg.examples.map((ex) => (
                                        <span key={ex} className="text-xs border text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-md">{ex}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5 w-max">
                        {colors.map((color) => (
                          <button key={color}
                            className={`w-7 h-7 rounded-full transition-all flex items-center opacity-80 justify-center ${selectedColor === color ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                            style={{ backgroundColor: color }} title={color} onClick={() => setSelectedColor(color)} disabled={isAdding} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingStatus(null);
        }}
        onDelete={confirmDelete}
        title="Remove Status"
        description={`Are you sure you want to remove "${deletingStatus?.name}" from this ticket space? This action cannot be undone.`}
        buttonText="Remove"
        hideActionButtonOnError={true}
      />
    </div>
  );
}

// Severity Tab Content Component
function SeverityTabContent({
  ticketSpaceId,
  severityData,
  isLoading,
  onRefresh,
  onUpdateLocal,
}: {
  ticketSpaceId: string;
  severityData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateLocal?: (updater: (prev: any) => any) => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;
  const [severities, setSeverities] = useState<any[]>([]);
  const [newSeverityName, setNewSeverityName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_SEVERITY_COLOR);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSeverity, setDeletingSeverity] = useState<{ id: number; name: string } | null>(null);

  const colors = SEVERITY_COLORS;

  useEffect(() => {
    if (severityData?.severities) {
      setSeverities(severityData.severities);
    }
  }, [severityData]);

  const handleAddSeverity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!newSeverityName.trim()) {
      toast.error('Please enter a severity name');
      return;
    }

    setIsAdding(true);
    try {
      await addSeverityToTicketSpace(Number(ticketSpaceId), newSeverityName.trim(), selectedColor);
      toast.success('Severity added');
      setNewSeverityName('');
      setSelectedColor(DEFAULT_SEVERITY_COLOR);
      onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add severity';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSeverity = (severityId: number, severityName: string) => {
    setDeletingSeverity({ id: severityId, name: severityName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingSeverity) return;

    try {
      await removeSeverityFromTicketSpace(Number(ticketSpaceId), deletingSeverity.id);
      toast.success('Severity removed');
      onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove severity';
      toast.error(errorMessage);
      throw error;
    } finally {
      setDeletingSeverity(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddSeverity();
    }
  };

  const handleUpdateSeverity = async (severityId: number, data: { name?: string; color?: string }) => {
    try {
      const response = await updateTicketSpaceSeverity(Number(ticketSpaceId), severityId, data);
      toast.success('Severity updated');
      if (onUpdateLocal && response) {
        onUpdateLocal((prev: any) => {
          if (!prev || !prev.severities) return prev;
          return {
            ...prev,
            severities: prev.severities.map((s: any) => s.id === severityId ? { ...s, ...data } : s),
          };
        });
      } else {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update severity');
    }
  };

  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="flex items-center gap-2 text-lg font-medium">
          Severity
        </h3>
        <p className="text-sm text-muted-foreground">
          Define severity levels for triaging tickets. Click name or color to edit.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Severity List (no drag and drop) */}
            {severities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {severities.map((severity: any) => (
                  <SeverityItem
                    key={severity.id}
                    severity={severity}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteSeverity(severity.id, severity.name)}
                    onUpdate={handleUpdateSeverity}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <Flag className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No severity levels configured</p>
              </div>
            )}

            {/* Add New Severity Section */}
            {canEdit && (
              <div className="space-y-2 py-4">
                <span className="text-sm font-semibold px-1">Add New Severity</span>
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. Urgent"
                        value={newSeverityName}
                        onChange={(e) => setNewSeverityName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isAdding}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddSeverity()}
                        disabled={isAdding || !newSeverityName.trim()}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isAdding ? 'Adding' : 'Add'}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  <div className="flex flex-col gap-2 px-1">
                    <div className="flex flex-wrap gap-1.5 w-max">
                      {colors.map((color) => (
                        <button
                          key={color}
                          className={`w-7 h-7 rounded-full transition-all flex items-center opacity-80 justify-center ${selectedColor === color ? 'ring-2 ring-offset-1 ring-primary opacity-100' : ''}`}
                          style={{ backgroundColor: color }}
                          title={color}
                          onClick={() => setSelectedColor(color)}
                          disabled={isAdding}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingSeverity(null);
        }}
        onDelete={confirmDelete}
        title="Remove Severity"
        description={`Are you sure you want to remove "${deletingSeverity?.name}" from this ticket space? This action cannot be undone.`}
        buttonText="Remove"
      />
    </div>
  );
}

// Queue Tab Content Component
function QueueTabContent({
  ticketSpaceId,
  queueData,
  isLoading,
  onRefresh,
}: {
  ticketSpaceId: string;
  queueData: any;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;
  const [queues, setQueues] = useState<any[]>([]);
  const [newQueueName, setNewQueueName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingQueue, setDeletingQueue] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (queueData?.queues) {
      // Use Queue data for queues
      setQueues(queueData.queues);
    }
  }, [queueData]);

  const handleAddQueue = async () => {
    if (!newQueueName.trim()) {
      toast.error('Please enter a queue name');
      return;
    }

    setIsAdding(true);
    try {
      // Use Queue backend operations
      const { addQueueToTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await addQueueToTicketSpace(Number(ticketSpaceId), newQueueName.trim());

      toast.success('Queue added');
      setNewQueueName('');
      onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add queue';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteQueue = (queueId: number, queueName: string) => {
    if (queueName === 'Default') {
      toast.error('The Default queue cannot be deleted');
      return;
    }
    setDeletingQueue({ id: queueId, name: queueName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingQueue) return;

    try {
      // Use Queue backend operations
      const { removeQueueFromTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await removeQueueFromTicketSpace(Number(ticketSpaceId), deletingQueue.id);
      toast.success('Queue removed');
      onRefresh();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove queue';
      toast.error(errorMessage);
      throw error;
    } finally {
      setDeletingQueue(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddQueue();
    }
  };


  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="text-lg font-medium">Queues</h3>
        <p className="text-sm text-muted-foreground">
          Define queues that can be assigned to tickets.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Queue List */}
            {queues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {queues.map((queue: any) => {
                  const isDefault = queue.name === 'Default';
                  return (
                    <div
                      key={queue.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FolderClosed className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{queue.name}</span>
                        {isDefault && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 font-normal">
                            Default
                          </Badge>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex-shrink-0">
                          <TooltipProvider delayDuration={0}>
                            {isDefault ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 opacity-40 cursor-not-allowed"
                                      disabled
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">The Default queue cannot be deleted</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteQueue(queue.id, queue.name)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Delete Queue</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <FolderClosed className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No queues configured</p>
              </div>
            )}

            {/* Add Queue Form */}
            {canEdit && (
              <div className="space-y-2 py-4">
                <span className="text-sm font-semibold px-1">Add New Queue</span>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. Support"
                        value={newQueueName}
                        onChange={(e) => setNewQueueName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isAdding}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddQueue()}
                        disabled={isAdding || !newQueueName.trim()}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isAdding ? 'Adding' : 'Add'}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingQueue(null);
        }}
        onDelete={confirmDelete}
        title="Remove Queue"
        description={`Are you sure you want to remove "${deletingQueue?.name}"? This action cannot be undone.`}
        buttonText="Remove"
      />
    </div>
  );
}

function TypesTabContent({
  ticketSpaceId,
  typesData,
  isLoading,
  onRefresh,
  onUpdateLocal,
}: {
  ticketSpaceId: string;
  typesData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateLocal?: (updater: (prev: any) => any) => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;
  const [types, setTypes] = useState<any[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_TICKET_TYPE_ICON);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<{ id: number; name: string } | null>(null);

  const icons = TICKET_TYPE_ICONS;

  useEffect(() => {
    if (typesData?.types) {
      setTypes(typesData.types);
    }
  }, [typesData]);

  const handleAddType = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!newTypeName.trim()) {
      toast.error('Please enter a type name');
      return;
    }

    setIsAdding(true);
    try {
      await addTypeToTicketSpace(Number(ticketSpaceId), newTypeName.trim(), selectedIcon);
      toast.success('Type added');
      setNewTypeName('');
      setSelectedIcon(DEFAULT_TICKET_TYPE_ICON);
      onRefresh();
    } catch (error: any) {
      console.error('Error adding type:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add type';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteType = (typeId: number, typeName: string) => {
    setDeletingType({ id: typeId, name: typeName });
    setDeleteConfirmOpen(true);
  };

  const handleUpdateType = async (typeId: number, data: { name?: string; icon?: string }) => {
    try {
      const { updateTicketSpaceType } = await import('@/services/ticket-management/ticket-space.service');
      const response = await updateTicketSpaceType(Number(ticketSpaceId), typeId, data);
      toast.success('Type updated');
      if (onUpdateLocal && response) {
        onUpdateLocal((prev: any) => {
          if (!prev || !prev.types) return prev;
          return {
            ...prev,
            types: prev.types.map((t: any) => t.id === typeId ? { ...t, ...data } : t),
          };
        });
      } else {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error updating type:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update type';
      toast.error(errorMessage);
    }
  };

  const confirmDelete = async () => {
    if (!deletingType) return;

    try {
      await removeTypeFromTicketSpace(Number(ticketSpaceId), deletingType.id);
      toast.success('Type removed');
      onRefresh();
    } catch (error: any) {
      console.error('Error removing type:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove type';
      toast.error(errorMessage);
      throw error;
    } finally {
      setDeletingType(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddType();
    }
  };

  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="flex items-center gap-2 text-lg font-medium">
          Types
        </h3>
        <p className="text-sm text-muted-foreground">
          Define ticket types for categorization in this space. Click name or icon to edit.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {types.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {types.map((type: any) => (
                  <TypeItem
                    key={type.id}
                    type={type}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteType(type.id, type.name)}
                    onUpdate={handleUpdateType}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <Bug className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No ticket types configured</p>
              </div>
            )}

            {canEdit && (
              <div className="space-y-2 py-4">
                <span className="text-sm font-semibold px-1">Add New Type</span>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. Feature Request"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isAdding}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddType()}
                        disabled={isAdding || !newTypeName.trim()}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isAdding ? 'Adding' : 'Add'}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex flex-wrap gap-1.5 w-max">
                      {icons.map(({ name, component: Icon }) => (
                        <button
                          key={name}
                          className={`w-8 h-8 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIcon === name
                            ? 'border-primary text-primary'
                            : 'border-transparent hover:border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          title={name}
                          onClick={() => setSelectedIcon(name)}
                          disabled={isAdding}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingType(null);
        }}
        onDelete={confirmDelete}
        title="Remove Type"
        description={`Are you sure you want to remove "${deletingType?.name}" from this ticket space? This action cannot be undone.`}
        buttonText="Remove"
      />
    </div>
  );
}

// SLA Tab Content Component
function SlaTabContent({
  ticketSpaceId,
  slaData,
  severityData,
  isLoading,
  onRefresh,
}: {
  ticketSpaceId: string;
  slaData: any;
  severityData: any;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;
  const [slas, setSlas] = useState<any[]>([]);
  const [selectedSeverityId, setSelectedSeverityId] = useState<string>('');
  const [responseTime, setResponseTime] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSla, setDeletingSla] = useState<{ id: number; severityName: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const configuredSeverities = severityData?.severities || [];

  useEffect(() => {
    if (slaData?.slas) {
      setSlas(slaData.slas);
    }
  }, [slaData]);

  const parseTimeToMinutes = (timeStr: string): number => {
    const cleanStr = timeStr.trim().toLowerCase();

    // Extract number and unit
    const match = cleanStr.match(/^(\d+)\s*(minute|minutes|min|hour|hours|h|day|days|d)s?$/);
    if (!match) {
      // Try just a number (assume hours)
      const numOnly = parseInt(cleanStr);
      if (!isNaN(numOnly)) {
        return numOnly * 60; // Default to hours
      }
      return NaN;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    if (unit.startsWith('min')) {
      return value;
    } else if (unit.startsWith('h')) {
      return value * 60;
    } else if (unit.startsWith('d')) {
      return value * 24 * 60;
    }

    return NaN;
  };

  const handleAddSla = async () => {
    if (!selectedSeverityId) {
      toast.error('Please select a severity level');
      return;
    }
    if (!responseTime || !resolutionTime) {
      toast.error('Please enter both response time and resolution time');
      return;
    }

    const responseMinutes = parseTimeToMinutes(responseTime);
    const resolutionMinutes = parseTimeToMinutes(resolutionTime);

    if (isNaN(responseMinutes) || isNaN(resolutionMinutes) || responseMinutes <= 0 || resolutionMinutes <= 0) {
      toast.error('Please enter valid time values (e.g. "2 hours", "1 day")');
      return;
    }

    if (responseMinutes >= resolutionMinutes) {
      toast.error('Response time must be less than resolution time');
      return;
    }

    setIsAdding(true);
    try {
      // Check if SLA already exists for this severity
      const existingSla = slas.find(sla => sla.severityId === parseInt(selectedSeverityId));
      if (existingSla) {
        toast.error('SLA already configured for this severity level');
        setIsAdding(false);
        return;
      }

      // Add SLA via API
      const { addSlaToTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await addSlaToTicketSpace(Number(ticketSpaceId), parseInt(selectedSeverityId), responseMinutes, resolutionMinutes);

      toast.success('SLA added');
      setSelectedSeverityId('');
      setResponseTime('');
      setResolutionTime('');
      onRefresh();
    } catch (error: any) {
      console.error('Error adding SLA:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add SLA';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSla = (slaId: number, severityName: string) => {
    setDeletingSla({ id: slaId, severityName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingSla) return;

    try {
      const { removeSlaFromTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await removeSlaFromTicketSpace(Number(ticketSpaceId), deletingSla.id);
      toast.success('SLA removed');
      onRefresh();
    } catch (error: any) {
      console.error('Error removing SLA:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove SLA';
      toast.error(errorMessage);
      throw error;
    } finally {
      setDeletingSla(null);
    }
  };

  const getAvailableSeverities = () => {
    const usedSeverityIds = slas.map(sla => sla.severityId);
    return configuredSeverities.filter((severity: any) => !usedSeverityIds.includes(severity.id));
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const hasDeletableSlas = slas.some((sla: any) => {
    const severity = configuredSeverities.find((s: any) => s.id === sla.severityId);
    const inUseCount = severity?.ticketCount || severity?.taskCount || 0;
    return inUseCount === 0;
  });
  const showActionsColumn = canEdit && (hasDeletableSlas || getAvailableSeverities().length > 0);

  return (
    <div className="pt-2">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-medium">SLA</h3>
        <p className="text-sm text-muted-foreground">
          Set response and resolution time targets.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : configuredSeverities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No SLA configured</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* SLA Table */}
            {(slas.length > 0 || (canEdit && getAvailableSeverities().length > 0)) && (
              <div className="rounded-lg border flex flex-col h-[calc(100vh-220px)] overflow-hidden">
                <div className="flex-1 overflow-auto relative">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 border-b border-border">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">SLA</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">RESPONSE TIME</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">RESOLUTION TIME</TableHead>
                        {showActionsColumn && (
                          <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[100px]">
                            ACTIONS
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sla: any) => {
                        const severity = configuredSeverities.find((s: any) => s.id === sla.severityId);
                        const inUseCount = severity?.ticketCount || severity?.taskCount || 0;
                        const canDelete = canEdit && inUseCount === 0;

                        return (
                          <TableRow key={sla.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-border">
                            {/* SLA Level */}
                            <TableCell className="py-1.75 px-4">
                              <div className="flex items-center gap-2">
                                <Flag
                                  className="w-4 h-4 flex-shrink-0"
                                  style={{ color: severity?.color || '#gray' }}
                                  fill={severity?.color || '#gray'}
                                />
                                <span className="text-sm font-medium">{severity?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>

                            {/* Response Time */}
                            <TableCell className="text-sm py-1.75 px-4">
                              {formatTime(sla.responseTime)}
                            </TableCell>

                            {/* Resolution Time */}
                            <TableCell className="text-sm py-1.75 px-4">
                              {formatTime(sla.resolutionTime)}
                            </TableCell>

                            {/* Actions */}
                            {showActionsColumn && (
                              <TableCell className="py-1.75 px-4 text-right">
                                <div className="flex justify-end">
                                  <TooltipProvider delayDuration={0}>
                                    {canDelete ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteSla(sla.id, severity?.name || 'Unknown')}
                                          >
                                            <Trash className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Delete SLA Target</TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0 opacity-40 cursor-not-allowed"
                                              disabled
                                            >
                                              <Trash className="h-3.5 w-3.5" />
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          Cannot delete because associated severity is already in use
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}

                      {/* Add SLA Row */}
                      {canEdit && getAvailableSeverities().length > 0 && (
                        <TableRow className="">
                          <TableCell className="py-1.75 px-4">
                            <Select
                              value={selectedSeverityId}
                              onValueChange={setSelectedSeverityId}
                              disabled={isAdding}
                            >
                              <SelectTrigger className="w-full max-w-[200px] h-9 text-sm border-input shadow-none focus:ring-2 focus:ring-ring disabled:opacity-50">
                                {selectedSeverityId ? (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{
                                        backgroundColor: getAvailableSeverities().find(
                                          (s: any) => s.id === parseInt(selectedSeverityId)
                                        )?.color || '#gray',
                                      }}
                                    />
                                    <span className="truncate">
                                      {getAvailableSeverities().find(
                                        (s: any) => s.id === parseInt(selectedSeverityId)
                                      )?.name}
                                    </span>
                                  </div>
                                ) : (
                                  <SelectValue placeholder="SLA" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableSeverities().map((severity: any) => (
                                  <SelectItem key={severity.id} value={String(severity.id)}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: severity.color }}
                                      />
                                      <span>{severity.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="py-1.75 px-4">
                            <input
                              type="text"
                              placeholder="e.g. 2 hours"
                              value={responseTime}
                              onChange={(e) => setResponseTime(e.target.value)}
                              disabled={isAdding}
                              className="w-full max-w-[150px] h-9 px-3 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            />
                          </TableCell>

                          <TableCell className="py-1.75 px-4">
                            <input
                              type="text"
                              placeholder="e.g. 12 hours"
                              value={resolutionTime}
                              onChange={(e) => setResolutionTime(e.target.value)}
                              disabled={isAdding}
                              className="w-full max-w-[150px] h-9 px-3 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            />
                          </TableCell>

                          {showActionsColumn && (
                            <TableCell className="py-1.75 px-4 text-right">
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={handleAddSla}
                                  disabled={isAdding || !selectedSeverityId || !responseTime || !resolutionTime}
                                  className="h-8 gap-1.5"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {isAdding ? 'Adding' : 'Add'}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {slas.length > itemsPerPage && (
                  <div className="mt-auto border-border">
                    <PaginationControls
                      currentPage={currentPage}
                      totalItems={slas.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      itemName="SLAs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Empty State for All SLAs Configured */}
            {slas.length === 0 && getAvailableSeverities().length === 0 && (
              <div className="flex items-center justify-center h-32 border border-dashed rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">All configured severities have SLAs</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingSla(null);
        }}
        onDelete={confirmDelete}
        title="Remove SLA"
        description={`Are you sure you want to remove the SLA for "${deletingSla?.severityName}"? This action cannot be undone.`}
        buttonText="Remove"
      />
    </div>
  );
}

// Impact Tab Content Component
function ImpactTabContent({
  ticketSpaceId,
  impactData,
  isLoading,
  onRefresh,
}: {
  ticketSpaceId: string;
  impactData: any;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;
  const [impacts, setImpacts] = useState<any[]>([]);
  const [impactName, setImpactName] = useState('');
  const [impactDescription, setImpactDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingImpact, setDeletingImpact] = useState<{ id: number; name: string } | null>(null);

  const [editingImpact, setEditingImpact] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (impactData?.impacts) {
      setImpacts(impactData.impacts);
    }
  }, [impactData]);

  const handleAddImpact = async () => {
    if (!impactName.trim()) {
      toast.error('Please enter an impact name');
      return;
    }

    setIsAdding(true);
    try {
      const { addImpactToTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await addImpactToTicketSpace(Number(ticketSpaceId), impactName.trim(), impactDescription.trim());

      toast.success('Impact added');
      setImpactName('');
      setImpactDescription('');
      onRefresh();
    } catch (error: any) {
      console.error('Error adding impact:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add impact';
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteImpact = (impactId: number, impactName: string) => {
    setDeletingImpact({ id: impactId, name: impactName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingImpact) return;

    try {
      const { removeImpactFromTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await removeImpactFromTicketSpace(Number(ticketSpaceId), deletingImpact.id);
      toast.success('Impact removed');
      onRefresh();
    } catch (error: any) {
      console.error('Error removing impact:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove impact';
      toast.error(errorMessage);
      throw error;
    } finally {
      setDeletingImpact(null);
    }
  };

  const startEditing = (impact: any) => {
    setEditingImpact(impact.id);
    setEditName(impact.name);
    setEditDescription(impact.description || '');
  };

  const handleUpdateImpact = async () => {
    if (!editingImpact) return;
    if (!editName.trim()) {
      toast.error('Please enter an impact name');
      return;
    }

    setIsUpdating(true);
    try {
      const { updateImpactInTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
      await updateImpactInTicketSpace(Number(ticketSpaceId), editingImpact, editName.trim(), editDescription.trim());
      toast.success('Impact updated');
      setEditingImpact(null);
      onRefresh();
    } catch (error: any) {
      console.error('Error updating impact:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update impact';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="text-lg font-medium">Impact</h3>
        <p className="text-sm text-muted-foreground">
          Classify the scope of ticket effects on the organization.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Impact List */}
            {impacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {impacts.map((impact: any) => (
                  <div
                    key={impact.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors group min-h-[64px]"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Target className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {editingImpact === impact.id ? (
                          <div className="flex flex-col min-w-0">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateImpact()}
                              disabled={isUpdating}
                              placeholder="Impact Name"
                              className="w-full text-sm font-semibold bg-transparent outline-none border-b border-primary/50 focus:border-primary px-0 py-0 min-w-0 mb-1"
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateImpact()}
                              disabled={isUpdating}
                              placeholder="Description"
                              className="w-full text-sm text-muted-foreground bg-transparent outline-none border-b border-primary/50 focus:border-primary px-0 py-0 min-w-0"
                            />
                          </div>
                        ) : (
                          <>
                            <h4 className="text-sm font-semibold mb-1">{impact.name}</h4>
                            <p className="text-sm text-muted-foreground">{impact.description || 'No description'}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingImpact === impact.id ? (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10" onClick={handleUpdateImpact} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Save Impact</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setEditingImpact(null)} disabled={isUpdating}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Cancel</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        canEdit && (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 transition-opacity"
                                  onClick={() => startEditing(impact)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit Impact</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                                  onClick={() => handleDeleteImpact(impact.id, impact.name)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete Impact</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <Target className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No impacts configured</p>
              </div>
            )}

            {/* Add Impact Form */}
            {canEdit && (
              <div className="space-y-2 py-4">
                <span className="text-sm font-semibold px-1">Add New Impact</span>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. Critical"
                        value={impactName}
                        onChange={(e) => setImpactName(e.target.value)}
                        disabled={isAdding}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddImpact();
                          }
                        }}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddImpact}
                        disabled={isAdding || !impactName.trim()}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isAdding ? 'Adding' : 'Add'}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] min-w-0">
                      <textarea
                        placeholder="Brief description about new impact..."
                        value={impactDescription}
                        onChange={(e) => setImpactDescription(e.target.value)}
                        disabled={isAdding}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                      />
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingImpact(null);
        }}
        onDelete={confirmDelete}
        title="Remove Impact"
        description={`Are you sure you want to remove "${deletingImpact?.name}"? This action cannot be undone.`}
        buttonText="Remove"
      />
    </div>
  );
}

// Permissions Tab Content Component
function PermissionsTabContent({
  ticketSpaceId,
  isLoading: _isLoading, // eslint-disable-line @typescript-eslint/no-unused-vars
  onRefresh: _onRefresh, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  ticketSpaceId: string;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const canEdit = usePrivilegeGuard('98') as boolean;

  const [users, setUsers] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedResources, setSelectedResources] = useState<any[]>([]); // Multiple resources
  const [initialSelectedResources, setInitialSelectedResources] = useState<any[]>([]); // Already added members as resources
  const [tempMembers, setTempMembers] = useState<Array<{
    resource: any;
    user: any | null;

    selectedQueues: any[];
    error?: string;
  }>>([]); // Temporary members table
  const [isAdding, setIsAdding] = useState(false);

  const [loadingQueues, setLoadingQueues] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  // Stable ref to users list so fetchPermissions can enrich without being re-created
  const usersRef = useRef<any[]>([]);

  // Edit queues state
  const [editingPermission, setEditingPermission] = useState<any>(null);
  const [editingQueues, setEditingQueues] = useState<any[]>([]);
  const [editQueueSearchOpen, setEditQueueSearchOpen] = useState(false);
  const [isUpdatingQueues, setIsUpdatingQueues] = useState(false);

  // Delete permission confirmation state
  const [deletePermissionOpen, setDeletePermissionOpen] = useState(false);
  const [deletingPermission, setDeletingPermission] = useState<{ id: number; name: string } | null>(null);


  // Pagination for members list
  const [membersPage, setMembersPage] = useState(1);
  const [tempMembersPage, setTempMembersPage] = useState(1);
  const membersPerPage = 6;

  // Fetch queues for this ticket space
  useEffect(() => {
    const fetchQueues = async () => {
      setLoadingQueues(true);
      try {
        const { getTicketSpaceQueueConfig } = await import('@/services/ticket-management/ticket-space.service');
        const data = await getTicketSpaceQueueConfig(Number(ticketSpaceId));
        setQueues(data.queues || []);
      } catch (error) {
        console.error('Error loading queues:', error);
        toast.error('Failed to load queues');
      } finally {
        setLoadingQueues(false);
      }
    };

    fetchQueues();
  }, [ticketSpaceId]);

  // Fetch permissions for this ticket space
  const fetchPermissions = useCallback(async () => {
    setLoadingPermissions(true);
    try {
      const { getTicketSpacePermissions } = await import('@/services/ticket-management/ticket-space.service');
      const data = await getTicketSpacePermissions(Number(ticketSpaceId));
      const enriched = (data || []).map((permission: any) => {
        if (permission.userProfilePicture) return permission;
        // First try the nested user object already returned by the API
        const picFromUser =
          permission.user?.profile_picture ||
          permission.user?.profilePicture ||
          permission.user?.profile_pic;
        if (picFromUser) return { ...permission, userProfilePicture: picFromUser };
        // Fallback: enrich from locally loaded users list
        const email = (permission.userEmail || permission.user?.email || '').toLowerCase();
        if (!email) return permission;
        const user = users.find((u: any) => (u.email || '').toLowerCase() === email);
        const pic = user?.profile_picture || user?.profilePicture || user?.profile_pic;
        if (!pic) return permission;
        return { ...permission, userProfilePicture: pic };
      });
      setPermissions(enriched);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingPermissions(false);
    }
  }, [ticketSpaceId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Load all users to map resources to users via email
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const { load } = await import('@/services/user-management/user-service');
        const response = await load({
          first: 0,
          rows: 1000, // Load all users for email matching
          multiSorts: [{ field: 'id', order: -1 }],
        });
        const loadedUsers = response.data || [];
        setUsers(loadedUsers);
        usersRef.current = loadedUsers;
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      }
    };

    loadAllUsers();
  }, []);

  // Re-enrich permissions with profile pictures once users are loaded
  // (handles race condition where fetchPermissions ran before loadAllUsers finished)
  useEffect(() => {
    if (users.length === 0) return;
    setPermissions((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const enriched = prev.map((permission: any) => {
        if (permission.userProfilePicture) return permission;
        // Try nested user object first
        const picFromUser =
          permission.user?.profile_picture ||
          permission.user?.profilePicture ||
          permission.user?.profile_pic;
        if (picFromUser) { changed = true; return { ...permission, userProfilePicture: picFromUser }; }
        // Fallback to loaded users list
        const email = (permission.userEmail || permission.user?.email || '').toLowerCase();
        if (!email) return permission;
        const user = users.find((u: any) => (u.email || '').toLowerCase() === email);
        const pic = user?.profile_picture || user?.profilePicture || user?.profile_pic;
        if (!pic) return permission;
        changed = true;
        return { ...permission, userProfilePicture: pic };
      });
      return changed ? enriched : prev;
    });
  }, [users]);

  // Convert existing permissions to resources for pre-selection
  useEffect(() => {
    const loadInitialSelectedResources = async () => {
      if (permissions.length === 0) return;

      try {
        const { loadResource } = await import('@/services/resource-management/resource-service');

        // Get emails from existing permissions
        const permissionEmails = permissions.map((p) =>
          (p.userEmail || p.user?.email || '').toLowerCase()
        ).filter(email => email);

        if (permissionEmails.length === 0) return;

        // Load all resources to find matches
        const activeCompany = JSON.parse(localStorage.getItem('active_company') || 'null');
        const params = {
          first: 0,
          rows: 1000,
          filters: activeCompany?.id
            ? [{ field: 'companyId', value: activeCompany.id, matchMode: 'equals' }]
            : [],
        };

        const response = await loadResource(params);
        const allResources = response.data || [];

        // Find resources that match permission emails
        const matchedResources = allResources.filter((resource: any) =>
          permissionEmails.includes(resource.email.toLowerCase())
        );
        setInitialSelectedResources(matchedResources);
      } catch (error) {
        console.error('Error loading initial selected resources:', error);
      }
    };

    loadInitialSelectedResources();
  }, [permissions]);

  // Handle a single resource being added from the dropdown
  const handleResourceAdded = (resource: any) => {
    // Skip if already an initial (committed) member
    if (initialSelectedResources.some((r) => r.id === resource.id)) return;
    // Skip if already in temp list
    if (selectedResources.some((r) => r.id === resource.id)) return;

    const matchingUser = users.find(
      (user) => user.email?.toLowerCase() === resource.email?.toLowerCase()
    );

    const newMember = {
      resource,
      user: matchingUser || { id: resource.userId || resource.id, profile_picture: resource.profile_pic },

      selectedQueues: (() => {
        const defaultQueue = queues.find(q => q.name === 'Default') ?? queues[0];
        return defaultQueue ? [defaultQueue] : [];
      })(),
      error: undefined,
    };

    setSelectedResources((prev) => [...prev, resource]);
    setTempMembers((prev) => [...prev, newMember]);
  };

  // Handle a single resource being removed from the dropdown
  const handleResourceRemoved = (resourceId: number) => {
    // Don't allow removing already-committed members
    if (initialSelectedResources.some((r) => r.id === resourceId)) return;
    setSelectedResources((prev) => prev.filter((r) => r.id !== resourceId));
    setTempMembers((prev) => prev.filter((m) => m.resource.id !== resourceId));
  };

  const handleAddPermission = async () => {
    const validMembers = tempMembers.filter((m) => !m.error && m.selectedQueues.length > 0);

    if (validMembers.length === 0) {
      toast.error('Please select queues for at least one valid member');
      return;
    }

    setIsAdding(true);
    try {
      const { addBulkPermissionsToTicketSpace } = await import('@/services/ticket-management/ticket-space.service');

      const permissionsData = validMembers.map((member) => ({
        userId: member.user!.id,

        queueIds: member.selectedQueues.map((q) => q.id),
        profilePicture: member.resource?.profile_pic || member.user?.profile_picture || null,
      }));

      const results = await addBulkPermissionsToTicketSpace(Number(ticketSpaceId), permissionsData);

      // Refresh permissions list
      await fetchPermissions();

      // Reset selections
      setSelectedResources([]);
      setTempMembers([]);

      toast.success(`Added ${results.length} member${results.length > 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Error adding members:', error);
      const data = error.response?.data;
      const errorMessage = data?.errors?.length
        ? `${data.message}: ${Array.isArray(data.errors) ? data.errors.join(', ') : data.errors}`
        : (data?.message || 'Failed to add members');
      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };


  const handleEditQueues = (permission: any) => {
    setEditingPermission(permission);
    const existingQueues: any[] = permission.queues || [];
    // Only force Default queue when it is the ONLY queue in the ticket space
    const hasOtherQueues = queues.some((q) => q.name !== 'Default');
    if (!hasOtherQueues) {
      const defaultQueue = queues.find((q) => q.name === 'Default');
      const hasDefault = existingQueues.some((q) => q.name === 'Default');
      const initialQueues =
        defaultQueue && !hasDefault ? [defaultQueue, ...existingQueues] : existingQueues;
      setEditingQueues(initialQueues);
    } else {
      setEditingQueues(existingQueues);
    }
  };

  const handleSaveQueues = async () => {
    if (!editingPermission) return;

    // Only enforce Default queue when there are no other queues
    const hasOtherQueues = queues.some((q) => q.name !== 'Default');
    let queuesToSave = [...editingQueues];
    if (!hasOtherQueues) {
      const defaultQueue = queues.find((q) => q.name === 'Default');
      if (defaultQueue && !queuesToSave.some((q) => q.id === defaultQueue.id)) {
        queuesToSave = [defaultQueue, ...queuesToSave];
      }
    }

    setIsUpdatingQueues(true);
    try {
      const { updateTicketSpacePermission } = await import('@/services/ticket-management/ticket-space.service');
      await updateTicketSpacePermission(Number(ticketSpaceId), editingPermission.id, {
        queueIds: queuesToSave.map(q => q.id),
      });
      await fetchPermissions();
      setEditingPermission(null);
      setEditingQueues([]);
      toast.success('Queues updated');
    } catch (error: any) {
      console.error('Error updating queues:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update queues';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingQueues(false);
    }
  };

  const handleCancelEditQueues = () => {
    setEditingPermission(null);
    setEditingQueues([]);
  };

  const handleRemovePermission = (permissionId: number, name: string) => {
    setDeletingPermission({ id: permissionId, name });
    setDeletePermissionOpen(true);
  };

  const confirmRemovePermission = async () => {
    if (!deletingPermission) return;
    const { removePermissionFromTicketSpace } = await import('@/services/ticket-management/ticket-space.service');
    await removePermissionFromTicketSpace(Number(ticketSpaceId), deletingPermission.id);
    await fetchPermissions();
    toast.success('Member removed');
  };

  return (
    <div className="pt-2 gap-3">
      <div className="pb-0 mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              Members{permissions.length > 0 ? ` (${permissions.length})` : ''}
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage members assigned to this ticket space.
            </p>
          </div>
          {canEdit && (
            <TaskSpaceResourceDropdown
              taskSpaceId={0}
              spaceType="ticket"
              selectedResourceIds={new Set([
                ...initialSelectedResources.map((r: any) => r.id),
                ...selectedResources.map((r: any) => r.id),
              ])}
              onResourceAdded={handleResourceAdded}
              onResourceRemoved={handleResourceRemoved}
              skipApi={true}
            />
          )}
        </div>
      </div>
      <div className="space-y-4 pt-0">
        {/* Pending Members Staging Section */}
        {canEdit && tempMembers.length > 0 && (
          <div className="rounded-lg border flex flex-col max-h-[350px] overflow-hidden">
            <div className="flex-1 overflow-auto relative">
              {/* Pending Table */}
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 border-b border-border">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[30%]">MEMBER</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[25%]">EMAIL</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">QUEUES</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[100px]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tempMembers.slice((tempMembersPage - 1) * membersPerPage, tempMembersPage * membersPerPage).map((member, index) => (
                    <TableRow key={index} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-border ${member.error ? 'bg-destructive/5' : ''}`}>
                      <TableCell className="py-1.75 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarImage
                              src={member.resource.profile_pic ? (member.resource.profile_pic.startsWith('http') ? member.resource.profile_pic : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${member.resource.profile_pic}`) : undefined}
                              alt={`${member.resource.first_name} ${member.resource.last_name}`}
                            />
                            <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                              {(member.resource.first_name?.[0] || '').toUpperCase()}{(member.resource.last_name?.[0] || '').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="text-sm font-medium truncate block">
                              {member.resource.first_name} {member.resource.last_name}
                            </span>
                            {member.error && (
                              <p className="text-[10px] text-destructive mt-0.5">{member.error}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground truncate md:hidden">
                              {member.resource.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.75 px-4 text-sm">
                        {member.resource.email}
                      </TableCell>
                      <TableCell className="py-1.75 px-4">
                        {!member.error ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {member.selectedQueues.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No queues</span>
                            )}
                            {[...member.selectedQueues]
                              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                              .map((queue) => (
                                <span
                                  key={queue.id}
                                  className="group/lbl inline-flex items-center gap-0.5 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-gray-800 cursor-pointer select-none max-w-[120px]"
                                >
                                  <span className="truncate max-w-[100px]">{queue.name}</span>
                                  <span className="w-0 overflow-hidden group-hover/lbl:w-3 transition-all duration-150 flex items-center justify-center flex-shrink-0">
                                    <button
                                      type="button"
                                      title="Remove queue"
                                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                      onClick={() => {
                                        const hasOtherQueues = member.selectedQueues.some(q => q.id !== queue.id);
                                        if (queue.name === 'Default' && !hasOtherQueues) {
                                          toast.error('The Default queue cannot be removed');
                                          return;
                                        }
                                        const updatedMembers = [...tempMembers];
                                        updatedMembers[index].selectedQueues = member.selectedQueues.filter(q => q.id !== queue.id);
                                        setTempMembers(updatedMembers);
                                      }}
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                </span>
                              ))}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Badge
                                  variant="outline"
                                  title="Add queue"
                                  className="text-xs border-dashed font-medium text-gray-400 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 gap-1 cursor-pointer select-none"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Queue
                                </Badge>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search queues..." className="h-8 text-xs" />
                                  <CommandList>
                                    <CommandEmpty className="text-xs py-2 pl-3">No queues found.</CommandEmpty>
                                    <CommandGroup>
                                      {queues.map((queue) => {
                                        const isSelected = member.selectedQueues.some(q => q.id === queue.id);
                                        return (
                                          <CommandItem
                                            key={queue.id}
                                            value={queue.name}
                                            onSelect={() => {
                                              const hasOtherQueues = queues.some(q => q.name !== 'Default');
                                              if (queue.name === 'Default' && isSelected && !hasOtherQueues) {
                                                toast.error('The Default queue cannot be removed');
                                                return;
                                              }
                                              const updatedMembers = [...tempMembers];
                                              if (isSelected) {
                                                updatedMembers[index].selectedQueues = member.selectedQueues.filter(q => q.id !== queue.id);
                                              } else {
                                                updatedMembers[index].selectedQueues = [...member.selectedQueues, queue];
                                              }
                                              setTempMembers(updatedMembers);
                                            }}
                                            className="text-xs"
                                          >
                                            <Check className={`mr-2 h-3 w-3 flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                            <span className="flex-1">{queue.name}</span>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.75 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    const updatedMembers = tempMembers.filter((_, i) => i !== index);
                                    setTempMembers(updatedMembers);
                                    const updatedResources = selectedResources.filter((_, i) => i !== index);
                                    setSelectedResources(updatedResources);
                                  }}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Remove Member</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-auto border-border">
              <PaginationControls
                currentPage={tempMembersPage}
                totalItems={tempMembers.length}
                itemsPerPage={membersPerPage}
                onPageChange={setTempMembersPage}
                itemName="pending members"
              />

              {/* Pending action row */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-muted/40 border-t">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
                  Pending to save <span className="bg-primary text-white dark:text-black px-1 py-1 rounded-full text-[11px] leading-none flex items-center justify-center min-w-[20px]">{tempMembers.length}</span>
                </span>
                <div className="flex justify-end items-center gap-1">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20"
                          onClick={handleAddPermission}
                          disabled={isAdding || tempMembers.every((m) => m.error || m.selectedQueues.length === 0)}
                        >
                          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Save ({tempMembers.filter(m => !m.error && m.selectedQueues.length > 0).length})
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => { setTempMembers([]); setSelectedResources([]); }}
                          disabled={isAdding}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Cancel
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        {(loadingPermissions || loadingQueues) ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : permissions.length === 0 && tempMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No members configured</p>
          </div>
        ) : permissions.length > 0 ? (
          (() => {
            const totalPages = Math.ceil(permissions.length / membersPerPage);
            const pagePermissions = permissions.slice(
              (membersPage - 1) * membersPerPage,
              membersPage * membersPerPage,
            );
            return (
              <div className="rounded-lg border flex flex-col h-[calc(100vh-220px)] overflow-hidden">
                <div className="flex-1 overflow-auto relative">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 border-b border-border">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[30%]">MEMBER</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[25%]">EMAIL</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">QUEUES</TableHead>
                        {canEdit && (
                          <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[100px]">
                            ACTIONS
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagePermissions.map((permission) => (
                        <TableRow key={permission.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-border">
                          <TableCell className="py-1.75 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarImage
                                  src={(permission.userProfilePicture || permission.user?.profile_picture)
                                    ? ((permission.userProfilePicture || permission.user?.profile_picture).startsWith('http')
                                      ? (permission.userProfilePicture || permission.user?.profile_picture)
                                      : `${process.env.NEXT_PUBLIC_API_URL}/uploads/users/${permission.userProfilePicture || permission.user?.profile_picture}`)
                                    : undefined}
                                  alt={`${permission.userFirstName || permission.user?.firstName || ''} ${permission.userLastName || permission.user?.lastName || ''}`}
                                />
                                <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                                  {((permission.userFirstName || permission.user?.firstName)?.[0] || '').toUpperCase()}{((permission.userLastName || permission.user?.lastName)?.[0] || '').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {permission.userFirstName || permission.user?.firstName || ''} {permission.userLastName || permission.user?.lastName || ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.75 px-4 text-sm">
                            {permission.userEmail || permission.user?.email || '—'}
                          </TableCell>
                          <TableCell className="py-1.75 px-4">
                            {permission.queues && permission.queues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {[...permission.queues]
                                  .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                                  .map((queue: any) => (
                                    <span
                                      key={queue.id}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs border border-border rounded-md bg-white dark:bg-gray-800 cursor-default select-none max-w-[120px]"
                                    >
                                      <span className="truncate max-w-[100px]">{queue.name}</span>
                                    </span>
                                  ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No queues</span>
                            )}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="py-1.75 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 cursor-pointer hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary"
                                        onClick={() => handleEditQueues(permission)}
                                      >
                                        <FolderClosed className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Edit Member Queues</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemovePermission(permission.id, `${permission.userFirstName ?? ''} ${permission.userLastName ?? ''}`.trim() || permission.userEmail || 'this member')}
                                      >
                                        <Trash className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Remove Member</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-auto border-border">
                  <PaginationControls
                    currentPage={membersPage}
                    totalItems={permissions.length}
                    itemsPerPage={membersPerPage}
                    onPageChange={setMembersPage}
                    itemName="members"
                  />
                </div>
              </div>
            );
          })()
        ) : null}
      </div>

      {/* Edit Queues Dialog */}
      <Dialog open={!!editingPermission} onOpenChange={(open) => !open && handleCancelEditQueues()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Queues</DialogTitle>
            <DialogDescription>
              {editingPermission && (
                <span>
                  Update queues for {editingPermission.userFirstName} {editingPermission.userLastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Queues */}
            {editingQueues.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Selected Queues</label>
                <div className="flex flex-wrap gap-2">
                  {editingQueues.map((queue) => {
                    const isDefault = queue.name === 'Default';
                    const hasOtherQueues = queues.some((q) => q.name !== 'Default');
                    const isLocked = isDefault && !hasOtherQueues;
                    return (
                      <Badge
                        key={queue.id}
                        variant="outline"
                        className={isLocked ? 'cursor-default opacity-90' : 'cursor-pointer hover:bg-destructive/10'}
                        onClick={() => {
                          if (isLocked) {
                            toast.error('The Default queue cannot be removed');
                            return;
                          }
                          setEditingQueues(editingQueues.filter(q => q.id !== queue.id));
                        }}
                      >
                        {queue.name}
                        {isLocked ? (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">required</span>
                        ) : (
                          <button className="ml-1.5 hover:text-destructive"><X className="w-3 h-3" /></button>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Queue Selector */}
            <div>
              {/* <label className="text-sm font-medium mb-2 block">Add Queues</label> */}
              <Popover open={editQueueSearchOpen} onOpenChange={setEditQueueSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editQueueSearchOpen}
                    className="w-full justify-between"
                  >
                    Select queues to add...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search queue..." />
                    <CommandList>
                      <CommandEmpty>
                        {loadingQueues ? 'Loading' : 'No queue found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {/* Select All option */}
                        {queues.filter(queue => !editingQueues.some(eq => eq.id === queue.id)).length > 0 && (
                          <CommandItem
                            key="edit-select-all"
                            value="select-all"
                            onSelect={() => {
                              const remaining = queues.filter(q => !editingQueues.some(eq => eq.id === q.id));
                              setEditingQueues([...editingQueues, ...remaining]);
                            }}
                            className="font-semibold border-b mb-1"
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            Select All
                          </CommandItem>
                        )}
                        {queues
                          .filter(queue => !editingQueues.some(eq => eq.id === queue.id))
                          .map((queue, index) => (
                            <CommandItem
                              key={`edit-queue-${queue.id}-${index}`}
                              value={queue.name}
                              onSelect={() => {
                                setEditingQueues([...editingQueues, queue]);
                              }}
                            >
                              <Check className="mr-2 h-4 w-4 opacity-0" />
                              {queue.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelEditQueues}
              disabled={isUpdatingQueues}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQueues}
              disabled={isUpdatingQueues}
            >
              {isUpdatingQueues ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permission Confirmation Modal */}
      <DeleteModal
        isOpen={deletePermissionOpen}
        onClose={() => { setDeletePermissionOpen(false); setDeletingPermission(null); }}
        onDelete={confirmRemovePermission}
        title="Remove Member"
        description={`Are you sure you want to remove "${deletingPermission?.name}" from this ticket space?`}
        buttonText="Remove"
        hideActionButtonOnError={true}
      />
    </div>
  );
}

function ConfigureTicketSpacePage() {
  const params = useParams();
  const router = useRouter();
  const ticketSpaceId = params.id as string;
  const [activeTab, setActiveTab] = useState('status');
  const [ticketSpace, setTicketSpace] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [severityData, setSeverityData] = useState<any>(null);
  const [queueData, setQueueData] = useState<any>(null);
  const [typesData, setTypesData] = useState<any>(null);
  const [slaData, setSlaData] = useState<any>(null);
  const [impactData, setImpactData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setBreadcrumbs } = useBreadcrumb();

  // loadedRef prevents duplicate/concurrent fetches — keyed by tab name
  const loadedRef = useRef<Record<string, boolean>>({});
  // spaceLoadedRef prevents StrictMode double-fire on getTicketSpaceById
  const spaceLoadedRef = useRef<string | null>(null);
  // previousTabRef distinguishes initial mount from real tab switches
  const previousTabRef = useRef<string | null>(null);

  // Set enhanced nav breadcrumb
  useEffect(() => {
    setBreadcrumbs([
      { label: "Ticket Spaces", href: "/ticket-management/ticket-space" },
      { label: ticketSpace ? `${ticketSpace.name}` : "Loading...", isCurrentPage: true }
    ]);
    return () => {
      setBreadcrumbs([]);
    };
  }, [setBreadcrumbs, ticketSpace]);

  // Fetch ticket space basic info — claim initial tab immediately to avoid double fetch
  useEffect(() => {
    if (!ticketSpaceId || spaceLoadedRef.current === ticketSpaceId) return;
    spaceLoadedRef.current = ticketSpaceId;
    // Mark the initial tab as loaded so fetchTabData doesn't fire a separate request
    loadedRef.current['status'] = true;

    (async () => {
      setIsLoading(true);
      try {
        const { getTicketSpaceById } = await import('@/services/ticket-management/ticket-space.service');
        const response = await getTicketSpaceById(Number(ticketSpaceId));
        setTicketSpace(response.data);
        // Pre-load the initial tab data from the same response if embedded, otherwise fetch it now
        const { getTicketSpaceStatusConfig } = await import('@/services/ticket-management/ticket-space.service');
        const data = await getTicketSpaceStatusConfig(Number(ticketSpaceId));
        setStatusData(data);
      } catch {
        spaceLoadedRef.current = null;
        loadedRef.current['status'] = false;
        toast.error('Failed to load ticket space data');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [ticketSpaceId]);

  // Fetch data based on active tab — stable callback with no data-state deps
  const fetchTabData = useCallback(async (tab: string, force = false) => {
    if (!ticketSpaceId) return;
    if (loadedRef.current[tab] && !force) return;
    loadedRef.current[tab] = true;
    setIsLoading(true);
    try {
      switch (tab) {
        case 'status': {
          const { getTicketSpaceStatusConfig } = await import('@/services/ticket-management/ticket-space.service');
          const data = await getTicketSpaceStatusConfig(Number(ticketSpaceId));
          setStatusData(data);
          break;
        }
        case 'severity': {
          const { getTicketSpaceSeverityConfig } = await import('@/services/ticket-management/ticket-space.service');
          const data = await getTicketSpaceSeverityConfig(Number(ticketSpaceId));
          setSeverityData(data);
          break;
        }
        case 'department': {
          const { getTicketSpaceQueueConfig } = await import('@/services/ticket-management/ticket-space.service');
          const data = await getTicketSpaceQueueConfig(Number(ticketSpaceId));
          setQueueData(data);
          break;
        }
        case 'types': {
          const { getTicketSpaceTypesConfig } = await import('@/services/ticket-management/ticket-space.service');
          const data = await getTicketSpaceTypesConfig(Number(ticketSpaceId));
          setTypesData(data);
          break;
        }
        case 'sla': {
          const { getTicketSpaceSeverityConfig, getTicketSpaceSlaConfig } = await import('@/services/ticket-management/ticket-space.service');
          // Severity needed for SLA display — only fetch if not yet loaded
          if (!loadedRef.current['severity']) {
            loadedRef.current['severity'] = true;
            const sevData = await getTicketSpaceSeverityConfig(Number(ticketSpaceId));
            setSeverityData(sevData);
          }
          const data = await getTicketSpaceSlaConfig(Number(ticketSpaceId));
          setSlaData(data);
          break;
        }
        case 'impact': {
          const { getTicketSpaceImpactConfig } = await import('@/services/ticket-management/ticket-space.service');
          const data = await getTicketSpaceImpactConfig(Number(ticketSpaceId));
          setImpactData(data);
          break;
        }
        case 'queue': {
          const { getTicketSpaceQueueConfig } = await import('@/services/ticket-management/ticket-space.service');
          const data = await getTicketSpaceQueueConfig(Number(ticketSpaceId));
          setQueueData(data);
          break;
        }
        case 'permissions':
          // Permissions tab data is loaded by PermissionsTabContent component
          break;
      }
    } catch {
      loadedRef.current[tab] = false; // allow retry on error
      const tabDisplayNames: Record<string, string> = {
        types: 'ticket types',
        department: 'queue',
        sla: 'SLA'
      };
      const displayName = tabDisplayNames[tab] || tab;
      toast.error(`Failed to load ${displayName} data`);
    } finally {
      setIsLoading(false);
    }
  }, [ticketSpaceId]);

  // Fire on real tab switches only; initial mount is covered by the space-loading effect above
  useEffect(() => {
    const isTabChange = previousTabRef.current !== null && previousTabRef.current !== activeTab;
    previousTabRef.current = activeTab;
    fetchTabData(activeTab, isTabChange);
  }, [activeTab, fetchTabData]);

  const refreshTabData = useCallback(async () => {
    loadedRef.current[activeTab] = false; // clear so force re-fetch works
    await fetchTabData(activeTab, true);
  }, [activeTab, fetchTabData]);


  return (
    <div className="flex flex-col h-[calc(100vh-28px)]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pt-8">
        <div className="px-5 py-3">
          <Tabs value={activeTab} onValueChange={(val) => { setIsLoading(true); setActiveTab(val); }} className="w-full">
            <TabsList className="grid w-full grid-cols-8 border shadow-none p-0.5">
              <TabsTrigger value="status" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Status</span>
              </TabsTrigger>
              <TabsTrigger value="severity" className="gap-2">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Severity</span>
              </TabsTrigger>
              <TabsTrigger value="department" className="gap-2">
                <FolderClosed className="h-4 w-4" />
                <span className="hidden sm:inline">Queues</span>
              </TabsTrigger>
              <TabsTrigger value="types" className="gap-2">
                <Bug className="h-4 w-4" />
                <span className="hidden sm:inline">Types</span>
              </TabsTrigger>
              <TabsTrigger value="sla" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">SLA</span>
              </TabsTrigger>
              <TabsTrigger value="impact" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Impact</span>
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
            </TabsList>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 px-1">
              <StatusTabContent
                ticketSpaceId={ticketSpaceId}
                statusData={statusData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
                onUpdateLocal={setStatusData}
              />
            </TabsContent>

            {/* Severity Tab */}
            <TabsContent value="severity" className="space-y-4 px-1">
              <SeverityTabContent
                ticketSpaceId={ticketSpaceId}
                severityData={severityData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
                onUpdateLocal={setSeverityData}
              />
            </TabsContent>

            {/* Queue Tab */}
            <TabsContent value="department" className="space-y-4 px-1">
              <QueueTabContent
                ticketSpaceId={ticketSpaceId}
                queueData={queueData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
              />
            </TabsContent>

            {/* Ticket Types Tab */}
            <TabsContent value="types" className="space-y-4 px-1">
              <TypesTabContent
                ticketSpaceId={ticketSpaceId}
                typesData={typesData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
                onUpdateLocal={setTypesData}
              />
            </TabsContent>

            {/* SLA Tab */}
            <TabsContent value="sla" className="space-y-4 px-1">
              <SlaTabContent
                ticketSpaceId={ticketSpaceId}
                slaData={slaData}
                severityData={severityData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
              />
            </TabsContent>

            {/* Impact Tab */}
            <TabsContent value="impact" className="space-y-4 px-1">
              <ImpactTabContent
                ticketSpaceId={ticketSpaceId}
                impactData={impactData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
              />
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-4 px-1">
              <PermissionsTabContent
                ticketSpaceId={ticketSpaceId}
                isLoading={isLoading}
                onRefresh={refreshTabData}
              />
            </TabsContent>

            {/*Alerts Tab*/}
            <TabsContent value="alerts" className="space-y-4 px-1">
              <AlertsTabContent
                spaceType="ticket"
                spaceId={Number(ticketSpaceId)}
                companyId={ticketSpace?.companyId as number | undefined}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default ConfigureTicketSpacePage;
