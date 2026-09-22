"use client";

import React from "react";
import {
  Settings2,
  GripVertical,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { CardConfig, CardWidth, SaveStatus } from "@/hooks/use-dashboard-layout";

// ── Width selector options ────────────────────────────────────────────────────

const WIDTH_OPTIONS: { value: CardWidth; label: string; title: string }[] = [
  { value: '1/4',  label: '1/4',  title: 'Quarter width'    },
  { value: '1/2',  label: '1/2',  title: 'Half width'       },
  { value: '3/4',  label: '3/4',  title: 'Three-quarter width' },
  { value: 'full', label: 'Full', title: 'Full row width'   },
];

// ── Width selector component ──────────────────────────────────────────────────

function WidthSelector({
  value,
  onChange,
  disabled,
}: {
  value: CardWidth;
  onChange: (w: CardWidth) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5 flex-shrink-0">
      {WIDTH_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium transition-all select-none",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-40 cursor-not-allowed",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Sortable card row inside the panel ────────────────────────────────────────

function SortableCardRow({
  card,
  visibleCount,
  onToggle,
  onWidthChange,
}: {
  card: CardConfig;
  visibleCount: number;
  onToggle: (id: string) => void;
  onWidthChange: (id: string, w: CardWidth) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isLastVisible = card.visible && visibleCount <= 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-background transition-colors",
        !card.visible && "opacity-60",
        isDragging && "shadow-lg",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Label */}
      <span
        className={cn(
          "flex-1 text-xs font-medium select-none truncate",
          !card.visible ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {card.label}
      </span>

      {/* Width selector — only shown when visible */}
      {card.visible && (
        <WidthSelector
          value={card.width}
          onChange={(w) => onWidthChange(card.id, w)}
        />
      )}

      {/* Hidden badge when not visible */}
      {!card.visible && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <EyeOff className="h-3 w-3" />
          Hidden
        </span>
      )}

      {/* Visibility toggle */}
      <Switch
        checked={card.visible}
        onCheckedChange={() => onToggle(card.id)}
        disabled={isLastVisible}
        aria-label={`Toggle ${card.label}`}
        className="flex-shrink-0"
      />
    </div>
  );
}

// ── Save status badge ─────────────────────────────────────────────────────────

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className="flex items-center gap-1 text-xs flex-shrink-0">
      {status === 'saving' && (
        <><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /><span className="text-muted-foreground">Saving…</span></>
      )}
      {status === 'saved' && (
        <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-600 dark:text-green-400">Saved</span></>
      )}
      {status === 'error' && (
        <><AlertCircle className="h-3 w-3 text-red-500" /><span className="text-red-600 dark:text-red-400">Error</span></>
      )}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface DashboardCustomizerProps {
  cards: CardConfig[];
  saveStatus: SaveStatus;
  onToggle: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onWidthChange: (id: string, width: CardWidth) => void;
  onReset: () => void;
  title?: string;
}

export function DashboardCustomizer({
  cards,
  saveStatus,
  onToggle,
  onReorder,
  onWidthChange,
  onReset,
  title = "Customize Dashboard",
}: DashboardCustomizerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleCount = cards.filter((c) => c.visible).length;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted border border-border transition-all"
          title={title}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {/*<span>Customize</span>*/}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between pr-6">
            <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
            <SaveBadge status={saveStatus} />
          </div>
          <SheetDescription className="text-xs text-muted-foreground leading-relaxed">
            Drag <span className="font-medium text-foreground">≡</span> to reorder · Set width with{" "}
            <span className="font-mono text-foreground">1/4 1/2 3/4 Full</span> · Toggle to show/hide · Auto-saved
          </SheetDescription>
        </SheetHeader>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {cards.map((card) => (
                  <SortableCardRow
                    key={card.id}
                    card={card}
                    visibleCount={visibleCount}
                    onToggle={onToggle}
                    onWidthChange={onWidthChange}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex-shrink-0 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5"
            onClick={onReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default Layout
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            {visibleCount} of {cards.length} cards visible · Changes saved per user
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

