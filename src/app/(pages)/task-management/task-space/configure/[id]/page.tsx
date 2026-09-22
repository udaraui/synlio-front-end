"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb.context";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers,
  FileStack,
  AlertCircle,
  Plus,
  Trash,
  GripVertical,
  Check,
  Package,
  Flag,
  Circle,
  Loader2,
  CheckCircle2,
  Bell,
  Users,
  UserStar,
  Info,
  InfoIcon,
} from "lucide-react";
import {
  HIERARCHY_LEVEL_ICONS,
  DEFAULT_HIERARCHY_LEVEL_ICON,
  getHierarchyLevelIcon,
} from "@/enums/space-configure-icon.enum";
import {
  HIERARCHY_LEVEL_COLORS,
  DEFAULT_HIERARCHY_LEVEL_COLOR,
  STATUS_COLORS,
  DEFAULT_STATUS_COLOR,
  SEVERITY_COLORS,
  DEFAULT_SEVERITY_COLOR,
} from "@/enums/space-configure-color.enum";
import { PaginationControls } from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import DeleteModal from "@/components/DeleteModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getHierarchyLevelConfig,
  getTaskSpaceById,
  addHierarchyLevelToSpaceSingle,
  patchHierarchyLevelConfig,
  getTaskSpaceStatusConfig,
  addStatusToTaskSpace,
  removeStatusFromTaskSpace,
  removeHierarchyLevelFromSpace,
  updateTaskSpaceStatusSequence,
  updateTaskSpaceStatus,
  updateTaskSpaceSeverity,
  getTaskSpaceSeverityConfig,
  addSeverityToTaskSpace,
  removeSeverityFromTaskSpace,
  getTaskSpaceOwnersConfig,
  addOwnerToTaskSpace,
  removeOwnerFromTaskSpace,
  getTaskSpaceResourcesConfig,
  removeResourceFromTaskSpace,
} from "@/services/task-management/task-space.service";
import { TaskSpaceResourceDropdown } from "@/components/common/TaskSpaceResourceDropdown";
import { AlertsTabContent } from "@/components/common/AlertsTabContent";
import { safeParse } from '@/services/auth-service';

// ─── Skills Display (3 visible + hover-popover for overflow) ─────────────────

