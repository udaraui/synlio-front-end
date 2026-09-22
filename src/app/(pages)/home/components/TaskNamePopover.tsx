"use client";

import React, { useRef, useState } from "react";
import { Folder, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getTaskBaseById } from "@/services/task-management/task.service";
import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";

interface TaskBreadcrumb {
  spaceName: string;
  chain: { name: string; levelName?: string; levelIcon?: string; levelColor?: string }[];
}

const cache = new Map<number, TaskBreadcrumb>();

interface Props {
  taskId: number;
  name: string;
  className?: string;
}

export default function TaskNamePopover({ taskId, name, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<TaskBreadcrumb | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const loadData = async () => {
    if (cache.has(taskId)) {
      setBreadcrumb(cache.get(taskId)!);
      return;
    }
    setLoading(true);
    try {
      const chain: TaskBreadcrumb["chain"] = [];
      let currentId: number | null = taskId;
      let spaceName = "";
      let depth = 0;
      while (currentId !== null && depth < 6) {
        const task = await getTaskBaseById(currentId);
        if (depth === 0) spaceName = task.taskSpace?.name ?? "";
        chain.unshift({
          name: task.name,
          levelName: task.hierarchyLevelConfig?.name,
          levelIcon: task.hierarchyLevelConfig?.icon ?? task.hierarchyLevelIcon,
          levelColor: task.hierarchyLevelConfig?.color ?? task.hierarchyLevelColor,
        });
        currentId = task.parentTaskId ?? null;
        depth++;
      }
      const result: TaskBreadcrumb = { spaceName, chain };
      cache.set(taskId, result);
      setBreadcrumb(result);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleTriggerEnter = () => {
    cancelTimers();
    openTimer.current = setTimeout(() => {
      setOpen(true);
      if (!breadcrumb && !loading) loadData();
    }, 350);
  };

  const handleTriggerLeave = () => {
    cancelTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  const handleContentEnter = () => cancelTimers();
  const handleContentLeave = () => {
    cancelTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={className}
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeave}
        >
          {name}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        side="top"
        align="start"
        onMouseEnter={handleContentEnter}
        onMouseLeave={handleContentLeave}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading path...
          </div>
        ) : breadcrumb ? (
          <div className="flex flex-col">
            {/* Space row */}
            <div className="flex items-center gap-1.5 w-full mb-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {breadcrumb.spaceName || "—"}
              </span>
            </div>
            {/* Task chain — tree style */}
            <div className="ml-1.5 border-l-2 border-border flex flex-col gap-1 pl-0">
              {breadcrumb.chain.map((entry, i) => {
                const LevelIcon = entry.levelIcon
                  ? getHierarchyLevelIcon(entry.levelIcon)
                  : Folder;
                const iconColor = entry.levelColor || "#6B7280";
                return (
                  <div key={i} className="flex items-center gap-0">
                    <div className="flex items-center flex-shrink-0">
                      <span className="text-border text-xs select-none">─</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-1 py-0.5 rounded">
                      <LevelIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: iconColor }} />
                      <span className="text-xs truncate max-w-[160px]">{entry.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No path info</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

