"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CardConfig, CardWidth, SaveStatus } from "@/hooks/use-dashboard-layout";
import { WIDTH_TO_COLSPAN } from "@/hooks/use-dashboard-layout";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WIDTH_STEPS: CardWidth[] = ["1/4", "1/2", "3/4", "full"];
const WIDTH_RANK: Record<CardWidth, number> = { "1/4": 0, "1/2": 1, "3/4": 2, full: 3 };

// ─────────────────────────────────────────────────────────────────────────────
// EditCard
// ─────────────────────────────────────────────────────────────────────────────

function EditCard({
  card,
  minWidth,
  onWidthChange,
  onHide,
  children,
}: {
  card: CardConfig;
  minWidth?: CardWidth;
  onWidthChange: (id: string, w: CardWidth) => void;
  onHide: (id: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const currentIdx = WIDTH_RANK[card.width];
  const minIdx     = minWidth ? WIDTH_RANK[minWidth] : 0;
  const canShrink  = currentIdx > minIdx;
  const canGrow    = currentIdx < WIDTH_STEPS.length - 1;

  const stop = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div ref={setNodeRef} style={style} className={cn(WIDTH_TO_COLSPAN[card.width], "relative")}>

      {/* Card renders exactly as in view mode — no wrapper that would break chart heights */}
      {children}

      {/* Transparent interaction blocker — sits above card content, blocks tooltips/clicks */}
      <div className="absolute inset-0 z-[5] rounded-lg" />

      {/* Gray visual overlay */}
      <div className="absolute inset-0 rounded-lg bg-muted/65 z-10 pointer-events-none" />

      {/* Control pill — grip is the only draggable element */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-lg border border-border pointer-events-auto">
          <div
            ref={setActivatorNodeRef}
            className="p-1.5 rounded-full cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            type="button"
            disabled={!canShrink}
            onPointerDown={stop}
            onClick={(e) => { e.stopPropagation(); onWidthChange(card.id, WIDTH_STEPS[currentIdx - 1]); }}
            title="Make narrower"
            className={cn("p-1.5 rounded-full transition-colors", canShrink ? "hover:bg-muted text-foreground" : "text-muted-foreground/30 cursor-not-allowed")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-semibold text-foreground min-w-[28px] text-center tabular-nums">
            {card.width}
          </span>
          <button
            type="button"
            disabled={!canGrow}
            onPointerDown={stop}
            onClick={(e) => { e.stopPropagation(); onWidthChange(card.id, WIDTH_STEPS[currentIdx + 1]); }}
            title="Make wider"
            className={cn("p-1.5 rounded-full transition-colors", canGrow ? "hover:bg-muted text-foreground" : "text-muted-foreground/30 cursor-not-allowed")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            type="button"
            onPointerDown={stop}
            onClick={(e) => { e.stopPropagation(); onHide(card.id); }}
            title="Hide card"
            className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 text-muted-foreground transition-colors"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SaveBadge
// ─────────────────────────────────────────────────────────────────────────────

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
      {status === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /><span>Saving…</span></>}
      {status === "saved"  && <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-600">Saved</span></>}
      {status === "error"  && <><AlertCircle className="h-3 w-3 text-red-500" /><span className="text-red-500">Error</span></>}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardGrid — main export
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardGridProps {
  cards: CardConfig[];
  sortedVisible: CardConfig[];
  loaded: boolean;
  saveStatus: SaveStatus;
  onReorder: (activeId: string, overId: string) => void;
  /** Preferred — accepts full reordered id array for accurate commit after live drag */
  onReorderAll?: (ids: string[]) => void;
  onWidthChange: (id: string, width: CardWidth) => void;
  onToggle: (id: string) => void;
  renderCard: (id: string) => React.ReactNode;
  minWidths?: Partial<Record<string, CardWidth>>;
  skeletonColClass?: string;
  skeletonCount?: number;
  /** Controlled — parent manages isCustomizing state */
  isCustomizing?: boolean;
}

export function DashboardGrid({
  cards,
  sortedVisible,
  loaded,
  saveStatus,
  onReorder,
  onReorderAll,
  onWidthChange,
  onToggle,
  renderCard,
  minWidths = {},
  skeletonColClass = "col-span-2",
  skeletonCount = 4,
  isCustomizing: isCustomizingProp,
}: DashboardGridProps) {
  // isCustomizing is fully controlled by the parent
  const isCustomizing = isCustomizingProp ?? false;
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState(300);
  // Local copy of visible card IDs — updated live on drag-over so cards shift in real time
  const [localIds,  setLocalIds]  = useState<string[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Keep localIds in sync whenever sortedVisible changes (but not while dragging)
  useEffect(() => {
    if (!activeId) setLocalIds(sortedVisible.map((c) => c.id));
  }, [sortedVisible, activeId]);

  const hiddenCards = cards.filter((c) => !c.visible);
  const cardMap     = new Map(cards.map((c) => [c.id, c]));
  const localCards  = localIds.map((id) => cardMap.get(id)).filter(Boolean) as CardConfig[];
  const activeCard  = activeId ? (cardMap.get(activeId) ?? null) : null;

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    if (gridRef.current) {
      const card = cardMap.get(id);
      if (card) {
        const gridW = gridRef.current.offsetWidth;
        const gap   = 12;
        const col   = (gridW - 3 * gap) / 4;
        const span  = { "1/4": 1, "1/2": 2, "3/4": 3, full: 4 } as const;
        setDragWidth(span[card.width] * col + (span[card.width] - 1) * gap);
      }
    }
  };

  // Live reorder — cards shift as you drag over them
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLocalIds((prev) => {
      const oldIdx = prev.indexOf(String(active.id));
      const newIdx = prev.indexOf(String(over.id));
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    // Commit the final localIds order to the hook
    if (onReorderAll) {
      onReorderAll(localIds);
    } else {
      // Fallback: call onReorder with active → over
      if (e.active.id !== e.over.id) {
        onReorder(String(e.active.id), String(e.over.id));
      }
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[...Array(skeletonCount)].map((_, i) => (
          <div key={i} className={skeletonColClass}>
            <div className="rounded-lg border border-border bg-muted/20 animate-pulse h-48" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      {isCustomizing ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={localIds} strategy={rectSortingStrategy}>
            <div ref={gridRef} className="grid grid-cols-4 gap-3">
              {localCards.map((card) => (
                <EditCard
                  key={card.id}
                  card={card}
                  minWidth={minWidths[card.id]}
                  onWidthChange={onWidthChange}
                  onHide={onToggle}
                >
                  {renderCard(card.id)}
                </EditCard>
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeCard && (
              <div
                style={{ width: dragWidth }}
                className="rounded-lg border border-primary/40 bg-background/90 shadow-2xl opacity-90 pointer-events-none flex items-center justify-center gap-2 py-6"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">{activeCard.label}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">({activeCard.width})</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {sortedVisible.map((card) => (
            <div key={card.id} className={WIDTH_TO_COLSPAN[card.width]}>
              {renderCard(card.id)}
            </div>
          ))}
        </div>
      )}

      {/* ── Hidden cards restore panel ────────────────────────────────── */}
      {isCustomizing && hiddenCards.length > 0 && (
        <div className="p-3 rounded-lg border border-dashed border-border bg-muted/10">
          <p className="text-[11px] font-medium mb-2 flex items-center gap-1">
            <EyeOff className="h-3.5 w-3.5" /> Hidden cards — click to restore
          </p>
          <div className="flex flex-wrap gap-2">
            {hiddenCards.map((card) => (
              <Button key={card.id} variant="outline" size="sm"
                onClick={() => onToggle(card.id)} className="h-7 text-xs gap-1.5">
                <Eye className="h-3 w-3 text-primary" /> {card.label}
              </Button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
