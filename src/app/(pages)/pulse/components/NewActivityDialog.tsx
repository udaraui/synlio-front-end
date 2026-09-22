"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Activity, CalendarIcon } from "lucide-react";
import { createNewActivity } from "@/services/new-activity.service";
import { syncPulseRecord } from "@/services/pulse.service";
import { toast } from "sonner";
import { format, startOfToday } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { cn } from "@/lib/utils";

interface NewActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  isDraft?: boolean;
  draftId?: number | null;
  pulseWeekEndDate?: string;
}

export const NewActivityDialog: React.FC<NewActivityDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
  isDraft,
  draftId,
  pulseWeekEndDate,
}) => {
  const defaultStart = startOfToday();
  const defaultEnd = startOfToday();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEnd);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [effortHours, setEffortHours] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(startOfToday());
    setEndDate(startOfToday());
    setEffortHours("");
  };

  /** Compute effective duration in minutes:
   *  1. If user typed an explicit effort, use that.
   *  2. Otherwise derive from start→end difference.
   */
  const computeDurationMinutes = (): number | undefined => {
    const effortVal = parseFloat(effortHours || "0");
    if (!isNaN(effortVal) && effortVal > 0) {
      return Math.round(effortVal * 60);
    }
    if (startDate && endDate) {
      const diff = endDate.getTime() - startDate.getTime();
      const mins = Math.round(diff / 60000);
      return mins > 0 ? mins : undefined;
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an activity title");
      return;
    }
    if (!startDate) {
      toast.error("Please enter a start date");
      return;
    }

    const durationMinutes = computeDurationMinutes();
    if (!durationMinutes) {
      toast.error("Please provide either an end date/time or an effort value");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createNewActivity({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        durationMinutes,
      });

      if (isDraft && draftId && response.id) {
        const pulseSummary = JSON.stringify({
          event_type: (response.postType as string) === 'Task' ? 'TASK_CREATED' : (response.postType as string) === 'Ticket' ? 'TICKET_CREATED' : 'ACTIVITY_CREATED',
          payload: {
            title: response.title,
            description: response.description,
            durationMinutes: response.durationMinutes,
            startDate: response.startDate,
            endDate: response.endDate
          },
          _changeOccurredAt: (pulseWeekEndDate && new Date(response.createdAt) > new Date(pulseWeekEndDate)) ? pulseWeekEndDate : response.createdAt
        });
        await syncPulseRecord(draftId, {
          postId: response.id,
          postName: response.title,
          postType: response.postType || 'Activity',
          pulseType: 'Synlio Activity',
          resourceType: 'ASSIGNEE',
          pulseSummary: pulseSummary,
          allocatedHours: response.durationMinutes ? (response.durationMinutes / 60) : 0
        }).catch(console.error);
      }

      toast.success("Activity logged");
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error("Failed to log the activity. Please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) {
          resetForm();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Log New Activity
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="activity-title" className="text-sm">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="activity-title"
              placeholder="e.g. Planning session, Design review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9"
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="activity-description" className="text-sm">
              Description{" "}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="activity-description"
              placeholder="Brief notes about this activity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[70px] resize-none text-sm"
              disabled={submitting}
            />
          </div>

          {/* Start / End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-sm">Start Date</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CustomDatePicker 
                    date={startDate} 
                    setDate={(d) => { 
                      setStartDate(d); 
                      if (d) setEndDate(d);
                      setStartOpen(false); 
                    }} 
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="text-sm">End Date</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CustomDatePicker 
                    date={endDate} 
                    setDate={(d) => { setEndDate(d); setEndOpen(false); }} 
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Effort override */}
          <div className="space-y-1.5">
            <Label htmlFor="activity-effort" className="text-sm">
              Effort / Duration (hours){" "}
              <span className="text-muted-foreground text-xs font-normal">
                (overrides start/end calculation)
              </span>
            </Label>
            <Input
              id="activity-effort"
              type="number"
              min={0.1}
              step="any"
              placeholder="e.g. 1.5"
              value={effortHours}
              onChange={(e) => setEffortHours(e.target.value)}
              className="h-9"
              disabled={submitting}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Log Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
