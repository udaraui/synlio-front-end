'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TaskCard from './TaskCard';
import { TaskCardConfigData, TaskUpdateHandler } from './task-card.types';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Sortable task card wrapper ───────────────────────────────────────────────
function SortableTaskCard({
  task, configData, onEdit, onDelete, onUpdateTask, onCardClick, onShowChildTasks, isRelationsLoading,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-lg">
      <TaskCard
        task={task}
        configData={configData}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdateTask={onUpdateTask}
        isKanbanView
        onCardClick={onCardClick}
        onShowChildTasks={onShowChildTasks}
        isRelationsLoading={isRelationsLoading}
        dragHandleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── Droppable column wrapper ─────────────────────────────────────────────────
function DroppableColumn({ statusId, children }: { statusId: number; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `status-${statusId}` });
  return (
    <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20" style={{ minHeight: '400px' }}>
      {children}
    </div>
  );
}

// ─── Drop placeholder card ────────────────────────────────────────────────────
function DropPlaceholder({ statusColor }: { statusColor?: string }) {
  const accent = statusColor || '#3b82f6';
  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-lg border border-dashed shadow-xs overflow-hidden"
      style={{ borderColor: accent, opacity: 0.65 }}
    >
      {/* Section 1 — mirrors: px-3 py-2 border-b border-dashed bg-gray-50 dark:bg-gray-900/50 */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-dashed border-border flex items-center justify-between">
        {/* Left: hierarchy icon + code */}
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        {/* Right: status badge — colored border pill */}
        <div
          className="h-5 w-16 rounded-md border"
          style={{ borderColor: accent, opacity: 0.5 }}
        />
      </div>

      {/* Section 2 — mirrors: px-3 py-2.5 space-y-2 */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Task name */}
        <div className="h-3.5 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        {/* Assignee | divider | co-assignees  ·  child-tasks button */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          {/* child-tasks button */}
          <div className="h-5 w-20 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
        </div>
      </div>

      {/* Section 3 — mirrors: px-3 py-2 border-t border-dashed bg-gray-50 dark:bg-gray-900/50 */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-dashed border-border flex items-center justify-between gap-2">
        {/* Left: severity dot + label · date range */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-5 w-20 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
        </div>
        {/* Right: comment + actions ghost buttons */}
        <div className="flex items-center gap-1">
          <div className="h-7 w-7 bg-gray-100 dark:bg-gray-700 rounded" />
          <div className="h-7 w-7 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
      </div>

      {/* Drop-here overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]"
        style={{ backgroundColor: `${accent}12` }}
      >
        <div
          className="px-4 py-1.5 rounded-lg border border-dashed font-medium text-sm"
          style={{ borderColor: accent, color: accent, backgroundColor: `${accent}15` }}
        >
          Drop here
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface TaskKanbanViewProps {
  tasks: any[];
  configData: TaskCardConfigData;
  onTaskClick?: (task: any) => void;
  onEdit?: (task: any) => void;
  onDelete?: (task: any) => void;
  onUpdateTask?: TaskUpdateHandler;
  onShowChildTasks?: (task: any) => void;
  inlineCreateCard?: React.ReactNode;
  isRelationsLoading?: boolean;
}

export default function TaskKanbanView({
  tasks,
  configData,
  onTaskClick,
  onEdit,
  onDelete,
  onUpdateTask,
  onShowChildTasks,
  inlineCreateCard,
  isRelationsLoading,
}: TaskKanbanViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [localTasks, setLocalTasks] = useState<any[]>(tasks);
  const { open: sidebarOpen } = useSidebar();

  useEffect(() => setLocalTasks(tasks), [tasks]);

  const statuses = useMemo(() => configData?.statuses || [], [configData?.statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number);

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverId(null); return; }
    const overStr = String(over.id);
    if (overStr.startsWith('status-')) {
      setOverId(parseInt(overStr.replace('status-', '')));
    } else {
      const overTask = localTasks.find((t) => t.id === over.id);
      if (overTask) setOverId(overTask.statusId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over) return;

    const activeTaskId = active.id as number;
    const activeTask = localTasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;
    const currentStatusId = activeTask.statusId;

    let targetStatusId: number | undefined;
    const overStr = String(over.id);
    if (overStr.startsWith('status-')) {
      targetStatusId = parseInt(overStr.replace('status-', ''));
    } else {
      const overTask = localTasks.find((t) => t.id === over.id);
      if (overTask) targetStatusId = overTask.statusId;
    }

    if (!targetStatusId || currentStatusId === targetStatusId) return;

    const targetStatus = statuses.find((s: any) => s.id === targetStatusId);
    if (!targetStatus) return;

    const originalTasks = [...localTasks];

    // Optimistic update
    setLocalTasks((prev) => prev.map((t) => t.id === activeTaskId ? { ...t, statusId: targetStatusId } : t));

    try {
      const { patchTaskStatus } = await import('@/services/task-management/task.service');
      const updated = await patchTaskStatus(activeTaskId, targetStatusId!);
      if (onUpdateTask) await onUpdateTask(activeTaskId, { statusId: targetStatusId }, updated);
    } catch (error) {
      console.error('Error updating task status:', error);
      setLocalTasks(originalTasks);
      alert('Failed to update task status. Changes have been reverted.');
    }
  };

  const tasksByStatus = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    statuses.forEach((s: any) => { grouped[s.id] = []; });
    localTasks.forEach((t) => {
      if (t.statusId && grouped[t.statusId] !== undefined) grouped[t.statusId].push(t);
    });
    return grouped;
  }, [localTasks, statuses]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => scrollContainerRef.current?.scrollBy({ left: -400, behavior: 'smooth' });
  const scrollRight = () => scrollContainerRef.current?.scrollBy({ left: 400, behavior: 'smooth' });

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [statuses]);

  const activeTask = useMemo(() => (activeId ? localTasks.find((t) => t.id === activeId) : null), [activeId, localTasks]);

  // Re-check scroll when sidebar opens/closes (after CSS transition)
  useEffect(() => {
    const t = setTimeout(checkScroll, 300);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  if (!statuses.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-600 text-sm italic">
        No statuses configured for this project space
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="relative flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>

        {/* ← Left scroll arrow */}
        {canScrollLeft && (
          <Button variant="outline" size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={scrollLeft}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        {/* → Right scroll arrow */}
        {canScrollRight && (
          <Button variant="outline" size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={scrollRight}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        {/* Horizontal scrollable container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden task-kanban-scroll"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style dangerouslySetInnerHTML={{ __html: '.task-kanban-scroll::-webkit-scrollbar { display: none; }' }} />
          <div className="flex h-full">
            {statuses.map((status: any, index: number) => {
              const tasksInStatus = tasksByStatus[status.id] || [];
              const isLast = index === statuses.length - 1;

              return (
                <div
                  key={status.id}
                  className="flex-shrink-0 flex flex-col h-full"
                  style={{
                    width: sidebarOpen ? 'calc(30%)' : 'calc(23%)',
                    minWidth: '320px',
                    borderRight: isLast ? 'none' : `1px dashed ${status.color}40`,
                    backgroundColor: `${status.color}15`
                  }}
                >
                  {/* Column header */}
                  <div className="px-4 py-2 flex-shrink-0" style={{ backgroundColor: `${status.color}15` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{status.name}</h3>
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {tasksInStatus.length}
                      </span>
                    </div>
                  </div>

                  {/* Column body */}
                  <SortableContext
                    id={status.id.toString()}
                    items={tasksInStatus.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn statusId={status.id}>
                      <div className="space-y-2">
                        {/* Inline create card — only in the first column */}
                        {index === 0 && inlineCreateCard && (
                          <div>{inlineCreateCard}</div>
                        )}
                        {tasksInStatus.length > 0 ? (
                          <>
                            {overId === status.id && activeId && <DropPlaceholder statusColor={status.color} />}
                            {tasksInStatus.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                configData={configData}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onUpdateTask={onUpdateTask}
                                onCardClick={onTaskClick}
                                onShowChildTasks={onShowChildTasks}
                                isRelationsLoading={isRelationsLoading}
                              />
                            ))}
                          </>
                        ) : (
                          <>
                            {overId === status.id && activeId ? (
                              <DropPlaceholder statusColor={status.color} />
                            ) : (
                              !(index === 0 && inlineCreateCard) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 italic">
                                  No tasks
                                </div>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </DroppableColumn>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId && activeTask ? (
          <div
            className="rounded-lg opacity-90 cursor-grabbing"
            style={{
              backgroundColor: statuses.find((s: any) => s.id === activeTask.statusId)?.color
                ? `${statuses.find((s: any) => s.id === activeTask.statusId)?.color}15`
                : undefined,
            }}
          >
            <TaskCard
              task={activeTask}
              configData={configData}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateTask={onUpdateTask}
              isKanbanView
              onCardClick={onTaskClick}
              onShowChildTasks={onShowChildTasks}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
