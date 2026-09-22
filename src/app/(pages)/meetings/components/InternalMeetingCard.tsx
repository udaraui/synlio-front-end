"use client";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus } from "lucide-react";
import { NewInternalMeetingDialog } from "./NewInternalMeetingDialog";

interface InternalMeetingCardProps {
  onMeetingCreated?: () => void;
}

export const InternalMeetingCard: React.FC<InternalMeetingCardProps> = ({
  onMeetingCreated,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div
        className={`
          relative flex flex-col gap-3 rounded-xl border p-4 
          border-violet-200/60 dark:border-violet-800/40
          bg-gradient-to-br from-violet-50/60 to-indigo-50/40
          dark:from-violet-950/30 dark:to-indigo-950/20
          shadow-sm hover:shadow-md transition-shadow
        `}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Logo */}
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-xs font-bold tracking-tight">IM</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Internal Meetings</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                Schedule meetings with your team
              </p>
            </div>
          </div>

          {/* Status badge */}
          <Badge className="text-[10px] shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
            Integrated
          </Badge>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 mt-auto">
          <Button
            size="sm"
            className="flex-1 text-xs h-8 gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0 shadow-sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Meeting
          </Button>
        </div>
      </div>

      <NewInternalMeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={onMeetingCreated}
      />
    </>
  );
};