function SkillsDisplay({
  skills,
  emptyText,
}: {
  skills: any[];
  emptyText?: string;
}) {
  if (!skills || skills.length === 0) {
    return emptyText ? (
      <div className="inline-flex items-center justify-center px-2.5 py-0.5 border border-dashed border-muted-foreground/50 rounded-md">
        <span className="text-[11px] text-muted-foreground/70 italic font-medium">{emptyText}</span>
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {skills.slice(0, 3).map((skill: any, i: number) => (
        <TooltipProvider key={i}>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-primary bg-primary text-xs font-medium text-white dark:text-black whitespace-nowrap">
                {skill?.skillName || skill}
              </span>
            </TooltipTrigger>
            {skill?.skillLevelName && (
              <TooltipContent
                side="right"
                className="p-2 min-w-[120px] bg-white dark:bg-gray-800 border border-border shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {skill?.skillLevelName || "Level"}
                  </span>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, index) => (
                      <span
                        key={index}
                        className={`text-[10px] ${index < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ))}

      {skills.length > 3 && (
        <HoverCard openDelay={100} closeDelay={100}>
          <HoverCardTrigger asChild>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-primary text-primary border-dashed bg-transparent text-[11px] font-medium dark:bg-transparent dark:border-gray-700 cursor-pointer hover:bg-primary/10 transition-colors whitespace-nowrap select-none">
              +{skills.length - 3}
            </span>
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            align="start"
            className="w-max min-w-[224px] p-2 z-50 bg-white dark:bg-gray-800 border-border shadow-md"
          >
            <div className="flex flex-col max-h-52 overflow-y-auto">
              {skills.slice(3).map((skill: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 py-1.5 px-1 border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-none transition-colors"
                >
                  <span className="text-xs text-gray-800 dark:text-gray-200 font-medium">
                    {skill?.skillName || skill}
                  </span>
                  {skill?.skillLevelName && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-gray-500 capitalize">
                        {skill?.skillLevelName || "Level"}
                      </span>
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, index) => (
                          <span
                            key={index}
                            className={`text-[10px] ${index < (skill?.starCount || 0) ? "opacity-100" : "opacity-20"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}

function IconWithColorPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
  onSave,
  disabled,
}: {
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
  onSave?: (icon: string, color: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const IconComponent = getHierarchyLevelIcon(icon);

  const handleIconSelect = (name: string) => {
    onIconChange(name);
    onSave?.(name, color);
  };

  const handleColorSelect = (c: string) => {
    onColorChange(c);
    onSave?.(icon, c);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="h-8 w-8 flex items-center justify-center rounded border border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-accent transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Change icon & color"
        >
          <IconComponent className="h-4 w-4" style={{ color }} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 space-y-2"
        side="bottom"
        align="start"
      >
        {/* Colors — two rows matching "Add New Level" */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Color:</span>
          <div className="flex gap-1">
            {HIERARCHY_LEVEL_COLORS.slice(0, Math.ceil(HIERARCHY_LEVEL_COLORS.length / 2)).map((c) => (
              <button key={c}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? "opacity-100 ring-2 ring-offset-1 ring-gray-400" : "opacity-40 hover:opacity-70"}`}
                style={{ backgroundColor: c }} title={c}
                onClick={() => { handleColorSelect(c); setOpen(false); }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-10 flex-shrink-0" />
          <div className="flex gap-1">
            {HIERARCHY_LEVEL_COLORS.slice(Math.ceil(HIERARCHY_LEVEL_COLORS.length / 2)).map((c) => (
              <button key={c}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? "opacity-100 ring-2 ring-offset-1 ring-gray-400" : "opacity-40 hover:opacity-70"}`}
                style={{ backgroundColor: c }} title={c}
                onClick={() => { handleColorSelect(c); setOpen(false); }} />
            ))}
          </div>
        </div>

        {/* Icons — two rows matching "Add New Level" */}
        <div className="flex items-center gap-1 pt-1 border-t">
          <span className="text-xs text-muted-foreground w-10 flex-shrink-0">Icon:</span>
          <div className="flex gap-0.5">
            {HIERARCHY_LEVEL_ICONS.slice(0, Math.ceil(HIERARCHY_LEVEL_ICONS.length / 2)).map(({ name, component: Icon }) => (
              <button key={name} onClick={() => { handleIconSelect(name); setOpen(false); }}
                className={`p-1.5 rounded hover:bg-accent transition-colors flex items-center justify-center ${icon === name ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                title={name}>
                <Icon className="h-4 w-4" style={{ color }} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-10 flex-shrink-0" />
          <div className="flex gap-0.5">
            {HIERARCHY_LEVEL_ICONS.slice(Math.ceil(HIERARCHY_LEVEL_ICONS.length / 2)).map(({ name, component: Icon }) => (
              <button key={name} onClick={() => { handleIconSelect(name); setOpen(false); }}
                className={`p-1.5 rounded hover:bg-accent transition-colors flex items-center justify-center ${icon === name ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                title={name}>
                <Icon className="h-4 w-4" style={{ color }} />
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Hierarchy Level: Editable row for already-saved configs ────────────────

function LockedHierarchyItem({
  item,
  index,
  taskSpaceId,
  onRefresh,
}: {
  item: any;
  index: number;
  taskSpaceId: string;
  onRefresh?: () => void;
}) {
  const [editName, setEditName] = useState(item.name || "");
  const [editIcon, setEditIcon] = useState(item.icon ?? "Folder");
  const [editColor, setEditColor] = useState(item.color ?? DEFAULT_HIERARCHY_LEVEL_COLOR);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Name editing is only allowed when there are no tm_tasks using this config
  const canEditName = (item.taskCount ?? 0) === 0;

  useEffect(() => {
    setEditName(item.name || "");
    setEditIcon(item.icon ?? "Folder");
    setEditColor(item.color ?? DEFAULT_HIERARCHY_LEVEL_COLOR);
  }, [item.name, item.icon, item.color]);

  const patch = async (data: { name?: string; icon?: string; color?: string }) => {
    setIsSaving(true);
    try {
      await patchHierarchyLevelConfig(Number(taskSpaceId), item.id, data);
      toast.success("Level updated");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update level");
      // Revert optimistic UI
      setEditName(item.name || "");
      setEditIcon(item.icon ?? "Folder");
      setEditColor(item.color ?? DEFAULT_HIERARCHY_LEVEL_COLOR);
    } finally {
      setIsSaving(false);
    }
  };

  const commitName = () => {
    const trimmed = editName.trim();
    if (!trimmed) { setEditName(item.name || ""); setIsEditingName(false); return; }
    setIsEditingName(false);
    if (trimmed !== item.name) patch({ name: trimmed });
  };

  const cancelName = () => {
    setEditName(item.name || "");
    setIsEditingName(false);
  };

  const confirmDelete = async () => {
    setIsSaving(true);
    try {
      await removeHierarchyLevelFromSpace(Number(taskSpaceId), item.id);
      toast.success("Level deleted");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete level");
      setIsSaving(false);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const handleIconColorSave = (icon: string, color: string) => {
    const data: { icon?: string; color?: string } = {};
    if (icon !== item.icon) data.icon = icon;
    if (color !== item.color) data.color = color;
    if (Object.keys(data).length > 0) patch(data);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
      <span className="text-xs font-semibold text-muted-foreground w-5 text-center flex-shrink-0">
        {index + 1}
      </span>

      {/* Icon + color picker — shows spinner in place of icon while saving */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex-shrink-0 cursor-pointer">
              {isSaving ? (
                <span className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </span>
              ) : (
                <IconWithColorPicker
                  icon={editIcon}
                  color={editColor}
                  disabled={false}
                  onIconChange={setEditIcon}
                  onColorChange={setEditColor}
                  onSave={handleIconColorSave}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Click to change icon and color</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Name — editable only when no tasks exist for this level */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex-1 min-w-0 ${canEditName ? "cursor-pointer rounded hover:bg-slate-50 dark:hover:bg-slate-900/50" : "cursor-default opacity-80"}`}
              onClick={() => { if (canEditName) setIsEditingName(true); }}
            >
              {isEditingName && canEditName ? (
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitName();
                    if (e.key === "Escape") cancelName();
                  }}
                  onBlur={commitName}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm font-medium bg-transparent border-0 border-b border-primary outline-none focus:outline-none px-0 py-0.5 min-w-0"
                />
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 py-0.5">
                  <span className="text-sm font-medium truncate">
                    {editName}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{canEditName ? "Click to rename" : `Cannot rename. ${item.taskCount} ${item.name}(s) existing under the space`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Delete button (hidden for first 3 default levels) */}
      {index > 2 && (
        canEditName ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8 flex-shrink-0" />
        )
      )}

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onDelete={confirmDelete}
        title="Delete Hierarchy Level"
        description={`Are you sure you want to delete the '${item.name}' hierarchy level?`}
      />
    </div>
  );
}

// ─── Hierarchy Tree Preview ───────────────────────────────────────────────────

function HierarchyTreePreview({
  levels,
  taskSpace,
}: {
  levels: { name: string; icon: string; color: string }[];
  taskSpace?: any;
}) {
  if (levels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
        <InfoIcon className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Cannot preview the hierarchy levels</p>
       </div>
    );
  }

  // Generate nodes for the preview
  const nodes: any[] = [];

  // Root node (Space/Project) - No icon, just text
  nodes.push({
    id: 'space',
    name: taskSpace?.name || 'Project Space',
    code: taskSpace?.prefix || 'SPC',
    isRoot: true,
  });

  levels.forEach((level, idx) => {
    // Generate a dummy code for preview
    let dummyCode = (taskSpace?.prefix || 'SPC');
    for (let i = 0; i <= idx; i++) {
      dummyCode += `-L${i + 1}`;
    }

    nodes.push({
      id: `level-${idx}`,
      name: level.name || 'Unnamed...',
      code: dummyCode,
      iconName: level.icon,
      color: level.color || '#6b7280',
    });
  });

  return (
    <div className="flex flex-col gap-0.5 pl-5">
      {nodes.map((node, index) => {
        const isRoot = index === 0;
        let Icon: any;

        if (!isRoot) {
          Icon = getHierarchyLevelIcon(node.iconName);
        }

        return (
          <div key={node.id} className="relative flex items-start gap-2" style={{ marginLeft: index * 20 }}>
            {/* Tree connecting line */}
            {!isRoot && (
              <div
                className="absolute border-l-2 border-b-2 border-muted-foreground/30 pointer-events-none"
                style={{
                  left: -12,
                  top: index === 1 ? -14 : -24,
                  width: 16,
                  height: index === 1 ? 22 : 32,
                  borderBottomLeftRadius: 6,
                }}
              />
            )}

            {/* Icon */}
            {!isRoot && (
              <div className="mt-0.5 shrink-0 relative z-10 bg-background rounded-full">
                <Icon style={{ color: node.color }} className="w-4 h-4" />
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col pb-3">
              <div className="flex items-start gap-1.5 mt-0.5 text-foreground">
                {node.code && (
                  <span className={`${isRoot ? 'text-sm font-semibold' : 'text-xs font-semibold'} px-1 py-0 rounded shrink-0 text-blue-500 dark:text-blue-400`}>
                    {node.code}
                  </span>
                )}
                <span className="line-clamp-2 leading-tight text-sm">
                  {node.name}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Hierarchy Level Tab ──────────────────────────────────────────────────────

const MAX_HIERARCHY_LEVELS = 5;

function HierarchyLevelTabContent({
  taskSpaceId,
  taskSpace,
  hierarchyData,
  isLoading,
  onRefresh,
  onSaved,
}: {
  taskSpaceId: string;
  taskSpace: any;
  hierarchyData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onSaved: (configs: any[]) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [customIcon, setCustomIcon] = useState(DEFAULT_HIERARCHY_LEVEL_ICON);
  const [customColor, setCustomColor] = useState<string>(DEFAULT_HIERARCHY_LEVEL_COLOR);
  const [isAdding, setIsAdding] = useState(false);

  const levels: any[] = (hierarchyData?.configs ?? [])
    .slice()
    .sort((a: any, b: any) => a.sequence - b.sequence);

  const atMax = levels.length >= MAX_HIERARCHY_LEVELS;

  // Live preview — includes the in-progress entry while the user is typing
  const previewLevels = [
    ...levels.map((c: any) => ({
      name: c.name,
      icon: c.icon ?? "Folder",
      color: c.color ?? "#6366f1",
    })),
    ...(customName.trim() ? [{ name: customName, icon: customIcon, color: customColor }] : []),
  ];

  const handleAddLevel = async () => {
    if (!customName.trim()) return;
    setIsAdding(true);
    try {
      const saved = await addHierarchyLevelToSpaceSingle(Number(taskSpaceId), {
        name: customName.trim(),
        icon: customIcon,
        color: customColor,
        sequence: levels.length + 1,
      });
      toast.success("Level added");
      setCustomName("");
      setCustomIcon(DEFAULT_HIERARCHY_LEVEL_ICON);
      setCustomColor(DEFAULT_HIERARCHY_LEVEL_COLOR);
      onRefresh();
      onSaved([...levels, saved]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to add level");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="pt-3">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Hierarchy</h3>
            <p className="text-sm text-muted-foreground">
              Configure task hierarchy levels. Click the icon to change icon &amp; color instantly. Click a level&apos;s name to rename it, renaming is only allowed when no tasks exist at that level.
            </p>
          </div>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Level list + tree preview side by side */}
            <div className="flex gap-4">
              <div className="flex-[3] min-w-0">
                {levels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                    <Layers className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No levels configured</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {levels.map((item: any, idx: number) => (
                      <LockedHierarchyItem
                        key={`level-${item.id}`}
                        item={item}
                        index={idx}
                        taskSpaceId={taskSpaceId}
                        onRefresh={onRefresh}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-[2] min-w-0">
                <HierarchyTreePreview levels={previewLevels} taskSpace={taskSpace} />
              </div>
            </div>

            {/* Add New Level */}
            {atMax ? (
              <div className="flex items-center gap-1.5 text-sm text-primary font-medium px-1">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Maximum {MAX_HIERARCHY_LEVELS} levels reached in this project space.</span>
              </div>
            ) : (
              <div className="space-y-2 pt-5">
                <span className="text-sm font-medium px-1 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  You can add {MAX_HIERARCHY_LEVELS - levels.length} more level{MAX_HIERARCHY_LEVELS - levels.length !== 1 ? 's' : ''} to this project space.
                </span>

                <div className="flex flex-col gap-4 pt-1">
                  {/* Row 1: input + actions */}
                  <div className="flex gap-4 w-full">
                    <div className="flex-[3] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. Epic"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddLevel(); }}
                        disabled={isAdding}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button size="sm" onClick={handleAddLevel}
                        disabled={isAdding || !customName.trim()} className="flex-shrink-0">
                        <Plus className="h-4 w-4 mr-1" />
                        {isAdding ? "Adding" : "Add"}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  {/* Row 2: Colors and Icons */}
                  <div className="flex flex-col lg:flex-row items-start gap-8">
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-7 gap-1.5 w-max">
                        {HIERARCHY_LEVEL_COLORS.map((c) => (
                          <button key={c}
                            className={`w-7 h-7 rounded-full transition-all flex items-center opacity-70 justify-center ${customColor === c ? "opacity-100 ring-2 ring-offset-1 ring-primary" : ""}`}
                            style={{ backgroundColor: c }} title={c}
                            onClick={() => setCustomColor(c)} disabled={isAdding} />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-9 gap-1.5 w-max">
                        {HIERARCHY_LEVEL_ICONS.map(({ name, component: Icon }) => (
                          <button key={name} onClick={() => setCustomIcon(name)}
                            className={`p-1.5 rounded hover:bg-accent transition-colors flex items-center justify-center ${customIcon === name ? "ring-2 ring-primary" : ""}`}
                            title={name} disabled={isAdding}>
                            <Icon className="h-4 w-4" style={{ color: customColor }} />
                          </button>
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
    </div>
  );
}

// ─── Status Tab ───────────────────────────────────────────────────────────────

function SortableStatusItem({
  status,
  onDelete,
  canEdit,
  onUpdate,
}: {
  status: any;
  onDelete: () => void;
  canEdit: boolean;
  onUpdate: (id: number, data: { name?: string; color?: string }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(status.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const inUseCount = status.taskCount || status.ticketCount || 0;
  const isItemEditable = canEdit && inUseCount === 0;

  useEffect(() => {
    setEditName(status.name);
  }, [status.name]);

  const handleNameSave = async () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== status.name) {
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
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(status.name);
    }
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors ${isUpdating ? 'opacity-50 pointer-events-none animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
                {isItemEditable ? (
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
                                ? "opacity-100 ring-2 ring-offset-2 ring-gray-400 scale-110"
                                : "opacity-60 hover:opacity-100 hover:scale-110"
                                }`}
                              style={{ backgroundColor: color }}
                              title={color}
                              onClick={async () => {
                                if (status.color !== color) {
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
                  const baseIconMap: Record<string, React.ElementType> = { "To Start": Circle, "Processing": Loader2, "Finished": CheckCircle2 };
                  const baseConfig: Record<string, { iconBg: string; iconColor: string; title: string; description: string; examples: string[] }> = {
                    "To Start": { iconBg: "bg-slate-100 dark:bg-slate-800", iconColor: "text-slate-500 dark:text-slate-400", title: "Initial State", description: "Assign this base to statuses where work hasn't started yet. The task exists but no action has been taken.", examples: ["Backlog", "Open", "To Do", "Awaiting Start"] },
                    "Processing": { iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-500 dark:text-blue-400", title: "Active Progress", description: "Assign this base to statuses where work is actively underway. The task is being acted on right now.", examples: ["In Progress", "In Review", "Testing", "Pending Approval"] },
                    "Finished": { iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", title: "Completed State", description: "Assign this base to statuses that mark the end of the workflow whether completed, closed, or cancelled.", examples: ["Done", "Closed", "Cancelled", "Resolved"] },
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
        {/*<span className="text-xs text-muted-foreground">Step {index + 1}</span>*/}
        {canEdit && !status.isPrimaryBase && (
          inUseCount === 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-8 w-8 flex-shrink-0" />
          )
        )}
      </div>
    </div>
  );
}

function StatusTabContent({
  taskSpaceId,
  statusData,
  isLoading,
  onRefresh,
  onUpdateLocal,
}: {
  taskSpaceId: string;
  statusData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateLocal?: (updater: (prev: any) => any) => void;
}) {
  const canEdit = usePrivilegeGuard("46") as boolean;
  const [statuses, setStatuses] = useState<any[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_STATUS_COLOR);
  const [selectedBase, setSelectedBase] = useState<string>("To Start");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingStatus, setDeletingStatus] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const colors = STATUS_COLORS;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
      try {
        const statusSequences = newStatuses.map((status, index) => ({
          statusId: status.id,
          sequence: index,
        }));
        await updateTaskSpaceStatusSequence(Number(taskSpaceId), statusSequences);
        toast.success("Status order updated");
      } catch {
        toast.error("Failed to update status order");
        onRefresh();
      }
    }
  };

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error("Please enter a status name");
      return;
    }
    if (!selectedBase) {
      toast.error("Please select a base for the status");
      return;
    }
    setIsAdding(true);
    try {
      await addStatusToTaskSpace(
        Number(taskSpaceId),
        newStatusName.trim(),
        selectedColor,
        selectedBase || null,
      );
      toast.success("Status added");
      setNewStatusName("");
      setSelectedColor(DEFAULT_STATUS_COLOR);
      setSelectedBase("To Start");
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add status");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateStatus = async (statusId: number, data: { name?: string; color?: string }) => {
    try {
      const response = await updateTaskSpaceStatus(Number(taskSpaceId), statusId, data);
      toast.success("Status updated");
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
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDeleteStatus = (statusId: number, statusName: string) => {
    setDeletingStatus({ id: statusId, name: statusName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingStatus) return;
    try {
      await removeStatusFromTaskSpace(Number(taskSpaceId), deletingStatus.id);
      toast.success("Status removed");
      onRefresh();
    } catch (error: any) {
      throw error;
    } finally {
      setDeletingStatus(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddStatus();
  };

  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="flex items-center gap-2 text-lg font-medium">Status</h3>
        <p className="text-sm text-muted-foreground">
          Define the lifecycle statuses a task moves through. Drag to reorder, click name or color to edit.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {statuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <InfoIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No statuses configured</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {statuses.map((status: any) => (
                      <SortableStatusItem key={status.id} status={status} canEdit={canEdit} onDelete={() => handleDeleteStatus(status.id, status.name)} onUpdate={handleUpdateStatus} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {canEdit && (
              <div className="space-y-2 py-4">
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
                        <Plus className="h-4 w-4 mr-1" />{isAdding ? "Adding" : "Add"}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  {/* Row 2: Bases and Colors */}
                  <div className="flex flex-col lg:flex-row items-start gap-5 px-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {(["To Start", "Processing", "Finished"] as const).map((val) => {
                          const baseConfig: Record<string, { icon: React.ElementType; iconBg: string; iconColor: string; title: string; description: string; examples: string[] }> = {
                            "To Start": { icon: Circle, iconBg: "", iconColor: "text-slate-500 dark:text-slate-400", title: "Initial State", description: "Assign this base to statuses where work hasn't started yet. The task exists but no action has been taken.", examples: ["Backlog", "Open", "To Do", "Awaiting Start"] },
                            "Processing": { icon: Loader2, iconBg: "", iconColor: "text-blue-500 dark:text-blue-400", title: "Active Progress", description: "Assign this base to statuses where work is actively underway. The task is being acted on right now.", examples: ["In Progress", "In Review", "Testing", "Pending Approval"] },
                            "Finished": { icon: CheckCircle2, iconBg: "", iconColor: "text-emerald-600 dark:text-emerald-400", title: "Completed State", description: "Assign this base to statuses that mark the end of the workflow whether completed, closed, or cancelled.", examples: ["Done", "Closed", "Cancelled", "Resolved"] },
                          };
                          const cfg = baseConfig[val];
                          const IconComp = cfg.icon;
                          const active = selectedBase === val;
                          return (
                            <HoverCard key={val} openDelay={200}>
                              <HoverCardTrigger asChild>
                                <button type="button" onClick={() => setSelectedBase(active ? "" : val)} disabled={isAdding}
                                  className={`transition-all ${active ? "opacity-100" : "opacity-50 hover:opacity-80"}`}>
                                  <Badge variant="outline" className={`gap-1.5 cursor-pointer text-foreground font-normal ${active ? "ring-2 ring-offset-1 ring-primary" : ""}`}>
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
                            className={`w-7 h-7 rounded-full transition-all flex items-center opacity-80 justify-center ${selectedColor === color ? "opacity-100 ring-2 ring-offset-1 ring-primary" : ""}`}
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

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingStatus(null);
        }}
        onDelete={confirmDelete}
        title="Remove Status"
        description={`Are you sure you want to remove "${deletingStatus?.name}" from this space? This action cannot be undone.`}
        buttonText="Remove"
        hideActionButtonOnError={true}
      />
    </div>
  );
}

// ─── Severity Tab ─────────────────────────────────────────────────────────────

function InlineSeverityItem({
  severity,
  onDelete,
  canEdit,
  onUpdate,
}: {
  severity: any;
  onDelete: () => void;
  canEdit: boolean;
  onUpdate: (id: number, data: { name?: string; color?: string }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(severity.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const inUseCount = severity.taskCount || severity.ticketCount || 0;
  const isItemEditable = canEdit && inUseCount === 0;

  useEffect(() => {
    setEditName(severity.name);
  }, [severity.name]);

  const handleNameSave = async () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== severity.name) {
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
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(severity.name);
    }
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors ${isUpdating ? 'opacity-50 pointer-events-none animate-pulse' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0">
                {isItemEditable ? (
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
                                ? "opacity-100 ring-2 ring-offset-2 ring-gray-400 scale-110"
                                : "opacity-60 hover:opacity-100 hover:scale-110"
                                }`}
                              style={{ backgroundColor: color }}
                              title={color}
                              onClick={async () => {
                                if (severity.color !== color) {
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex-1 min-w-0 ${isItemEditable ? 'cursor-text rounded hover:bg-slate-50 dark:hover:bg-slate-900/50' : 'cursor-default'}`}
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
      </div>
      <div className="flex items-center gap-2">
        {canEdit && (
          inUseCount === 0 ? (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
              onClick={onDelete}>
              <Trash className="h-4 w-4" />
            </Button>
          ) : (
            <div className="h-8 w-8 flex-shrink-0" />
          )
        )}
      </div>
    </div>
  );
}

function SeverityTabContent({
  taskSpaceId,
  severityData,
  isLoading,
  onRefresh,
  onUpdateLocal,
}: {
  taskSpaceId: string;
  severityData: any;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateLocal?: (updater: (prev: any) => any) => void;
}) {
  const canEdit = usePrivilegeGuard("46") as boolean;
  const [severities, setSeverities] = useState<any[]>([]);
  const [newSeverityName, setNewSeverityName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(
    DEFAULT_SEVERITY_COLOR,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSeverity, setDeletingSeverity] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const colors = SEVERITY_COLORS;

  useEffect(() => {
    if (severityData?.severities) {
      setSeverities(severityData.severities);
    }
  }, [severityData]);

  const handleAddSeverity = async () => {
    if (!newSeverityName.trim()) {
      toast.error("Please enter a severity name");
      return;
    }
    setIsAdding(true);
    try {
      await addSeverityToTaskSpace(
        Number(taskSpaceId),
        newSeverityName.trim(),
        selectedColor,
      );
      toast.success("Severity added");
      setNewSeverityName("");
      setSelectedColor(DEFAULT_SEVERITY_COLOR);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add severity");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateSeverity = async (severityId: number, data: { name?: string; color?: string }) => {
    try {
      const response = await updateTaskSpaceSeverity(Number(taskSpaceId), severityId, data);
      toast.success("Severity updated");
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
      toast.error(error.response?.data?.message || "Failed to update severity");
    }
  };

  const handleDeleteSeverity = (severityId: number, severityName: string) => {
    setDeletingSeverity({ id: severityId, name: severityName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingSeverity) return;
    try {
      await removeSeverityFromTaskSpace(
        Number(taskSpaceId),
        deletingSeverity.id,
      );
      toast.success("Severity removed");
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove severity");
      throw error;
    } finally {
      setDeletingSeverity(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddSeverity();
  };

  return (
    <div className="pt-2">
      <div className="mb-6 space-y-1">
        <h3 className="flex items-center gap-2 text-lg font-medium">Severity</h3>
        <p className="text-sm text-muted-foreground">
          Define severity levels for triaging tasks. Click name or color to edit.
        </p>
      </div>
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {severities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <Flag className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No severity levels configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {severities.map((severity: any) => (
                  <InlineSeverityItem
                    key={severity.id}
                    severity={severity}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteSeverity(severity.id, severity.name)}
                    onUpdate={handleUpdateSeverity}
                  />
                ))}
              </div>
            )}
            {canEdit && (
              <div className="space-y-2 py-4">
                <span className="text-sm font-semibold px-1">Add New Severity</span>
                <div className="flex flex-col gap-4 pt-2">
                  {/* Row 1: input + actions */}
                  <div className="flex gap-4 w-full">
                    <div className="flex-[2] flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        placeholder="e.g. Critical"
                        value={newSeverityName}
                        onChange={(e) => setNewSeverityName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isAdding}
                        className="flex-1 min-w-0 h-9 px-3 text-sm border border-input rounded-md bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      />
                      <Button size="sm" onClick={() => handleAddSeverity()} disabled={isAdding || !newSeverityName.trim()} className="flex-shrink-0">
                        <Plus className="h-4 w-4 mr-1" />{isAdding ? "Adding" : "Add"}
                      </Button>
                    </div>
                    <div className="flex-[2] min-w-0" />
                  </div>

                  {/* Row 2: Colors */}
                  <div className="flex flex-col lg:flex-row items-start gap-8 px-1">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5 w-max">
                        {colors.map((color) => (
                          <button key={color}
                            className={`w-7 h-7 rounded-full transition-all flex items-center opacity-80 justify-center ${selectedColor === color ? "opacity-100 ring-2 ring-offset-1 ring-primary" : ""}`}
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

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingSeverity(null);
        }}
        onDelete={confirmDelete}
        title="Remove Severity"
        description={`Are you sure you want to remove "${deletingSeverity?.name}" from this space? This action cannot be undone.`}
        buttonText="Remove"
      />
    </div>
  );
}

// ─── Owners Tab ───────────────────────────────────────────────────────────────

function OwnersTabContent({
  taskSpaceId,
  ownersData,
  isLoading,
}: {
  taskSpaceId: string;
  ownersData: any;
  isLoading: boolean;
}) {
  const canEdit = usePrivilegeGuard("46") as boolean;
  const [owners, setOwners] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingOwner, setDeletingOwner] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Pagination
  const PAGE_SIZE = 7;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const raw: any[] = ownersData?.owners || [];
    const seen = new Set<number>();
    setOwners(
      raw.filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      }),
    );
  }, [ownersData]);

  // On open: load 5 recent users immediately.
  // On typing: debounce 400ms and load 5 matching users.
  useEffect(() => {
    if (!searchOpen) {
      setUserResults([]);
      return;
    }

    const delay = userSearch.trim() ? 400 : 0;
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const active_company = safeParse(localStorage.getItem("active_company")) || [];

        const { load } = await import("@/services/user-service");

        const filters = userSearch.trim()
          ? [
            {
              field: "first_name",
              value: userSearch.trim(),
              matchMode: "contains",
            },
            {
              field: "companyId",
              value: active_company.companyId,
              matchMode: "equals",
            },
          ]
          : [];
        const result = await load({
          first: 0,
          rows: 5,
          filters,
          multiSorts: [{ field: "id", order: -1 }],
        });
        // Deduplicate by id in case the API returns the same user multiple times
        const seen = new Set<number>();
        const unique = (result.data || []).filter((u: any) => {
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
        setUserResults(unique);
      } catch {
        setUserResults([]);
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => clearTimeout(t);
  }, [userSearch, searchOpen]);

  const ownerIds = new Set(owners.map((o) => o.id));

  /** Toggle: if already an owner → remove; if not → add. */
  const handleToggleOwner = async (user: any) => {
    const isOwner = ownerIds.has(user.id);
    setTogglingId(user.id);
    try {
      if (isOwner) {
        await removeOwnerFromTaskSpace(Number(taskSpaceId), user.id);
        setOwners((prev) => prev.filter((o) => o.id !== user.id));
        toast.success("Owner removed");
      } else {
        await addOwnerToTaskSpace(Number(taskSpaceId), user.id);
        // Map profile_picture to profile_pic so the UI renders the avatar immediately
        const newUser = { ...user, profile_pic: user.profile_picture || user.profile_pic };
        setOwners((prev) => [...prev, newUser]);
        toast.success("Owner added");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update owner");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = (id: number, name: string) => {
    setDeletingOwner({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingOwner) return;
    try {
      await removeOwnerFromTaskSpace(Number(taskSpaceId), deletingOwner.id);
      setOwners((prev) => prev.filter((o) => o.id !== deletingOwner.id));
      toast.success("Owner removed");
    } catch {
      toast.error("Failed to remove owner");
    } finally {
      setDeletingOwner(null);
      setDeleteConfirmOpen(false);
    }
  };

  if (isLoading && !ownersData) {
    return (
      <div className="pt-2">
        <div className="mb-6 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Owners</h3>
              <p className="text-sm text-muted-foreground">Manage project space owners.</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Owners</h3>
            <p className="text-sm text-muted-foreground">Manage project space owners.</p>
          </div>

          {canEdit && (
            <Popover
              open={searchOpen}
              onOpenChange={(open) => {
                setSearchOpen(open);
                if (!open) setUserSearch("");
              }}
            >
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Owner
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-80 p-0" align="end">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search users"
                    value={userSearch}
                    onValueChange={setUserSearch}
                  />
                  <CommandList>
                    {isSearching && (
                      <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                        Searching...
                      </div>
                    )}

                    {!isSearching && userResults.length === 0 && (
                      <CommandEmpty>No users found</CommandEmpty>
                    )}

                    {!isSearching && userResults.length > 0 && (
                      <CommandGroup
                        heading={
                          userSearch.trim() ? "Search results" : "Recent users"
                        }
                      >
                        {userResults.map((u) => {
                          const isAdded = ownerIds.has(u.id);
                          const isToggling = togglingId === u.id;
                          return (
                            <CommandItem
                              key={u.id}
                              value={String(u.id)}
                              onSelect={() =>
                                !isToggling && handleToggleOwner(u)
                              }
                              className="gap-2 cursor-pointer"
                            >
                              {/* Avatar with profile picture */}
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarImage
                                  src={
                                    u.profile_picture
                                      ? u.profile_picture.startsWith("http")
                                        ? u.profile_picture
                                        : `${process.env.NEXT_PUBLIC_API_URL}/uploads/users/${u.profile_picture}`
                                      : undefined
                                  }
                                  alt={`${u.first_name} ${u.last_name}`}
                                />
                                <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                                  {(u.first_name?.[0] || '').toUpperCase()}{(u.last_name?.[0] || '').toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>

                              {/* Name + email */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {u.first_name} {u.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {u.email}
                                </p>
                              </div>

                              {/* State indicator */}
                              {isToggling ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0" />
                              ) : isAdded ? (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              ) : null}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : owners.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
                <UserStar className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No owners configured</p>
              </div>
        ) : (
          <div className="rounded-lg border flex flex-col h-[calc(100vh-220px)] overflow-hidden">
            <div className="flex-1 overflow-auto relative">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 border-b border-border">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">OWNER</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">EMAIL</TableHead>
                    {canEdit && (
                      <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                        ACTIONS
                      </TableHead>
                    )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((o) => (
                  <TableRow key={o.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-border">
                    <TableCell className="py-1.75 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage
                            src={
                              o.profile_pic
                                ? o.profile_pic.startsWith("http")
                                  ? o.profile_pic
                                  : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${o.profile_pic}`
                                : undefined
                            }
                            alt={`${o.first_name} ${o.last_name}`}
                          />
                          <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                            {(o.first_name?.[0] || '').toUpperCase()}{(o.last_name?.[0] || '').toUpperCase() || (!o.first_name && !o.name ? '?' : '')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {o.first_name} {o.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.75 px-4 text-sm">
                      {o.email}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="py-1.75 px-4 text-right">
                        <div className="flex justify-end">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    handleDelete(
                                      o.id,
                                      `${o.first_name} ${o.last_name}`,
                                    )
                                  }
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Remove Owner</TooltipContent>
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
                currentPage={page}
                totalItems={owners.length}
                itemsPerPage={PAGE_SIZE}
                onPageChange={setPage}
                itemName="owners"
              />
            </div>
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onDelete={confirmDelete}
        title="Remove Owner"
        description={`Remove "${deletingOwner?.name}" from this project space?`}
      />
    </div>
  );
}

// ─── Resources Tab ────────────────────────────────────────────────────────────

function ResourcesTabContent({
  taskSpaceId,
  resourcesData,
  isLoading,
}: {
  taskSpaceId: string;
  resourcesData: any;
  isLoading: boolean;
}) {
  const canEdit = usePrivilegeGuard("46") as boolean;
  const [resources, setResources] = useState<any[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<{
    id: number;
    name: string;
  } | null>(null);
  // Pagination
  const PAGE_SIZE = 7;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setResources(resourcesData?.resources || []);
    setPage(1); // reset to first page on data refresh
  }, [resourcesData]);

  const resourceIds = new Set(resources.map((r) => r.id));

  const handleDelete = (id: number, name: string) => {
    setDeletingResource({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingResource) return;
    try {
      await removeResourceFromTaskSpace(
        Number(taskSpaceId),
        deletingResource.id,
      );
      setResources((prev) => prev.filter((r) => r.id !== deletingResource.id));
      setDeletingResource(null);
      toast.success("Resource removed");
    } catch (error: any) {
      throw error; // Re-throw so DeleteModal can display the backend error
    }
  };

  if (isLoading && !resourcesData) {
    return (
      <div className="pt-2">
        <div className="mb-2 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Members</h3>
              <p className="text-sm text-muted-foreground">Manage members assigned to this project space.</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Members</h3>
            <p className="text-sm text-muted-foreground">
              Manage members assigned to this project space.
            </p>
          </div>

          {canEdit && (
            <TaskSpaceResourceDropdown
              taskSpaceId={Number(taskSpaceId)}
              selectedResourceIds={resourceIds}
              onResourceAdded={(resource) => {
                const newResource = { ...resource, profile_pic: resource.profile_picture || resource.profile_pic };
                setResources((prev) => [...prev, newResource]);
              }}
              onResourceRemoved={(id) =>
                setResources((prev) => prev.filter((r) => r.id !== id))
              }
            />
          )}
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] border-2 border-dashed rounded-lg">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No members assigned</p>
          </div>
        ) : (
          (() => {
            const pageResources = resources.slice(
              (page - 1) * PAGE_SIZE,
              page * PAGE_SIZE,
            );
            return (
              <div className="rounded-lg border flex flex-col h-[calc(100vh-220px)] overflow-hidden">
                <div className="flex-1 overflow-auto relative">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 border-b border-border">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">MEMBER</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">EMAIL</TableHead>
                        <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">SKILLS</TableHead>
                        {canEdit && (
                          <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                            ACTIONS
                          </TableHead>
                        )}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageResources.map((r) => (
                      <TableRow key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-border">
                        <TableCell className="py-1.75 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage
                                src={
                                  r.profile_pic
                                    ? r.profile_pic.startsWith("http")
                                      ? r.profile_pic
                                      : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${r.profile_pic}`
                                    : undefined
                                }
                                alt={`${r.first_name} ${r.last_name}`}
                              />
                              <AvatarFallback className="bg-primary text-white dark:text-black text-xs font-semibold">
                                {(r.first_name?.[0] || '').toUpperCase()}{(r.last_name?.[0] || '').toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {r.first_name} {r.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.75 px-4 text-sm">
                          {r.email || "—"}
                        </TableCell>
                        <TableCell className="py-1.75 px-4">
                          <SkillsDisplay
                            skills={r.skills ?? []}
                            emptyText="No skills"
                          />
                        </TableCell>
                        {canEdit && (
                          <TableCell className="py-1.75 px-4 text-right">
                            <div className="flex justify-end">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() =>
                                        handleDelete(
                                          r.id,
                                          `${r.first_name} ${r.last_name}`,
                                        )
                                      }
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

                {/* Pagination controls */}
                <div className="mt-auto border-border">
                  <PaginationControls
                    currentPage={page}
                    totalItems={resources.length}
                    itemsPerPage={PAGE_SIZE}
                    onPageChange={setPage}
                    itemName="members"
                  />
                </div>
              </div>
            );
          })()
        )}
      </div>

      <DeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingResource(null);
        }}
        onDelete={confirmDelete}
        title="Remove Resource"
        description={`Remove "${deletingResource?.name}" from this project space?`}
        buttonText="Remove"
        hideActionButtonOnError={true}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ConfigureTaskSpacePage() {
  const params = useParams();
  const router = useRouter();
  const taskSpaceId = params.id as string;
  const [activeTab, setActiveTab] = useState("hierarchy");
  const [taskSpace, setTaskSpace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Tab data (loaded lazily)
  const [hierarchyData, setHierarchyData] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [severityData, setSeverityData] = useState<any>(null);
  const [ownersData, setOwnersData] = useState<any>(null);
  const [resourcesData, setResourcesData] = useState<any>(null);

  const { setBreadcrumbs } = useBreadcrumb();

  // Set enhanced nav breadcrumb
  useEffect(() => {
    setBreadcrumbs([
      { label: "Project Spaces", href: "/task-management/task-space" },
      { label: taskSpace ? `${taskSpace.name}` : "Loading", isCurrentPage: true }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, taskSpace]);

  // loadedRef prevents concurrent/duplicate fetches without being a stale closure
  const loadedRef = React.useRef<Record<string, boolean>>({});
  // spaceLoadedRef prevents StrictMode double-fire on getTaskSpaceById
  const spaceLoadedRef = React.useRef<string | null>(null);
  // previousTabRef distinguishes initial mount from real tab switches
  const previousTabRef = React.useRef<string | null>(null);

  // Load task space info + hierarchy configs (with taskCount) in parallel on mount
  useEffect(() => {
    if (!taskSpaceId || spaceLoadedRef.current === taskSpaceId) return;
    spaceLoadedRef.current = taskSpaceId; // claim immediately
    // Mark hierarchy as loaded synchronously so fetchTabData skips the separate request
    loadedRef.current["hierarchy"] = true;

    (async () => {
      setIsLoading(true);
      try {
        // Fetch both in parallel — getHierarchyLevelConfig returns enriched configs
        // with taskCount so the UI can properly restrict name editing
        const [res, enrichedConfigs] = await Promise.all([
          getTaskSpaceById(Number(taskSpaceId)),
          getHierarchyLevelConfig(Number(taskSpaceId)),
        ]);
        const space = res.data;
        setTaskSpace(space);
        const configs = (enrichedConfigs ?? [])
          .slice()
          .sort((a: any, b: any) => a.sequence - b.sequence);
        setHierarchyData({
          isSetup: configs.length === 0,
          configs,
          masterLevels: [],
        });
      } catch {
        spaceLoadedRef.current = null;
        loadedRef.current["hierarchy"] = false; // allow retry
        toast.error("Failed to load project space");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [taskSpaceId]);

  const fetchTabData = useCallback(
    async (tab: string, force = false) => {
      if (!taskSpaceId) return;
      if (loadedRef.current[tab] && !force) return;
      loadedRef.current[tab] = true;
      setIsLoading(true);
      try {
        switch (tab) {
          case "hierarchy": {
            const configs = await getHierarchyLevelConfig(Number(taskSpaceId));
            setHierarchyData({
              isSetup: !configs || configs.length === 0,
              configs: configs ?? [],
              masterLevels: [],
            });
            break;
          }
          case "status": {
            const data = await getTaskSpaceStatusConfig(Number(taskSpaceId));
            setStatusData(data);
            break;
          }
          case "severity": {
            const data = await getTaskSpaceSeverityConfig(Number(taskSpaceId));
            setSeverityData(data);
            break;
          }
          case "owners": {
            const data = await getTaskSpaceOwnersConfig(Number(taskSpaceId));
            setOwnersData(data);
            break;
          }
          case "resources": {
            const data = await getTaskSpaceResourcesConfig(Number(taskSpaceId));
            setResourcesData(data);
            break;
          }
        }
      } catch {
        loadedRef.current[tab] = false;
        toast.error(`Failed to load ${tab} data`);
      } finally {
        setIsLoading(false);
      }
    },
    [taskSpaceId],
  );

  // Force-refresh only on real tab switches; initial mount uses data already loaded by getTaskSpaceById
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
      <div className="flex-1 overflow-y-auto pt-8">
        <div className="px-5 py-3">
          <Tabs
            value={activeTab}
            onValueChange={(val) => { setIsLoading(true); setActiveTab(val); }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-6 border shadow-none p-0.5">
              <TabsTrigger value="hierarchy" className="gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Hierarchy</span>
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Status</span>
              </TabsTrigger>
              <TabsTrigger value="severity" className="gap-2">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Severity</span>
              </TabsTrigger>
              <TabsTrigger value="owners" className="gap-2">
                <UserStar className="h-4 w-4" />
                <span className="hidden sm:inline">Owners</span>
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hierarchy" className="space-y-4 px-1">
              <HierarchyLevelTabContent
                taskSpaceId={taskSpaceId}
                taskSpace={taskSpace}
                hierarchyData={hierarchyData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
                onSaved={(configs) =>
                  setHierarchyData({ isSetup: false, configs, masterLevels: [] })
                }
              />
            </TabsContent>

            <TabsContent value="status" className="space-y-4 px-1">
              <StatusTabContent
                taskSpaceId={taskSpaceId}
                statusData={statusData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
                onUpdateLocal={setStatusData}
              />
            </TabsContent>

            <TabsContent value="severity" className="space-y-4 px-1">
              <SeverityTabContent
                taskSpaceId={taskSpaceId}
                severityData={severityData}
                isLoading={isLoading}
                onRefresh={refreshTabData}
                onUpdateLocal={setSeverityData}
              />
            </TabsContent>

            <TabsContent value="owners" className="space-y-4 px-1">
              <OwnersTabContent
                taskSpaceId={taskSpaceId}
                ownersData={ownersData}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 px-1">
              <ResourcesTabContent
                taskSpaceId={taskSpaceId}
                resourcesData={resourcesData}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4 px-1">
              <AlertsTabContent
                spaceType="task"
                spaceId={Number(taskSpaceId)}
                companyId={taskSpace?.companyId as number | undefined}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default ConfigureTaskSpacePage;
