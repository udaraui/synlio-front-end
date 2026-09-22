"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Bell, Check, Info, Mail, MonitorSmartphone, Plus, Trash, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DeleteModal from "@/components/DeleteModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown } from "lucide-react";
import {
  createAlertRule,
  deleteAlertRule,
  getAlertRulesBySpace,
  getUsersByIds,
  SpaceAlertRule,
  toggleAlertRule,
  updateAlertRule,
} from "@/services/alert-rule.service";
import { load as loadUsers } from "@/services/user-service";

// ─── Event catalogue ─────────────────────────────────────────────────────────

const TASK_EVENTS: { value: string; label: string }[] = [
  { value: "TASK_CREATED", label: "Task Created" },
  { value: "TASK_UPDATED", label: "Task Updated" },
  { value: "TASK_ASSIGNED", label: "Task Assigned" },
  { value: "STATUS_CHANGED", label: "Status Changed" },
  { value: "SEVERITY_CHANGED", label: "Severity Changed" },
  { value: "NAME_CHANGED", label: "Name Changed" },
  { value: "COMMENT_ADDED", label: "Comment Added" },
  { value: "TASK_DELETED", label: "Task Deleted" },
  { value: "PROGRESS_CHANGED", label: "Progress Changed" },
  { value: "DATES_CHANGED", label: "Dates Changed" },
];

const TICKET_EVENTS: { value: string; label: string }[] = [
  { value: "TICKET_CREATED", label: "Ticket Created" },
  { value: "TICKET_UPDATED", label: "Ticket Updated" },
  { value: "TICKET_ASSIGNED", label: "Ticket Assigned" },
  { value: "STATUS_CHANGED", label: "Status Changed" },
  { value: "SEVERITY_CHANGED", label: "Severity Changed" },
  { value: "QUEUE_CHANGED", label: "Queue Changed" },
  { value: "NAME_CHANGED", label: "Name Changed" },
  { value: "COMMENT_ADDED", label: "Comment Added" },
  { value: "TICKET_DELETED", label: "Ticket Deleted" },
];

// ─── Empty rule shape ─────────────────────────────────────────────────────────

const emptyRule = (
  spaceType: "task" | "ticket",
  spaceId: number,
): Omit<SpaceAlertRule, "id" | "createdAt" | "updatedAt"> => ({
  name: "",
  spaceType,
  spaceId,
  events: [],
  channel: "both",
  toAssignee: false,
  toCoAssignees: false,
  toParticipants: false,
  toCreator: false,
  toActor: false,
  toAdditionalUserIds: [],
  ccAssignee: false,
  ccCoAssignees: false,
  ccParticipants: false,
  ccCreator: false,
  ccActor: false,
  ccAdditionalUserIds: [],
  isActive: true,
});

// ─── Channel radio buttons ─────────────────────────────────────────────────────

