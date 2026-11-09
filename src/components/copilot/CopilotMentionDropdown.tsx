import React, { useEffect, useRef } from "react";
import { Ticket, CheckSquare, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHierarchyLevelIcon } from "@/enums/space-configure-icon.enum";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export interface MentionCandidate {
  id: number | string;
  code: string;
  title: string;
  type: "task" | "ticket" | "project";
  hierarchyIcon?: string;
  hierarchyColor?: string;
}

// In-memory cache of tasks/tickets seen across the frontend session
const sessionMentionCache = new Map<string, MentionCandidate>();

export const cacheMentionItems = (items: any[], defaultType?: "task" | "ticket" | "project") => {
  if (!Array.isArray(items)) return;
  items.forEach((item) => {
    if (!item?.code) return;
    const code = String(item.code).trim().toUpperCase();
    const title = String(item.name || item.title || "").trim();
    const isProject =
      defaultType === "project" ||
      item.type === "project" ||
      item.isProject ||
      Boolean(item.hierarchyLevel?.name?.toLowerCase() === "project") ||
      Boolean(item.hierarchyLevelName?.toLowerCase() === "project") ||
      /-P\d+$/.test(code);

    const type = defaultType || (isProject ? "project" : item.type || (/-P\d+/.test(code) ? "task" : "ticket"));
    const hierarchyIcon = item.hierarchyLevelIcon || item.hierarchyLevelConfig?.icon || item.icon;
    const hierarchyColor = item.hierarchyLevelColor || item.hierarchyLevelConfig?.color || item.color;

    sessionMentionCache.set(code, {
      id: item.id || code,
      code,
      title,
      type,
      hierarchyIcon,
      hierarchyColor,
    });

    if (Array.isArray(item.childTasks)) cacheMentionItems(item.childTasks, "task");
    if (Array.isArray(item.subtasks)) cacheMentionItems(item.subtasks, "task");
    if (Array.isArray(item.children)) cacheMentionItems(item.children, "task");
  });
};

export const getCachedMentionItems = (): MentionCandidate[] => {
  return Array.from(sessionMentionCache.values());
};

interface CopilotMentionDropdownProps {
  items: MentionCandidate[];
  selectedIndex: number;
  onSelect: (item: MentionCandidate) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export function CopilotMentionDropdown({
  items,
  selectedIndex,
  onSelect,
  onClose,
  style,
}: CopilotMentionDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    // index 0 is header, items start at child index 1
    const activeEl = listRef.current.children[selectedIndex + 1] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        style={style}
        className="absolute bottom-full mb-2 z-[100] w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-border bg-popover/95 backdrop-blur-md p-3 shadow-xl animate-in fade-in-50 zoom-in-95 pointer-events-auto"
      >
        <p className="text-xs text-muted-foreground text-center">
          No tasks or tickets currently loaded in view.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={style}
      className="absolute bottom-full mb-2 z-[100] w-[380px] max-w-[calc(100vw-32px)] max-h-64 overflow-y-auto rounded-md border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 [scrollbar-width:thin] pointer-events-auto"
    >
      <div ref={listRef} className="flex flex-col">
        {/* <div className="px-2 py-1 text-xs text-muted-foreground flex items-center justify-between select-none border-b border-border/50 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Suggested Mentions</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <KbdGroup>
              <Kbd>Tab</Kbd>
              <span className="text-[10px] text-muted-foreground/70 px-0.5">or</span>
              <Kbd>Enter</Kbd>
            </KbdGroup>
            <span className="text-[10px]">to select</span>
          </div>
        </div> */}

        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const isTicket = item.type === "ticket";
          const isProject = item.type === "project";

          // Match Table View icon & colors exactly
          const IconComp = item.hierarchyIcon
            ? getHierarchyLevelIcon(item.hierarchyIcon)
            : isTicket
            ? Ticket
            : isProject
            ? Folder
            : CheckSquare;

          const hlColor =
            item.hierarchyColor ||
            (isTicket ? "#3B82F6" : isProject ? "#F59E0B" : "#10B981");

          return (
            <button
              key={`${item.type}-${item.code}-${idx}`}
              type="button"
              onMouseDown={(e) => {
                // Prevent losing focus on textarea
                e.preventDefault();
                onSelect(item);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-left text-xs transition-colors cursor-pointer select-none",
                isSelected
                  ? "bg-primary/10 font-medium"
                  : "hover:bg-muted/70"
              )}
            >
              {/* Hierarchy Icon matching Table View */}
              <span className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                <IconComp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: hlColor }} />
              </span>

              {/* Code matching Table View (bold blue text, no pill border) */}
              <span className="text-xs font-semibold tracking-wide flex-shrink-0 text-blue-500 dark:text-blue-400">
                {item.code}
              </span>

              {/* Title matching Table View (plain normal text) */}
              <span className="truncate flex-1 text-xs text-foreground font-normal">
                {item.title || <span className="italic text-muted-foreground">Untitled</span>}
              </span>

              {/* Subtle entity type label */}
              {/* <span className="text-[10px] text-muted-foreground/70 shrink-0 uppercase tracking-wider font-medium">
                {item.type}
              </span> */}
            </button>
          );
        })}
      </div>
    </div>
  );
}
