"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, RotateCcw, Layers, Folder, CheckSquare, Ticket } from "lucide-react";
import { CopilotChatView } from "./CopilotChatView";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CopilotContext {
  companyId?: number;
  resourceGroupId?: number | string;
  resourceGroupName?: string;
  taskSpaceId?: number | string;
  taskSpaceName?: string;
  parentTaskId?: number | string;
  parentTaskName?: string;
  ticketSpaceId?: number | string;
  ticketSpaceName?: string;
  [key: string]: any;
}

export interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agent: "resource_analytics" | "project_analytics" | "ticket_analytics";
  context?: CopilotContext;
  pageScopeKey?: string;
  pageTitle?: string;
}

export function CopilotDrawer({
  isOpen,
  onClose,
  agent,
  context = {},
  pageScopeKey = "default",
  pageTitle,
}: CopilotDrawerProps) {
  // Compute default 1/3 screen width
  const getDefaultWidth = () => {
    if (typeof window === "undefined") return 460;
    const oneThird = Math.round(window.innerWidth / 3);
    return Math.max(380, Math.min(640, oneThird));
  };

  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("synlio_copilot_drawer_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 360 && parsed <= window.innerWidth * 0.85) {
          return parsed;
        }
      }
      return getDefaultWidth();
    }
    return 460;
  });

  const [conversationId, setConversationId] = useState<string>(() => {
    return `scope_${pageScopeKey}_${Date.now()}`;
  });

  // Whenever the page scope changes (e.g. user opens drawer for a different resource group), update the conversationId
  useEffect(() => {
    setConversationId(`scope_${pageScopeKey}_${Date.now()}`);
  }, [pageScopeKey]);

  const handleResetConversation = () => {
    setConversationId(`scope_${pageScopeKey}_${Date.now()}`);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle resizing drag
  const isDraggingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const minW = 360;
      const maxW = Math.round(window.innerWidth * 0.85);
      const newWidth = Math.max(minW, Math.min(maxW, window.innerWidth - moveEvent.clientX));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        setWidth((currentWidth) => {
          try {
            localStorage.setItem("synlio_copilot_drawer_width", String(currentWidth));
          } catch (e) { }
          return currentWidth;
        });
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  if (!isOpen) return null;

  // Extract contextual badges to show at the top
  const badges: { label: string; value: string; icon: React.ReactNode }[] = [];

  if (context.resourceGroupName) {
    badges.push({ label: "Pool", value: context.resourceGroupName, icon: <Layers className="w-3 h-3" /> });
  } else if (context.resourceGroupId) {
    badges.push({ label: "Pool ID", value: String(context.resourceGroupId), icon: <Layers className="w-3 h-3" /> });
  }

  if (context.taskSpaceName) {
    badges.push({ label: "Space", value: context.taskSpaceName, icon: <Folder className="w-3 h-3" /> });
  } else if (context.taskSpaceId) {
    badges.push({ label: "Space ID", value: String(context.taskSpaceId), icon: <Folder className="w-3 h-3" /> });
  }

  if (context.parentTaskName) {
    badges.push({ label: "Parent", value: context.parentTaskName, icon: <CheckSquare className="w-3 h-3" /> });
  } else if (context.parentTaskId) {
    badges.push({ label: "Parent ID", value: String(context.parentTaskId), icon: <CheckSquare className="w-3 h-3" /> });
  }

  if (context.ticketSpaceName) {
    badges.push({ label: "Ticket Space", value: context.ticketSpaceName, icon: <Ticket className="w-3 h-3" /> });
  } else if (context.ticketSpaceId) {
    badges.push({ label: "Space ID", value: String(context.ticketSpaceId), icon: <Ticket className="w-3 h-3" /> });
  }

  const agentLabel =
    agent === "resource_analytics"
      ? "Resource Analyst"
      : agent === "project_analytics"
        ? "Project Analyst"
        : agent === "ticket_analytics"
          ? "Ticket Analyst"
          : "Analyst";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel from the Right */}
      <aside
        style={{ width: `${width}px` }}
        className="fixed inset-y-0 right-0 max-w-[85vw] h-full bg-background border-l border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Resizable Left Edge Drag Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute left-0 top-0 bottom-0 w-2.5 -ml-1.5 cursor-ew-resize transition-colors z-20 flex items-center justify-center group"
          title="Drag to resize panel"
        >
          {/* 1px thin drag indicator line */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-transparent group-active:bg-primary transition-colors pointer-events-none" />
          <div className="w-px h-8 bg-muted-foreground/30 rounded-full group-hover:bg-primary group-active:bg-primary group-hover:h-12 transition-all z-10" />
        </div>

        {/* Panel Header */}
        <div className="px-4 pt-5 pb-4 border-b border-border bg-muted/20 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList className="select-none">
                <BreadcrumbItem>
                  <span className="inline-flex items-center">
                    <Sparkles className="size-4 text-primary" strokeWidth={2} />
                  </span>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <span className="text-muted-foreground font-normal">Co-Pilot</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold">
                    {agentLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetConversation}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg transition-colors"
                      aria-label="Start new chat"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Start new chat
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg transition-colors"
                      aria-label="Close Co-Pilot"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Close
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Panel Content (Common Chat Component) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <CopilotChatView
            key={conversationId}
            mode="panel"
            agent={agent}
            context={context}
            pageTitle={pageTitle || (badges[0] ? badges[0].value : undefined)}
            conversationId={conversationId}
            onResetThread={handleResetConversation}
            onClose={onClose}
          />
        </div>
      </aside>
    </div>
  );
}