function ChannelRadioGroup({
  value,
  onChange,
}: {
  value: "both" | "in_app" | "email";
  onChange: (v: "both" | "in_app" | "email") => void;
}) {
  const options: { value: "both" | "in_app" | "email"; label: string; icons: (active: boolean) => React.ReactNode }[] = [
    {
      value: "both",
      label: "In App & Email",
      icons: (active: boolean) => (
        <>
          <MonitorSmartphone className={cn("h-4 w-4", active && "text-primary")} />
          <Mail className={cn("h-4 w-4", active && "text-primary")} />
        </>
      ),
    },
    {
      value: "in_app",
      label: "In App Only",
      icons: (active: boolean) => <MonitorSmartphone className={cn("h-4 w-4", active && "text-primary")} />,
    },
    {
      value: "email",
      label: "Email Only",
      icons: (active: boolean) => <Mail className={cn("h-4 w-4", active && "text-primary")} />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 transition-colors text-sm",
              active ? "border-primary bg-primary/5" : "hover:bg-muted",
            )}
          >
            {opt.icons(active)}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── User type ────────────────────────────────────────────────────────────────

type AlertUser = { id: number; email: string; first_name: string; last_name: string };

// ─── UserMultiSelect ──────────────────────────────────────────────────────────

function UserMultiSelect({
  selected,
  onChange,
  companyId,
  excludeIds = [],
  placeholder = "Search members…",
}: {
  selected: AlertUser[];
  onChange: (users: AlertUser[]) => void;
  companyId?: number;
  excludeIds?: number[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlertUser[]>([]);
  const [recentUsers, setRecentUsers] = useState<AlertUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent users when popover opens
  useEffect(() => {
    if (!popoverOpen || recentUsers.length > 0) return;
    void (async () => {
      try {
        const filter = {
          first: 0,
          rows: 4,
          filters: [
            ...(companyId ? [{ field: "companyId", value: companyId, matchMode: "equals" }] : []),
          ],
        };
        const data = await loadUsers(filter);
        setRecentUsers((data.data ?? []) as AlertUser[]);
      } catch { /* ignore */ }
    })();
  }, [popoverOpen, companyId, recentUsers.length]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const makeFilter = (field: string) => ({
          first: 0,
          rows: 20,
          filters: [
            { field, value: query, matchMode: "contains" },
            ...(companyId ? [{ field: "companyId", value: companyId, matchMode: "equals" }] : []),
          ],
        });
        const [byFirst, byLast, byEmail] = await Promise.all([
          loadUsers(makeFilter("first_name")),
          loadUsers(makeFilter("last_name")),
          loadUsers(makeFilter("email")),
        ]);
        const merged: AlertUser[] = [];
        const seen = new Set<number>();
        for (const u of [...(byFirst.data ?? []), ...(byLast.data ?? []), ...(byEmail.data ?? [])]) {
          if (!seen.has(u.id)) { seen.add(u.id); merged.push(u as AlertUser); }
        }
        setResults(merged);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, companyId]);

  const toggle = (user: AlertUser) => {
    if (selected.find((u) => u.id === user.id)) {
      onChange(selected.filter((u) => u.id !== user.id));
    } else {
      onChange([...selected, user]);
    }
  };

  const initials = (u: AlertUser) =>
    `${u.first_name?.charAt(0) ?? ""}${u.last_name?.charAt(0) ?? ""}`.toUpperCase() || u.email[0].toUpperCase();

  const avatarSrc = (u: AlertUser) => {
    const pic = (u as any).profile_picture;
    if (!pic) return undefined;
    return pic.startsWith("http") ? pic : `${process.env.NEXT_PUBLIC_API_URL}/uploads/users/${pic}`;
  };

  const filtered = results.filter((r) => !excludeIds.includes(r.id));
  const displayList = query.trim() ? filtered : recentUsers.filter((r) => !excludeIds.includes(r.id));

  return (
    <Popover open={popoverOpen} onOpenChange={(o) => { setPopoverOpen(o); if (!o) { setQuery(""); setResults([]); } }}>
      <div className="flex items-center flex-wrap gap-y-1 pl-2">
        {/* Zero-width hidden trigger anchors the popover at the start of the row */}
        <PopoverTrigger asChild>
          <span className="inline-block w-0 h-8 overflow-hidden shrink-0 pointer-events-none" aria-hidden />
        </PopoverTrigger>

        {/* Selected user avatars — click to remove */}
        {selected.map((u, i) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onChange(selected.filter((s) => s.id !== u.id))}
            className="focus:outline-none -ml-2"
            style={{ zIndex: 20 - i, position: "relative" }}
            title={`${u.first_name} ${u.last_name} — click to remove`}
          >
            <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:ring-destructive/60 hover:opacity-80 transition-all">
              <AvatarImage src={avatarSrc(u)} alt={`${u.first_name} ${u.last_name}`} />
              <AvatarFallback>
                {initials(u)}
              </AvatarFallback>
            </Avatar>
          </button>
        ))}

        {/* Plus avatar to open search popover */}
        <button
          type="button"
          className="focus:outline-none relative z-0 -ml-2"
          title={placeholder}
          onClick={() => setPopoverOpen(true)}
        >
          <Avatar className="h-8 w-8 ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback>
              <Plus className="w-3.5 h-3.5" />
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      <PopoverContent className="w-[300px] p-0" align="start" side="bottom">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {searching && (
              <div className="flex items-center justify-center py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            )}
            {!searching && query.trim() && filtered.length === 0 && (
              <CommandEmpty>No users found</CommandEmpty>
            )}
            {!searching && !query.trim() && displayList.length === 0 && (
              <p className="py-3 px-3 text-xs text-muted-foreground text-center">Type to search…</p>
            )}
            {!searching && displayList.length > 0 && (
              <CommandGroup heading={query.trim() ? undefined : "Recent"}>
                {displayList.map((u) => {
                  const isSelected = !!selected.find((s) => s.id === u.id);
                  return (
                    <CommandItem
                      key={u.id}
                      value={`${u.first_name} ${u.last_name} ${u.email}`}
                      onSelect={() => toggle(u)}
                      className="cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                      <Avatar className="h-6 w-6 flex-shrink-0 mr-2">
                        <AvatarImage src={avatarSrc(u)} alt={`${u.first_name} ${u.last_name}`} />
                        <AvatarFallback>
                          {initials(u)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate leading-tight">{u.first_name} {u.last_name}</span>
                        <span className="text-xs text-muted-foreground truncate leading-tight">{u.email}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Rule dialog ─────────────────────────────────────────────────────────────

type FormState = Omit<SpaceAlertRule, "id" | "createdAt" | "updatedAt">;

function RuleDialog({
  open,
  onClose,
  spaceType,
  spaceId,
  companyId,
  editRule,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  spaceType: "task" | "ticket";
  spaceId: number;
  companyId?: number;
  editRule: SpaceAlertRule | null;
  onSaved: () => void;
}) {
  const events = spaceType === "task" ? TASK_EVENTS : TICKET_EVENTS;

  const [form, setForm] = useState<FormState>(emptyRule(spaceType, spaceId));
  const [saving, setSaving] = useState(false);
  const [toAdditionalUsers, setToAdditionalUsers] = useState<AlertUser[]>([]);
  const [ccAdditionalUsers, setCcAdditionalUsers] = useState<AlertUser[]>([]);

  // Populate form when opening an existing rule for editing
  useEffect(() => {
    if (editRule) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...rest } = editRule;
      setForm(rest as FormState);
      // Pre-load user objects for existing IDs
      void getUsersByIds(editRule.toAdditionalUserIds ?? []).then(setToAdditionalUsers);
      void getUsersByIds(editRule.ccAdditionalUserIds ?? []).then(setCcAdditionalUsers);
    } else {
      setForm(emptyRule(spaceType, spaceId));
      setToAdditionalUsers([]);
      setCcAdditionalUsers([]);
    }
  }, [editRule, spaceType, spaceId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleEvent = (ev: string) => {
    set(
      "events",
      form.events.includes(ev)
        ? form.events.filter((e) => e !== ev)
        : [...form.events, ev],
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (form.events.length === 0) {
      toast.error("Select at least one event");
      return;
    }
    setSaving(true);
    try {
      const payload: FormState = {
        ...form,
        toAdditionalUserIds: toAdditionalUsers.map((u) => u.id),
        ccAdditionalUserIds: ccAdditionalUsers.map((u) => u.id),
      };
      if (editRule) {
        await updateAlertRule(editRule.id, payload);
        toast.success("Alert rule updated");
      } else {
        await createAlertRule(payload);
        toast.success("Alert rule created");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save rule";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const isTicket = spaceType === "ticket";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full !max-w-3xl flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {editRule ? "Edit Alert Rule" : "New Alert Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure when and how alerts are sent for this space.
          </DialogDescription>
        </DialogHeader>

        {/*<Separator />*/}

        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {/* Name */}
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              placeholder="e.g. Notify assignee on status change"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/50"
            />
          </div>

          {/* Events */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>Trigger Events</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-sm" side="top">
                  <p className="font-medium mb-1">Trigger Events</p>
                  <p className="text-muted-foreground text-xs">Select which events will trigger this alert rule. When any of the selected events occur in this space, notifications will be sent to the configured recipients.</p>
                </PopoverContent>
              </Popover>
            </div>
            {/* Dropdown to pick events */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  {form.events.length === 0
                    ? "Select events…"
                    : `${form.events.length} event${form.events.length > 1 ? "s" : ""} selected`}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search events…" />
                  <CommandList>
                    <CommandEmpty>No events found.</CommandEmpty>
                    <CommandGroup>
                      {events
                        .filter((ev) => !form.events.includes(ev.value))
                        .map((ev) => (
                          <CommandItem
                            key={ev.value}
                            value={ev.label}
                            onSelect={() => toggleEvent(ev.value)}
                            className="cursor-pointer"
                          >
                            {ev.label}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                    {events.every((ev) => form.events.includes(ev.value)) && (
                      <p className="py-3 px-3 text-xs text-muted-foreground text-center">
                        All events selected
                      </p>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {/* Selected events grid */}
            {form.events.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {form.events.map((val) => {
                  const label = events.find((e) => e.value === val)?.label ?? val;
                  return (
                    <label
                      key={val}
                      onClick={() => toggleEvent(val)}
                      className="flex items-center gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm cursor-pointer"
                    >
                      <Checkbox checked={true} onCheckedChange={() => toggleEvent(val)} />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label>Notification Channel</Label>
            <ChannelRadioGroup
              value={form.channel}
              onChange={(v) => set("channel", v)}
            />
          </div>

          {/* TO recipients */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              {/* Col 1 header */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium leading-none">TO Recipients</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" side="top">
                    <p className="font-medium mb-2">TO Recipients</p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li><span className="font-medium text-foreground">Assignee</span> - The user currently assigned to the task/ticket.</li>
                      <li><span className="font-medium text-foreground">Creator</span> - The user who originally created the task/ticket.</li>
                      <li><span className="font-medium text-foreground">Co-Assignees</span> - Additional users assigned alongside the main assignee.</li>
                      <li><span className="font-medium text-foreground">Participants</span> - Users who are involved or following the ticket.</li>
                      <li><span className="font-medium text-foreground">Actor</span> - The user who triggered the event (e.g. made the change).</li>
                      <li><span className="font-medium text-foreground">Additional</span> - Specific users you manually add to always be notified.</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Col 2 header — empty spacer */}
              <span />
              {/* Col 3 header */}
              <span className="text-xs font-medium text-muted-foreground self-end">(Additional)</span>
            </div>
            <div className="grid grid-cols-3 gap-3 items-start">
              {/* Col 1: Assignee + Creator */}
              <div className="flex flex-col gap-2">
                <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.ccAssignee ? "opacity-40 cursor-not-allowed" : form.toAssignee ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                  <Checkbox checked={form.toAssignee} disabled={form.ccAssignee} onCheckedChange={(c) => { set("toAssignee", !!c); if (!!c) set("ccAssignee", false); }} />
                  Assignee
                </label>
                <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.ccCreator ? "opacity-40 cursor-not-allowed" : form.toCreator ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                  <Checkbox checked={form.toCreator} disabled={form.ccCreator} onCheckedChange={(c) => { set("toCreator", !!c); if (!!c) set("ccCreator", false); }} />
                  Creator
                </label>
              </div>
              {/* Col 2: Co-Assignees/Participants + Actor */}
              <div className="flex flex-col gap-2">
                {isTicket ? (
                  <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.ccParticipants ? "opacity-40 cursor-not-allowed" : form.toParticipants ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                    <Checkbox checked={form.toParticipants} disabled={form.ccParticipants} onCheckedChange={(c) => { set("toParticipants", !!c); if (!!c) set("ccParticipants", false); }} />
                    Participants
                  </label>
                ) : (
                  <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.ccCoAssignees ? "opacity-40 cursor-not-allowed" : form.toCoAssignees ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                    <Checkbox checked={form.toCoAssignees} disabled={form.ccCoAssignees} onCheckedChange={(c) => { set("toCoAssignees", !!c); if (!!c) set("ccCoAssignees", false); }} />
                    Co-Assignees
                  </label>
                )}
                <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.ccActor ? "opacity-40 cursor-not-allowed" : form.toActor ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                  <Checkbox checked={form.toActor} disabled={form.ccActor} onCheckedChange={(c) => { set("toActor", !!c); if (!!c) set("ccActor", false); }} />
                  Actor
                </label>
              </div>
              {/* Col 3: Additional TO avatar set */}
              <div className="flex flex-col gap-1">
                <UserMultiSelect
                  selected={toAdditionalUsers}
                  onChange={setToAdditionalUsers}
                  companyId={companyId}
                  placeholder="Additional TO recipients…"
                />
              </div>
            </div>
          </div>

          {/* CC recipients */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              {/* Col 1 header */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium leading-none">CC Recipients</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" side="top">
                    <p className="font-medium mb-2">CC Recipients</p>
                    <p className="text-xs text-muted-foreground mb-2">CC recipients receive a copy of the notification. The same role definitions apply as TO recipients, but a user cannot be in both TO and CC for the same role.</p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li><span className="font-medium text-foreground">Assignee</span> - The user currently assigned to the task/ticket.</li>
                      <li><span className="font-medium text-foreground">Creator</span> - The user who originally created the task/ticket.</li>
                      <li><span className="font-medium text-foreground">Co-Assignees</span> - Additional users assigned alongside the main assignee.</li>
                      <li><span className="font-medium text-foreground">Participants</span> - Users who are involved or following the ticket.</li>
                      <li><span className="font-medium text-foreground">Actor</span> - The user who triggered the event.</li>
                      <li><span className="font-medium text-foreground">Additional</span> - Specific users you manually add.</li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Col 2 header — empty spacer */}
              <span />
              {/* Col 3 header */}
              <span className="text-xs font-medium text-muted-foreground self-end pb-0.5">(Additional)</span>
            </div>
            <div className="grid grid-cols-3 gap-3 items-start">
              {/* Col 1: Assignee + Creator */}
              <div className="flex flex-col gap-2">
                <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.toAssignee ? "opacity-40 cursor-not-allowed" : form.ccAssignee ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                  <Checkbox checked={form.ccAssignee} disabled={form.toAssignee} onCheckedChange={(c) => { set("ccAssignee", !!c); if (!!c) set("toAssignee", false); }} />
                  Assignee
                </label>
                <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.toCreator ? "opacity-40 cursor-not-allowed" : form.ccCreator ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                  <Checkbox checked={form.ccCreator} disabled={form.toCreator} onCheckedChange={(c) => { set("ccCreator", !!c); if (!!c) set("toCreator", false); }} />
                  Creator
                </label>
              </div>
              {/* Col 2: Co-Assignees/Participants + Actor */}
              <div className="flex flex-col gap-2">
                {isTicket ? (
                  <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.toParticipants ? "opacity-40 cursor-not-allowed" : form.ccParticipants ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                    <Checkbox checked={form.ccParticipants} disabled={form.toParticipants} onCheckedChange={(c) => { set("ccParticipants", !!c); if (!!c) set("toParticipants", false); }} />
                    Participants
                  </label>
                ) : (
                  <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.toCoAssignees ? "opacity-40 cursor-not-allowed" : form.ccCoAssignees ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                    <Checkbox checked={form.ccCoAssignees} disabled={form.toCoAssignees} onCheckedChange={(c) => { set("ccCoAssignees", !!c); if (!!c) set("toCoAssignees", false); }} />
                    Co-Assignees
                  </label>
                )}
                <label className={cn("flex items-center gap-2 rounded-md border px-3 py-2 transition-colors text-sm", form.toActor ? "opacity-40 cursor-not-allowed" : form.ccActor ? "border-primary bg-primary/5 cursor-pointer" : "cursor-pointer hover:bg-muted")}>
                  <Checkbox checked={form.ccActor} disabled={form.toActor} onCheckedChange={(c) => { set("ccActor", !!c); if (!!c) set("toActor", false); }} />
                  Actor
                </label>
              </div>
              {/* Col 3: Additional CC avatar set */}
              <div className="flex flex-col gap-1">
                <UserMultiSelect
                  selected={ccAdditionalUsers}
                  onChange={setCcAdditionalUsers}
                  companyId={companyId}
                  excludeIds={toAdditionalUsers.map((u) => u.id)}
                  placeholder="Additional CC recipients…"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-2 flex items-center">
          <div className="flex items-center gap-3 mr-auto">
            <Switch
              checked={form.isActive}
              onCheckedChange={(c) => set("isActive", c)}
            />
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive rules are ignored during dispatch.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel badge ─────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const badgeClass = "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs border border-border rounded-md bg-white dark:bg-gray-800 cursor-default select-none max-w-[140px]";

  if (channel === "both") {
    return (
      <div className="flex items-center gap-1">
        <span className={badgeClass}>
          <MonitorSmartphone className="h-3 w-3" />
          <span className="truncate max-w-[120px]">In-App</span>
        </span>
        <span className={badgeClass}>
          <Mail className="h-3 w-3" />
          <span className="truncate max-w-[120px]">Email</span>
        </span>
      </div>
    );
  }
  if (channel === "in_app") {
    return (
      <span className={badgeClass}>
        <MonitorSmartphone className="h-3 w-3" />
        <span className="truncate max-w-[120px]">In-App</span>
      </span>
    );
  }
  if (channel === "email") {
    return (
      <span className={badgeClass}>
        <Mail className="h-3 w-3" />
        <span className="truncate max-w-[120px]">Email</span>
      </span>
    );
  }
  return (
    <span className={badgeClass}>
      <span className="truncate max-w-[120px]">{channel}</span>
    </span>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export function AlertsTabContent({
  spaceType,
  spaceId,
  companyId,
}: {
  spaceType: "task" | "ticket";
  spaceId: number;
  companyId?: number;
}) {
  const events = spaceType === "task" ? TASK_EVENTS : TICKET_EVENTS;
  const isTicket = spaceType === "ticket";

  const [rules, setRules] = useState<SpaceAlertRule[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SpaceAlertRule | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<SpaceAlertRule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlertRulesBySpace(spaceType, spaceId);
      setRules(data);
    } catch {
      toast.error("Failed to load alert rules");
    } finally {
      setLoading(false);
    }
  }, [spaceType, spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (rule: SpaceAlertRule) => {
    try {
      await toggleAlertRule(rule.id);
      load();
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    try {
      await deleteAlertRule(deletingRule.id);
      toast.success("Rule deleted");
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete rule";
      toast.error(msg);
      throw e;
    } finally {
      setDeletingRule(null);
    }
  };

  const eventLabel = (ev: string) =>
    events.find((e) => e.value === ev)?.label ?? ev;

  return (
    <div className="pt-2 gap-3">
      <div className="pb-0 mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-medium">
              Alert Rules
            </h3>
            <p className="text-sm text-muted-foreground">
              Define who gets notified and via which channel when events occur
              in this space.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setEditingRule(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      <div className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg">
            <Bell className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No alert rules configured, The system will use default behaviour.</p>
          </div>
        ) : (
          <div className="rounded-lg border flex flex-col h-[calc(100vh-220px)] overflow-hidden">
            <div className="flex-1 overflow-auto relative">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 border-b border-border">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">NAME</TableHead>
                    <TableHead className="h-10 w-[460px] px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">EVENTS</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">CHANNEL</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">TO</TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">CC</TableHead>
                    <TableHead className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const toParts: string[] = [];
                  if (rule.toAssignee) toParts.push("Assignee");
                  if (!isTicket && rule.toCoAssignees)
                    toParts.push("Co-Assignees");
                  if (isTicket && rule.toParticipants)
                    toParts.push("Participants");
                  if (rule.toCreator) toParts.push("Creator");
                  if (rule.toActor) toParts.push("Actor");
                  if (rule.toAdditionalUserIds?.length)
                    toParts.push(`+${rule.toAdditionalUserIds.length} user(s)`);

                  const ccParts: string[] = [];
                  if (rule.ccAssignee) ccParts.push("Assignee");
                  if (!isTicket && rule.ccCoAssignees)
                    ccParts.push("Co-Assignees");
                  if (isTicket && rule.ccParticipants)
                    ccParts.push("Participants");
                  if (rule.ccCreator) ccParts.push("Creator");
                  if (rule.ccActor) ccParts.push("Actor");
                  if (rule.ccAdditionalUserIds?.length)
                    ccParts.push(`+${rule.ccAdditionalUserIds.length} user(s)`);

                  return (
                    <TableRow
                      key={rule.id}
                      className={cn(
                        "hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors border-b border-border",
                        !rule.isActive && "opacity-50"
                      )}
                    >
                      <TableCell className="py-1.75 px-4 font-medium max-w-[200px] whitespace-normal break-words">
                        {rule.name}
                      </TableCell>
                      <TableCell className="py-1.75 px-4">
                        <div className="flex flex-wrap gap-1 w-full">
                          {(rule.events as string[]).map((ev) => (
                            <span
                              key={ev}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] sm:text-xs border border-border rounded-md bg-white dark:bg-gray-800 cursor-default select-none max-w-[140px]"
                            >
                              <span className="truncate max-w-[120px]">{eventLabel(ev)}</span>
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.75 px-4">
                        <ChannelBadge channel={rule.channel} />
                      </TableCell>
                      <TableCell className="py-1.75 px-4 text-sm">
                        {toParts.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="py-1.75 px-4 text-sm">
                        {ccParts.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="py-1.75 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="cursor-pointer inline-flex items-center justify-center mr-2">
                                  <Switch
                                    checked={rule.isActive}
                                    onCheckedChange={() => handleToggle(rule)}
                                    className="cursor-pointer"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 cursor-pointer hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary"
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit Rule</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setDeletingRule(rule);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete Rule</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <RuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        spaceType={spaceType}
        spaceId={spaceId}
        companyId={companyId}
        editRule={editingRule}
        onSaved={load}
      />

      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeletingRule(null);
        }}
        onDelete={handleDelete}
        title="Delete Alert Rule"
        description={`Are you sure you want to delete the rule "${deletingRule?.name}"? This cannot be undone.`}
        buttonText="Delete"
        hideActionButtonOnError
      />
    </div>
  );
}

