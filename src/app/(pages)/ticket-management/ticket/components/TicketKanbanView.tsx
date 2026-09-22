'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TicketCard from './TicketCard';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable wrapper for ticket cards
function SortableTicketCard({
  ticket,
  ticketRelations,
  getIconComponent,
  onEdit,
  onDelete,
  onUpdateTicket,
  onCardClick,
  configData,
  isRelationsLoading,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg"
    >
      <TicketCard
        ticket={ticket}
        ticketRelations={ticketRelations}
        getIconComponent={getIconComponent}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdateTicket={onUpdateTicket}
        isKanbanView={true}
        onCardClick={onCardClick}
        configData={configData}
        isRelationsLoading={isRelationsLoading}
        dragHandleProps={{
          ref: setActivatorNodeRef,
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}

// Droppable wrapper for status columns
function DroppableColumn({
  statusId,
  children,
}: {
  statusId: number;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `status-${statusId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 p-2 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20"
      style={{ minHeight: '400px' }}
    >
      {children}
    </div>
  );
}

// Placeholder card shown where the dragged card will drop
function DropPlaceholder({ statusColor }: { statusColor?: string }) {
   const accent = statusColor || '#3b82f6';
  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-lg border border-dashed shadow-xs overflow-hidden"
      style={{ borderColor: accent, opacity: 0.65 }}
    >
      {/* Section 1: Type Icon, Code and Status Tag */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-dashed border-border">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-5 w-16 rounded-md border" style={{ borderColor: accent, opacity: 0.5 }} />
      </div>

      {/* Section 2: Name, Assignee Avatar, and Participants */}
      <div className="px-3 py-2.5 space-y-2">
        <div className="h-3.5 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center -space-x-2">
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>

      {/* Section 3: Severity Tag and Action Menu */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-dashed border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
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

interface TicketKanbanViewProps {
  data: any[];
  configData: any;
  getIconComponent: (iconName: string | undefined) => LucideIcon | null;
  onEdit: (ticket: any) => void;
  onDelete: (ticket: any) => void;
  onUpdateTicket: (ticketId: number, updates: any, updatedData?: any) => Promise<void>;
  onCardClick?: (ticket: any) => void;
  isRelationsLoading?: boolean;
}

export default function TicketKanbanView({
  data,
  configData,
  getIconComponent,
  onEdit,
  onDelete,
  onUpdateTicket,
  onCardClick,
  isRelationsLoading,
}: TicketKanbanViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [localTickets, setLocalTickets] = useState<any[]>(data);
  const { open: sidebarOpen } = useSidebar();

  // Update local tickets when data changes
  useEffect(() => {
    setLocalTickets(data);
  }, [data]);


  const statuses = React.useMemo(() => configData?.statuses || [], [configData?.statuses]);

  // Sensors for drag and drop - optimized for smooth performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Minimal distance for activation
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Drag event handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    if (!over) {
      setOverId(null);
      return;
    }

    // Determine the target status ID
    const overIdString = String(over.id);

    // Check if hovering over a status column
    if (overIdString.startsWith('status-')) {
      const statusId = parseInt(overIdString.replace('status-', ''));
      setOverId(statusId);
    } else {
      // Hovering over a ticket - get that ticket's status
      const overTicket = localTickets.find((t: any) => t.id === over.id);
      if (overTicket) {
        setOverId(overTicket.status?.id);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear drag state immediately
    setActiveId(null);
    setOverId(null);

    if (!over) {
      return;
    }

    const activeTicketId = active.id as number;

    // Find the active ticket
    const activeTicketData = localTickets.find((t: any) => t.id === activeTicketId);
    const currentStatusId = activeTicketData?.status?.id;

    // Determine target status ID
    let targetStatusId: number | undefined;
    const overIdString = String(over.id);

    if (overIdString.startsWith('status-')) {
      // Dropped on a status column
      targetStatusId = parseInt(overIdString.replace('status-', ''));
    } else {
      // Dropped on another ticket
      const overTicket = localTickets.find((t: any) => t.id === over.id);
      if (overTicket) {
        targetStatusId = overTicket.status?.id;
      }
    }

    if (!targetStatusId || currentStatusId === targetStatusId) {
      return;
    }

    // Find the target status object
    const targetStatus = statuses.find((s: any) => s.id === targetStatusId);
    if (!targetStatus) {
      return;
    }

    // Store original state for rollback
    const originalTickets = localTickets;

    // Optimistic update: Move ticket to new column immediately
    setLocalTickets(prev => prev.map(t =>
      t.id === activeTicketId ? { ...t, status: targetStatus, statusId: targetStatusId } : t
    ));

    try {
      // Call API to update status
      const { patchTicketStatus } = await import('@/services/ticket-management/ticket.service');
      const updatedTicket = await patchTicketStatus(activeTicketId, targetStatusId);

      // Update parent component with API response data
      await onUpdateTicket(activeTicketId, { statusId: targetStatusId }, updatedTicket);
    } catch (error) {
      console.error('Error updating ticket status:', error);

      // Rollback: Restore original state on error
      setLocalTickets(originalTickets);

      // Show error message to user
      alert('Failed to update ticket status. Changes have been reverted.');
    }
  };

  // Group tickets by status
  const ticketsByStatus = React.useMemo(() => {
    const grouped: Record<number, any[]> = {};

    // Initialize groups for all statuses
    statuses.forEach((status: any) => {
      grouped[status.id] = [];
    });

    // Group tickets by their status using ticket.status for optimistic updates
    localTickets.forEach((ticket) => {
      const status = ticket.status;
      if (status && grouped[status.id]) {
        grouped[status.id].push(ticket);
      }
    });

    return grouped;
  }, [localTickets, statuses]);

  // Check scroll position
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  // Check scroll on mount and when statuses change
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
  }, [statuses, checkScroll]);

  // Re-check scroll when sidebar opens/closes (after CSS transition)
  useEffect(() => {
    const t = setTimeout(checkScroll, 300);
    return () => clearTimeout(t);
  }, [sidebarOpen]);

  // Get the active ticket for drag overlay
  const activeTicket = useMemo(() =>
    activeId ? localTickets.find((t: any) => t.id === activeId) : null,
    [activeId, localTickets]
  );


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Left Scroll Arrow */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Right Scroll Arrow */}
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={scrollRight}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}

      {/* Horizontal scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden kanban-scroll"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          .kanban-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex h-full">
          {statuses.map((status: any, index: number) => {
            const ticketsInStatus = ticketsByStatus[status.id] || [];
            const isLast = index === statuses.length - 1;

            return (
              <div
                key={status.id}
                className="flex-shrink-0 flex flex-col h-full"
                style={{
                  width: sidebarOpen ? 'calc(30%)' : 'calc(23%)',
                  minWidth: '320px',
                  borderRight: isLast ? 'none' : `1px dashed ${status.color}40`,
                }}
              >
                {/* Column Header */}
                <div
                  className="px-4 py-2 flex-shrink-0"
                  style={{
                    backgroundColor: `${status.color}15`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {status.name}
                      </h3>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {ticketsInStatus.length}
                    </span>
                  </div>
                </div>

                {/* Column Body - Scrollable */}
                <SortableContext
                  id={status.id.toString()}
                  items={ticketsInStatus.map((t: any) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn statusId={status.id}>
                    {/* Ticket Cards */}
                    {ticketsInStatus.length > 0 ? (
                      <div className="space-y-2">
                        {/* Show placeholder at the top if hovering over this column */}
                        {overId === status.id && activeId && (
                          <DropPlaceholder statusColor={status.color} />
                        )}
                        {ticketsInStatus.map((ticket: any) => (
                            <SortableTicketCard
                              key={ticket.id}
                              ticket={ticket}
                              ticketRelations={ticket}
                              getIconComponent={getIconComponent}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onUpdateTicket={onUpdateTicket}
                              onCardClick={onCardClick}
                              configData={configData}
                              isRelationsLoading={isRelationsLoading}
                            />
                          ))}
                      </div>
                    ) : (
                      <>
                        {/* Show placeholder in empty column if hovering */}
                        {overId === status.id && activeId ? (
                          <DropPlaceholder statusColor={status.color} />
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 italic">
                            No tickets
                          </div>
                        )}
                      </>
                    )}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Drag Overlay */}
    <DragOverlay>
      {activeId && activeTicket ? (
        <div
          style={{
            backgroundColor: activeTicket?.status?.color
              ? `${activeTicket.status.color}15`
              : undefined,
          }}
          className="rounded-lg opacity-90 cursor-grabbing"
        >
          <TicketCard
            ticket={activeTicket}
            ticketRelations={activeTicket}
            getIconComponent={getIconComponent}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateTicket={onUpdateTicket}
            isKanbanView={true}
            onCardClick={onCardClick}
            configData={configData}
          />
        </div>
      ) : null}
    </DragOverlay>
  </DndContext>
  );
}

