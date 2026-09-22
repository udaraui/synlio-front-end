"use client";

import { useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Loader2, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreadcrumbsEffect } from "@/hooks/useBreadcrumbsEffect";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import TicketAnalytics from "./components/TicketAnalytics";
import ProjectAnalytics from "./components/ProjectAnalytics";
import ResourceAnalytics from "./components/ResourceAnalytics";

type TabKey = "ticket" | "project" | "resource";

export default function SyanalyticsPage() {
  useBreadcrumbsEffect([
    { label: "Synalytics", isCurrentPage: true },
  ]);

  const [activeTab, setActiveTab] = useState<TabKey>("project");
  const [customizing, setCustomizing] = useState<Record<TabKey, boolean>>({
    ticket: false, project: false, resource: false,
  });

  const isCustomizing = customizing[activeTab];
  const setIsCustomizing = (v: boolean) =>
    setCustomizing((prev) => ({ ...prev, [activeTab]: v }));

  // Holds the resetToDefault fn registered by each analytics tab on mount
  const resetFns = useRef<Record<TabKey, (() => void)>>({
    ticket: () => {}, project: () => {}, resource: () => {},
  });

  // Save status bubbled up from the active tab's useDashboardLayout
  const [saveStatuses, setSaveStatuses] = useState<Record<TabKey, string>>({
    ticket: "idle", project: "idle", resource: "idle",
  });
  const saveStatus = saveStatuses[activeTab];

  return (
    <div className="p-4 pt-10 flex flex-col h-full overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="w-full flex flex-col flex-1 min-h-0 gap-0"
      >
        <TabsList className="bg-transparent p-0 h-auto border-b rounded-none gap-0 w-full justify-start flex-shrink-0 flex">
          <TabsTrigger
              value="project"
              className="group rounded-none bg-transparent pl-4 pr-4 py-2.5 text-sm font-medium text-muted-foreground border-b-1 border-transparent data-[state=active]:border-primary data-[state=active]:!text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors justify-start"
          >
            Project<span className="hidden group-data-[state=active]:inline"> Synalytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="ticket"
            className="group rounded-none bg-transparent pl-4 pr-4 py-2.5 text-sm font-medium text-muted-foreground border-b-1 border-transparent data-[state=active]:border-primary data-[state=active]:!text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors justify-start"
          >
            Ticket<span className="hidden group-data-[state=active]:inline"> Synalytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="resource"
            className="group rounded-none bg-transparent pl-4 pr-4 py-2.5 text-sm font-medium text-muted-foreground border-b-1 border-transparent data-[state=active]:border-primary data-[state=active]:!text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors justify-start"
          >
            Resource<span className="hidden group-data-[state=active]:inline"> Synalytics</span>
          </TabsTrigger>

          {/* Customize toggle — pushed to the far right of the tab row */}
          {/*<div className="ml-auto flex items-center gap-2 pr-2 self-center">*/}
          {/*  {saveStatus === "saving" && (*/}
          {/*    <span className="flex items-center gap-1 text-xs text-muted-foreground">*/}
          {/*      <Loader2 className="h-3 w-3 animate-spin" /> Saving…*/}
          {/*    </span>*/}
          {/*  )}*/}
          {/*  {saveStatus === "saved" && (*/}
          {/*    <span className="flex items-center gap-1 text-xs text-green-600">*/}
          {/*      <CheckCircle2 className="h-3 w-3" /> Saved*/}
          {/*    </span>*/}
          {/*  )}*/}
          {/*  {saveStatus === "error" && (*/}
          {/*    <span className="flex items-center gap-1 text-xs text-red-500">*/}
          {/*      <AlertCircle className="h-3 w-3" /> Error*/}
          {/*    </span>*/}
          {/*  )}*/}
          {/*  {isCustomizing ? (*/}
          {/*    <div className="flex items-center rounded-md border border-border overflow-hidden shadow-sm">*/}
          {/*      <Button variant="ghost" size="sm"*/}
          {/*        onClick={() => resetFns.current[activeTab]()}*/}
          {/*        className="h-7 rounded-none border-r border-border px-3 text-xs gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">*/}
          {/*        <RotateCcw className="h-3 w-3" /> Reset*/}
          {/*      </Button>*/}
          {/*      <Button variant="ghost" size="sm"*/}
          {/*        onClick={() => setIsCustomizing(false)}*/}
          {/*        className="h-7 rounded-none px-3 text-xs gap-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">*/}
          {/*        <Check className="h-3 w-3" /> Done*/}
          {/*      </Button>*/}
          {/*    </div>*/}
          {/*  ) : (*/}
          {/*    <Button variant="outline" size="sm" onClick={() => setIsCustomizing(true)}*/}
          {/*      className="h-7 w-7 p-0 bg-white dark:bg-gray-800 border-border hover:bg-gray-50 dark:hover:bg-gray-700">*/}
          {/*      <Settings2 className="h-4 w-4" />*/}
          {/*    </Button>*/}
          {/*  )}*/}
          {/*</div>*/}
        </TabsList>

        <TabsContent value="ticket" className="flex-1 overflow-y-auto mt-0 min-h-0">
          <TicketAnalytics
            isCustomizing={customizing.ticket}
            onCustomizingChange={(v) => setCustomizing((p) => ({ ...p, ticket: v }))}
            onResetRegister={(fn) => { resetFns.current.ticket = fn; }}
            onSaveStatusChange={(s) => setSaveStatuses((p) => ({ ...p, ticket: s }))}
          />
        </TabsContent>

        <TabsContent value="project" className="flex-1 overflow-y-auto mt-0 min-h-0">
          <ProjectAnalytics
            isCustomizing={customizing.project}
            onCustomizingChange={(v) => setCustomizing((p) => ({ ...p, project: v }))}
            onResetRegister={(fn) => { resetFns.current.project = fn; }}
            onSaveStatusChange={(s) => setSaveStatuses((p) => ({ ...p, project: s }))}
          />
        </TabsContent>

        <TabsContent value="resource" className="flex-1 overflow-y-auto mt-0 min-h-0">
          <ResourceAnalytics
            isCustomizing={customizing.resource}
            onCustomizingChange={(v) => setCustomizing((p) => ({ ...p, resource: v }))}
            onResetRegister={(fn) => { resetFns.current.resource = fn; }}
            onSaveStatusChange={(s) => setSaveStatuses((p) => ({ ...p, resource: s }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
