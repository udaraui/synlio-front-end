import React from 'react';
import { Button } from "@/components/ui/button";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { PulseWeek } from "@/app/(pages)/pulse/components/PulseHistory";

interface PulseHeaderProps {
  user: any;
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
  needsAttentionData: any[];
  synlioActivityData: any[];
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  snapshotCount: number;
  historyData: PulseWeek[];
  isButtonDisabled?: boolean;
  historyInnerTab?: 'submissions' | 'approvals';
}

const PulseHeader: React.FC<PulseHeaderProps> = ({
  user,
  dateRange,
  needsAttentionData,
  synlioActivityData,
  loading,
  activeTab,
  setActiveTab,
  snapshotCount,
  historyInnerTab,
}) => {
  const dateLabel = dateRange?.from
    ? dateRange.to
      ? <div className="flex items-center gap-1">Week of {format(dateRange.from, "MMM d")} <ArrowRight className="w-3 h-3" /> {format(dateRange.to, "MMM d, yyyy")}</div>
      : format(dateRange.from, "MMM d, yyyy")
    : "Date Range";

  const allSpaces = [...needsAttentionData, ...synlioActivityData].map(item => item.spaceName).filter(Boolean);
  const uniqueSpaces = [...new Set(allSpaces)];

  return (
    <div className="flex flex-col gap-1 px-8 pt-10 pr-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-background border border-border rounded-sm p-0.5 shrink-0">
            <Button
              size="sm"
              className="h-6 text-xs px-2.5"
              variant={activeTab === "current" ? "default" : "ghost"}
              onClick={() => setActiveTab("current")}
            >
              My Pulse
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs px-2.5"
              variant={activeTab === "history" ? "default" : "ghost"}
              onClick={() => setActiveTab("history")}
            >
              Approvals
            </Button>
          </div>
          {activeTab !== "history" && (
            <>
              <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600 mx-0.5" />
              <div className={`h-7 text-xs font-semibold px-2 gap-1.5 flex items-center rounded-sm border`}>
                <CalendarIcon className="w-3 h-3" /><span>{dateLabel}</span>
              </div>
            </>
          )}
        </div>
        </div>
      <div className="pt-2 text-xl px-1 font-semibold gap-3 flex items-center">
        <span>
          {user?.first_name} {user?.last_name}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          Pulse
        </span>
      </div>
      <div className="pb-3 text-sm px-1 text-muted-foreground">
        {activeTab === 'history'
          ? `${snapshotCount} weekly snapshots${historyInnerTab ? (historyInnerTab === 'submissions' ? ' in my submissions' : ' to review and approve') : ''}` 
          : `${loading ? '...' : uniqueSpaces.length > 0 ? uniqueSpaces.join(', ') : 'No Activity'}`}
      </div>
    </div>
  );
};

export default PulseHeader;