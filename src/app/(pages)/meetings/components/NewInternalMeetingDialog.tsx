"use client";
import React, { useState, useEffect, useMemo } from "react";
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
import { Loader2, Plus, Save } from "lucide-react";
import {
  createInternalMeeting,
  updateInternalMeeting,
  type Meeting,
} from "@/services/common/meetings-integration.service";
import { syncPulseRecord } from "@/services/pulse/pulse.service";
import { getCompanyUsers } from "@/services/user-management/user-service";
import { toast } from "sonner";
import { format, addHours, startOfHour } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth.context";

interface CompanyUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

interface NewInternalMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  isDraft?: boolean;
  draftId?: number | null;
  /**
   * When provided the dialog edits this meeting instead of creating a new one.
   * Only manually created internal meetings can be passed here.
   */
  meeting?: Meeting | null;
}

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

// Convert a 24h "HH:mm" string to a 12h display string like "2:30 PM"
const to12Hour = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
};

const TimePickerInput = ({
  value,
  onChange,
  disabled,
  use24Hour,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  use24Hour: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const displayValue = use24Hour ? value : to12Hour(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The trigger owns opening/closing. Adding our own onFocus/onClick here
          would fight its toggle — focus would open the popover and the toggle
          would immediately close it again on the same click. */}
      <PopoverTrigger asChild>
        <div className={cn("relative", disabled && "pointer-events-none")}>
          <Input
            value={displayValue}
            readOnly
            disabled={disabled}
            className="w-[100px] h-9 text-sm px-2 cursor-pointer shadow-none hover:bg-accent hover:text-accent-foreground"
            placeholder={use24Hour ? "HH:mm" : "hh:mm AM"}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[100px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        // The popover sits inside the dialog's own scroll container; without
        // this the wheel event is captured before it reaches the list below.
        onWheel={(e) => e.stopPropagation()}
      >
        {/* A native overflow container so the wheel scrolls the list directly,
            rather than only the scrollbar being draggable. */}
        <div className="h-[200px] w-full overflow-y-auto overscroll-contain">
          <div className="flex flex-col p-1">
            {TIME_OPTIONS.map((time) => (
              <Button
                key={time}
                type="button"
                variant="ghost"
                className="justify-start font-normal text-sm px-2 py-1 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(time);
                  setOpen(false);
                }}
              >
                {use24Hour ? time : to12Hour(time)}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const TimeFormatToggle = ({
  use24Hour,
  onChange,
}: {
  use24Hour: boolean;
  onChange: (v: boolean) => void;
}) => {
  return (
    <div className="inline-flex items-center rounded-md border bg-muted/30 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "px-2 py-0.5 rounded-sm font-medium transition-colors",
          !use24Hour ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        12h
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "px-2 py-0.5 rounded-sm font-medium transition-colors",
          use24Hour ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        24h
      </button>
    </div>
  );
};

export const NewInternalMeetingDialog: React.FC<NewInternalMeetingDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
  isDraft,
  draftId,
  meeting,
}) => {
  const { user } = useAuth();
  const isEditMode = !!meeting;
  const defaultStart = startOfHour(addHours(new Date(), 1));
  const defaultEnd = addHours(defaultStart, 1);
  const toTimeString = (d: Date) => format(d, "HH:mm");

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [startTimeStr, setStartTimeStr] = useState(toTimeString(defaultStart));
  const [endDate, setEndDate] = useState<Date | undefined>(defaultEnd);
  const [endTimeStr, setEndTimeStr] = useState(toTimeString(defaultEnd));
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [use24Hour, setUse24Hour] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendeesOpen, setAttendeesOpen] = useState(false);

  const handleStartTimeChange = (newTime: string) => {
    setStartTimeStr(newTime);
    // Auto-advance end time by 1 hour
    const match = newTime.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      h = (h + 1) % 24;
      setEndTimeStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  };

  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    getCompanyUsers()
      .then((users) => {
        // Map from the /user/search response shape
        const mapped: CompanyUser[] = (users ?? [])
          .filter((u: any) => u.id !== user?.id)
          .map((u: any) => ({
            id: u.id,
            first_name: u.first_name ?? "",
            last_name: u.last_name ?? "",
            email: u.email ?? "",
            profile_picture: u.profile_picture ?? "",
          }));
        setCompanyUsers(mapped);
      })
      .catch(() => toast.error("Failed to load company users"))
      .finally(() => setLoadingUsers(false));
  }, [open, user?.id]);

  // Prefill the form when the dialog opens on an existing meeting.
  useEffect(() => {
    if (!open || !meeting) return;

    const start = new Date(meeting.scheduledStartTime);
    const end = meeting.scheduledEndTime ? new Date(meeting.scheduledEndTime) : null;

    setTitle(meeting.title ?? "");
    setStartDate(start);
    setStartTimeStr(toTimeString(start));
    setEndDate(end ?? start);
    setEndTimeStr(toTimeString(end ?? addHours(start, 1)));
    setLocation(meeting.joinUrl ?? "");
    setDescription("");
    setSearch("");
    setSelectedIds(
      new Set(
        (meeting.attendees ?? [])
          .map((a) => a.userId)
          .filter((id): id is number => typeof id === "number"),
      ),
    );
    // `meeting` is the identity of what we're editing — re-prefill if it changes.
  }, [open, meeting]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return companyUsers;
    return companyUsers.filter(
      (u) =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [companyUsers, search]);

  const toggleUser = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    const s = startOfHour(addHours(new Date(), 1));
    const e = addHours(s, 1);
    setTitle("");
    setStartDate(s);
    setStartTimeStr(toTimeString(s));
    setEndDate(e);
    setEndTimeStr(toTimeString(e));
    setLocation("");
    setDescription("");
    setSearch("");
    setSelectedIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Please enter a meeting title"); return; }
    if (!startDate || !startTimeStr) { toast.error("Please enter a start date and time"); return; }

    // Construct ISO strings
    const startDateTime = new Date(startDate);
    const [sH, sM] = startTimeStr.split(':').map(Number);
    startDateTime.setHours(sH, sM, 0, 0);

    let endDateTimeStr: string | undefined;
    if (endDate && endTimeStr) {
      const endDateTime = new Date(endDate);
      const [eH, eM] = endTimeStr.split(':').map(Number);
      endDateTime.setHours(eH, eM, 0, 0);
      endDateTimeStr = endDateTime.toISOString();
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTimeStr,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        attendeeUserIds: [...selectedIds],
      };

      if (isEditMode && meeting) {
        await updateInternalMeeting(meeting.id, payload);
        toast.success("Meeting updated");
        resetForm();
        onOpenChange(false);
        onCreated?.();
        return;
      }

      const response = await createInternalMeeting(payload);

      if (isDraft && draftId && response.id) {
        const pulseSummary = JSON.stringify({
          title: response.title,
          provider: response.provider,
          scheduledStartTime: response.scheduledStartTime,
          scheduledEndTime: response.scheduledEndTime,
          durationMinutes: response.durationMinutes,
          attendees: response.attendees || []
        });
        await syncPulseRecord(draftId, {
          postId: response.id,
          postCode: response.provider,
          postName: response.title,
          postType: 'Meeting',
          pulseType: 'Meeting Time',
          resourceType: 'ASSIGNEE',
          pulseSummary: pulseSummary,
          allocatedHours: response.durationMinutes ? (response.durationMinutes / 60) : 0
        }).catch(console.error);
      }

      toast.success("Internal meeting scheduled");
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      // The API rejects edits to meetings that already started — surface that
      // reason rather than a generic failure message.
      const apiMessage = err?.response?.data?.message;
      toast.error(
        (typeof apiMessage === "string" && apiMessage) ||
        (isEditMode
          ? "Failed to update the meeting. Please try again"
          : "Failed to schedule the meeting. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (u: CompanyUser) =>
    `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!submitting) { resetForm(); onOpenChange(o); } }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg pb-2">
            {/* <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">IM</span>
            </div> */}
            {isEditMode ? "Edit Meeting" : "Log New Meeting"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto flex-1 px-1 -mx-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="im-title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="im-title"
              placeholder="e.g. Weekly Sync, Project Kickoff"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
              required
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Date &amp; Time<span className="text-red-500">*</span>
              </Label>
              <TimeFormatToggle use24Hour={use24Hour} onChange={setUse24Hour} />
            </div>

            {/* Start Section */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground w-9 shrink-0">Start</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9 px-2 text-[13px]",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{startDate ? format(startDate, "MMM d, yyyy") : "Date"}</span>
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

              <TimePickerInput value={startTimeStr} onChange={handleStartTimeChange} disabled={submitting} use24Hour={use24Hour} />
            </div>

            {/* End Section */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground w-9 shrink-0">End</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9 px-2 text-[13px]",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{endDate ? format(endDate, "MMM d, yyyy") : "Date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CustomDatePicker
                    date={endDate}
                    setDate={(d) => { setEndDate(d); setEndOpen(false); }}
                  />
                </PopoverContent>
              </Popover>

              <TimePickerInput value={endTimeStr} onChange={setEndTimeStr} disabled={submitting} use24Hour={use24Hour} />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5 mt-3">
            <Label htmlFor="im-location" className="text-sm font-medium">
              Location <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="im-location"
              placeholder="e.g. Conference Room A, Zoom link"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Attendees */}
          <div className="space-y-1.5 mt-3">
            <Label className="text-sm font-medium">
              Attendees <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex items-center flex-wrap gap-y-1 mt-1">
              <Popover
                open={attendeesOpen}
                onOpenChange={setAttendeesOpen}
              >
                <PopoverTrigger asChild>
                  <span
                    className="inline-block w-0 h-8 overflow-hidden shrink-0 pointer-events-none"
                    aria-hidden
                  />
                </PopoverTrigger>
                <button
                  type="button"
                  className="focus:outline-none relative z-30 mr-1"
                  title="Add attendee"
                  disabled={loadingUsers}
                  onClick={() => setAttendeesOpen(true)}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarFallback className="bg-white dark:bg-gray-800 border border-dashed border-border text-muted-foreground text-xs">
                      {loadingUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Selected Attendees Avatars */}
                {Array.from(selectedIds).map((id, i) => {
                  const u = companyUsers.find(cu => cu.id === id);
                  if (!u) return null;
                  return (
                    <div
                      key={u.id}
                      className="focus:outline-none -ml-2"
                      style={{ zIndex: 20 - i, position: "relative" }}
                      title={`${u.first_name} ${u.last_name}`}
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity" onClick={() => toggleUser(u.id)}>
                        <AvatarImage src={u.profile_picture} />
                        <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                          {getInitials(u)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  );
                })}

                <PopoverContent className="p-0 w-[250px]" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search colleagues..."
                      value={search}
                      onValueChange={setSearch}
                    />
                    <CommandList>
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {filteredUsers.map(u => (
                              <CommandItem
                                key={u.id}
                                value={u.id.toString()}
                                onSelect={() => toggleUser(u.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedIds.has(u.id)}
                                  onCheckedChange={() => toggleUser(u.id)}
                                  className="shrink-0 pointer-events-none"
                                />
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={u.profile_picture} />
                                  <AvatarFallback className="text-[10px] bg-primary text-white font-semibold">
                                    {getInitials(u)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-normal leading-tight truncate">{u.first_name} {u.last_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate leading-tight">{u.email}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 mt-3">
            <Label htmlFor="im-desc" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="im-desc"
              placeholder="Agenda, notes, or any other details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim()}
              className="gap-1.5"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isEditMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
