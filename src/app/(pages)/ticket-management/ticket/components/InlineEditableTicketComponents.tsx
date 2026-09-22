"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Flag,
  Check,
  Loader2,
  FolderClosed,
  type LucideIcon,
  Target,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Avatar Component for user profile pictures
const UserAvatar = ({
  firstName,
  lastName,
  profilePicture,
  size = "sm",
}: {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  size?: "xs" | "sm" | "md";
}) => {
  const sizeClasses = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
  };

  const getInitials = () => {
    const fName = (firstName || "").trim();
    const lName = (lastName || "").trim();
    
    if (fName && lName) {
      return (fName.charAt(0) + lName.charAt(0)).toUpperCase();
    }
    
    if (fName && fName.includes(' ')) {
      const parts = fName.split(' ').filter(Boolean);
      if (parts.length > 1) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
    }
    
    if (fName) return fName.substring(0, 2).toUpperCase();
    if (lName) return lName.substring(0, 2).toUpperCase();
    
    return "?";
  };

  let finalProfilePic: string | undefined = undefined;
  if (profilePicture && typeof profilePicture === 'string' && profilePicture.trim().length > 0) {
    finalProfilePic = profilePicture.startsWith('http')
      ? profilePicture
      : `${process.env.NEXT_PUBLIC_API_URL}/uploads/resource/${profilePicture}`;
  }

  return (
    <Avatar key={finalProfilePic || getInitials()} className={sizeClasses[size]}>
      {finalProfilePic && <AvatarImage src={finalProfilePic} alt={`${firstName} ${lastName}`} className="object-cover" />}
      <AvatarFallback className="text-xs font-semibold dark:text-black">{getInitials()}</AvatarFallback>
    </Avatar>
  );
};

// ─── Inline Editable Ticket Type ──────────────────────────────────────────────

interface InlineEditableTicketTypeProps {
  ticketType: any;
  ticketId: number;
  ticketSpaceId?: number;
  onUpdate?: (typeId: number) => Promise<void>;
  getIconComponent: (iconName: string | undefined) => LucideIcon | null;
  types?: any[]; // passed from parent — no self-fetching
  preloadedTypes?: any[]; // alias used by form page
  iconOnly?: boolean;
  hasError?: boolean;
  externalLoading?: boolean;
}

export function InlineEditableTicketType({
  ticketType,
  ticketId,
  onUpdate,
  getIconComponent,
  types: typesProp = [],
  preloadedTypes,
  iconOnly = false,
  hasError = false,
  externalLoading,
}: InlineEditableTicketTypeProps) {
  const types = preloadedTypes ?? typesProp;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localType, setLocalType] = useState(ticketType);
  const showLoading = externalLoading && !isLoading;

  // Keep local type in sync — skip if ID already matches to avoid extra re-render
  useEffect(() => {
    setLocalType((prev: typeof ticketType) =>
      JSON.stringify(prev) === JSON.stringify(ticketType) ? prev : ticketType,
    );
  }, [ticketType]);

  const IconComponent = localType?.icon
    ? getIconComponent(localType.icon)
    : null;

  const handleSelect = async (typeId: number) => {
    if (typeId === localType?.id) {
      setIsOpen(false);
      return;
    }
    const prev = localType;
    setLocalType(types.find((t) => t.id === typeId) ?? prev); // optimistic
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(typeId);
      } else {
        const { patchTicketType } =
          await import("@/services/ticket-management/ticket.service");
        await patchTicketType(ticketId, typeId);
        window.location.reload();
      }
    } catch {
      setLocalType(prev);
      toast.error("Failed to update ticket type", undefined, "bottom-right");
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            iconOnly
              ? "inline-flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              : "inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            hasError && "border-red-500 focus-visible:ring-red-500",
          )}
          onClick={(e) => e.stopPropagation()}
          title={localType ? localType.name : "No type"}
        >
          <span className="inline-flex items-center gap-1.5">
            {localType ? (
              <>
                {IconComponent ? (
                  <IconComponent
                    className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      (!localType.color || localType.color.toLowerCase() === "#3b82f6") && "text-blue-500 dark:text-blue-400"
                    )}
                    style={
                      localType.color && localType.color.toLowerCase() !== "#3b82f6"
                        ? { color: localType.color }
                        : undefined
                    }
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                )}
                {!iconOnly && (
                  <span className="text-gray-700 dark:text-gray-300">
                    {localType.name}
                  </span>
                )}
              </>
            ) : iconOnly ? (
              <div className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
            ) : (
              <span className="text-gray-400 whitespace-nowrap">No type</span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs">Select Type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {types.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            No types configured
          </div>
        ) : (
          types.map((type) => {
            const TypeIcon = getIconComponent(type.icon);
            const isSelected = localType?.id === type.id;
            return (
              <DropdownMenuItem
                key={type.id}
                onClick={() => handleSelect(type.id)}
                className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  {TypeIcon && (
                    <TypeIcon
                      className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        (!type.color || type.color.toLowerCase() === "#3b82f6") && "text-blue-500 dark:text-blue-400"
                      )}
                      style={
                        type.color && type.color.toLowerCase() !== "#3b82f6"
                          ? { color: type.color }
                          : undefined
                      }
                    />
                  )}
                  <span className="text-sm flex-1">{type.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Ticket Name ──────────────────────────────────────────────

interface InlineEditableTicketNameProps {
  name: string;
  onUpdate: (name: string) => Promise<void>;
  className?: string;
}

export function InlineEditableTicketName({
  name,
  onUpdate,
  className,
}: InlineEditableTicketNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value.trim() === "" || value === name) {
      setValue(name);
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await onUpdate(value.trim());
      setIsEditing(false);
    } catch {
      setValue(name);
      setIsEditing(false);
      toast.error("Failed to update ticket name", undefined, "bottom-right");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setValue(name);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-transparent border-0 outline-none focus:outline-none focus:ring-0 m-0 p-0 text-sm font-semibold w-full leading-tight",
            isLoading && "pr-5",
            className,
          )}
          style={{
            boxShadow: "inset 0 -2px 0 0 var(--primary)",
            padding: "0",
            margin: "0",
            border: "none",
          }}
        />
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 absolute right-0 flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <span
      className={cn(
        "cursor-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-0 py-0 transition-colors block",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Click to edit"
    >
      {name}
    </span>
  );
}

// ─── Inline Editable Status ───────────────────────────────────────────────────

interface InlineEditableStatusProps {
  status: any;
  statuses?: any[]; // passed from parent — no self-fetching
  preloadedStatuses?: any[]; // alias used by form page
  ticketId: number;
  ticketSpaceId?: number;
  onUpdate?: (statusId: number) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableStatus({
  status,
  statuses: statusesProp = [],
  preloadedStatuses,
  ticketId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableStatusProps) {
  const statuses = preloadedStatuses ?? statusesProp;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const showLoading = externalLoading && !isLoading;

  useEffect(() => {
    setLocalStatus((prev: any) => (JSON.stringify(prev) === JSON.stringify(status) ? prev : status));
  }, [status]);

  const handleSelect = async (statusId: number) => {
    if (statusId === localStatus?.id) {
      setIsOpen(false);
      return;
    }
    const prev = localStatus;
    setLocalStatus(statuses.find((s) => s.id === statusId) ?? prev); // optimistic
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(statusId);
      } else {
        const { patchTicketStatus } =
          await import("@/services/ticket-management/ticket.service");
        await patchTicketStatus(ticketId, statusId);
        window.location.reload();
      }
    } catch {
      setLocalStatus(prev);
      toast.error("Failed to update ticket status", undefined, "bottom-right");
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer max-w-[140px] min-w-0 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          title="Click to change status"
        >
          {localStatus ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: localStatus.color }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate min-w-0 whitespace-nowrap">
                {localStatus.name}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 whitespace-nowrap">No status</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setIsOpen(false)}
      >
        <DropdownMenuLabel className="text-xs">Select Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            No statuses configured
          </div>
        ) : (
          statuses.map((s) => {
            const isSelected = localStatus?.id === s.id;
            return (
              <DropdownMenuItem
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm flex-1">{s.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Severity ─────────────────────────────────────────────────

interface InlineEditableSeverityProps {
  severity: any;
  severities?: any[]; // passed from parent — no self-fetching
  preloadedSeverities?: any[]; // alias used by form page
  ticketId: number;
  ticketSpaceId?: number;
  onUpdate?: (severityId: number) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableSeverity({
  severity,
  severities: severitiesProp = [],
  preloadedSeverities,
  ticketId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableSeverityProps) {
  const severities = preloadedSeverities ?? severitiesProp;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localSeverity, setLocalSeverity] = useState(severity);
  const showLoading = externalLoading && !isLoading;

  useEffect(() => {
    setLocalSeverity((prev: typeof severity) =>
      JSON.stringify(prev) === JSON.stringify(severity) ? prev : severity,
    );
  }, [severity]);

  const handleSelect = async (severityId: number) => {
    if (severityId === localSeverity?.id) {
      setIsOpen(false);
      return;
    }
    const prev = localSeverity;
    setLocalSeverity(severities.find((s) => s.id === severityId) ?? prev); // optimistic
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(severityId);
      } else {
        const { patchTicketSeverity } =
          await import("@/services/ticket-management/ticket.service");
        await patchTicketSeverity(ticketId, severityId);
        window.location.reload();
      }
    } catch {
      setLocalSeverity(prev);
      toast.error("Failed to update ticket severity",
        undefined,
        "bottom-right",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          title="Click to change severity"
        >
          {localSeverity ? (
            <span className="inline-flex items-center gap-1.5">
              <Flag
                className="w-3 h-3 flex-shrink-0"
                fill={localSeverity.color}
                color={localSeverity.color}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {localSeverity.name}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 whitespace-nowrap">No severity</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setIsOpen(false)}
      >
        <DropdownMenuLabel className="text-xs">
          Select Severity
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {severities.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            No severities configured
          </div>
        ) : (
          severities.map((s) => {
            const isSelected = localSeverity?.id === s.id;
            return (
              <DropdownMenuItem
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Flag
                    className="w-3 h-3 flex-shrink-0"
                    fill={s.color}
                    color={s.color}
                  />
                  <span className="text-sm flex-1">{s.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Queue ────────────────────────────────────────────────────

interface InlineEditableQueueProps {
  queue: any;
  queues?: any[]; // passed from parent — no self-fetching
  preloadedQueues?: any[]; // alias used by form page
  ticketId: number;
  ticketSpaceId?: number;
  onUpdate?: (queueId: number | null) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableQueue({
  queue,
  queues: queuesProp = [],
  preloadedQueues,
  ticketId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableQueueProps) {
  const queues = preloadedQueues ?? queuesProp;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localQueue, setLocalQueue] = useState(queue);
  const showLoading = externalLoading && !isLoading;

  // Keep local queue in sync — skip if ID already matches to avoid extra re-render
  useEffect(() => {
    setLocalQueue((prev: any) => (JSON.stringify(prev) === JSON.stringify(queue) ? prev : queue));
  }, [queue]);

  const handleSelect = async (queueId: number | null) => {
    if (queueId === localQueue?.id) {
      queueId = null;
    }
    if (queueId === null && !localQueue) {
      setIsOpen(false);
      return;
    }
    const prev = localQueue;
    setLocalQueue(queues.find((q) => q.id === queueId) ?? prev); // optimistic
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(queueId);
      } else {
        const { patchTicketQueue } =
          await import("@/services/ticket-management/ticket.service");
        await patchTicketQueue(ticketId, queueId);
        window.location.reload();
      }
    } catch {
      setLocalQueue(prev);
      toast.error("Failed to update ticket queue", undefined, "bottom-right");
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer max-w-[150px] min-w-0 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          title={'Click to change queue'}
        >
          {localQueue ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <FolderClosed className="w-3 h-3 flex-shrink-0 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 truncate min-w-0">
                {localQueue.name}
              </span>
            </span>
          ) : (
            <>
              {/* <FolderClosed className="w-3 h-3 flex-shrink-0 text-gray-400" /> */}
              <span className="text-gray-400 whitespace-nowrap">No queue</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setIsOpen(false)}
      >
        <DropdownMenuLabel className="text-xs">
          Select Queue/Dept.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {queues.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            No queues configured
          </div>
        ) : (
          queues.map((q) => {
            const isSelected = localQueue?.id === q.id;
            return (
              <DropdownMenuItem
                key={q.id}
                onClick={() => handleSelect(q.id)}
                className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <FolderClosed className="w-3 h-3 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm flex-1">{q.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Impact ────────────────────────────────────────────────────

interface InlineEditableImpactProps {
  impact: any;
  impacts?: any[]; // passed from parent — no self-fetching
  preloadedImpacts?: any[]; // alias used by form page
  ticketId: number;
  ticketSpaceId?: number;
  onUpdate?: (impactId: number | null) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableImpact({
  impact,
  impacts: impactsProp = [],
  preloadedImpacts,
  ticketId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableImpactProps) {
  const impacts = preloadedImpacts ?? impactsProp;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localImpact, setLocalImpact] = useState(impact);
  const showLoading = externalLoading && !isLoading;

  // Keep local impact in sync — skip if ID already matches to avoid extra re-render
  useEffect(() => {
    setLocalImpact((prev: any) => (JSON.stringify(prev) === JSON.stringify(impact) ? prev : impact));
  }, [impact]);

  const handleSelect = async (impactId: number | null) => {
    if (impactId === localImpact?.id) {
      impactId = null;
    }
    if (impactId === null && !localImpact) {
      setIsOpen(false);
      return;
    }
    const prev = localImpact;
    setLocalImpact(impacts.find((i) => i.id === impactId) ?? prev); // optimistic
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(impactId);
      } else {
        const { patchTicketImpact } = await import("@/services/ticket-management/ticket.service");
        await patchTicketImpact(ticketId, impactId);
        window.location.reload();
      }
    } catch {
      setLocalImpact(prev);
      toast.error("Failed to update ticket impact", undefined, "bottom-right");
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoading) {
    return <Skeleton className="h-5 w-32" />;
  }

  return (
    <DropdownMenu open={isOpen && !readonly} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          disabled={readonly}
          title={readonly ? "Impact cannot be changed" : "Click to change impact"}
        >
          {localImpact ? (
            <span className="inline-flex items-center gap-1.5">
              <Target className="w-3 h-3 flex-shrink-0 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{localImpact.name}</span>
            </span>
          ) : (
            <>
              {/* <Target className="w-3 h-3 flex-shrink-0 text-gray-400" /> */}
              <span className="text-gray-400 whitespace-nowrap">No impact</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setIsOpen(false)}
      >
        <DropdownMenuLabel className="text-xs">Select Impact</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {impacts.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">No impacts configured</div>
        ) : (
          impacts.map((i) => {
            const isSelected = localImpact?.id === i.id;
            return (
              <DropdownMenuItem
                key={i.id}
                onClick={() => handleSelect(i.id)}
                className={`cursor-pointer ${isSelected ? "bg-primary/10" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Target className="w-3 h-3 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm flex-1">{i.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Inline Editable Assignee ─────────────────────────────────────────────────

interface InlineEditableAssigneeProps {
  assignee: any;
  members: any[]; // passed from parent (TicketPermission format) — no self-fetching
  ticketId: number;
  onUpdate?: (assigneeId: number | null) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableAssignee({
  assignee,
  members = [],
  ticketId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableAssigneeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setIsLoading] = useState(false);
  const [localAssignee, setLocalAssignee] = useState(assignee);
  const [searchQuery, setSearchQuery] = useState("");
  const showLoading = externalLoading;

  useEffect(() => {
    setLocalAssignee((prev: typeof assignee) =>
      JSON.stringify(prev) === JSON.stringify(assignee) ? prev : assignee,
    );
  }, [assignee]);
  useEffect(() => {
    if (!isOpen) setSearchQuery("");
  }, [isOpen]);

  // assigneeUserId is the userId for display/comparison; we look up the permission ID for the API
  const handleSelect = async (assigneeUserId: number | null) => {
    if (assigneeUserId === assignee?.id) {
      setIsOpen(false);
      return;
    }
    const previousAssignee = localAssignee;
    let memberId: number | null = null;
    // ── Optimistic: show new avatar INSTANTLY ──
    if (assigneeUserId === null) {
      setLocalAssignee(null);
    } else {
      const selectedMember = members.find((m) => m.userId === assigneeUserId);
      if (selectedMember) {
        memberId = selectedMember.id; // FK to ticket_space_member.id — what the DB expects
        setLocalAssignee({
          id: selectedMember.userId,
          first_name: selectedMember.userFirstName || selectedMember.firstName || selectedMember.first_name,
          last_name: selectedMember.userLastName || selectedMember.lastName || selectedMember.last_name,
          profile_picture: selectedMember.userProfilePicture || selectedMember.profilePicture || selectedMember.profile_pic,
        });
      }
    }
    setIsOpen(false);
    setIsLoading(true);
    try {
      if (onUpdate) {
        await onUpdate(memberId);
      } else {
        const { patchTicketAssignee } =
          await import("@/services/ticket-management/ticket.service");
        await patchTicketAssignee(ticketId, memberId);
        window.location.reload();
      }
    } catch {
      setLocalAssignee(previousAssignee);
      toast.error("Failed to update ticket assignee",
        undefined,
        "bottom-right",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members
    .filter((member) => {
      const fullName =
        `${member.userFirstName || ""} ${member.userLastName || ""}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const aSelected = assignee?.id === a.userId ? -1 : 0;
      const bSelected = assignee?.id === b.userId ? -1 : 0;
      if (aSelected !== bSelected) return aSelected - bSelected;
      const aName = a.userFirstName || "";
      const bName = b.userFirstName || "";
      return aName.localeCompare(bName);
    });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center group/assignee rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          disabled={showLoading || readonly}
          title={localAssignee ? `${localAssignee.first_name || localAssignee.firstName || localAssignee.userFirstName} ${localAssignee.last_name || localAssignee.lastName || localAssignee.userLastName}` : "Add Assignee"}
        >
          {showLoading ? (
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
            </div>
          ) : localAssignee ? (
            <UserAvatar
              firstName={localAssignee.first_name || localAssignee.firstName || localAssignee.userFirstName}
              lastName={localAssignee.last_name || localAssignee.lastName || localAssignee.userLastName}
              profilePicture={localAssignee.profile_picture || localAssignee.profilePicture || localAssignee.userProfilePicture}
              size="sm"
            />
          ) : (
            <div className="w-6 h-6 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0 ring-1 ring-transparent group-hover/assignee:ring-2 group-hover/assignee:ring-primary/50 transition-all">
              <Plus className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] p-0"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search members"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {members.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No members configured
              </div>
            ) : (
              <>
                {filteredMembers.length === 0 && (
                  <CommandEmpty>No member found.</CommandEmpty>
                )}
                <CommandGroup>
                  {filteredMembers.map((member, index) => {
                    const isSelected = assignee?.id === member.userId;
                    const prevMember = filteredMembers[index - 1];
                    const showAssignedTitle = index === 0 && isSelected;
                    const showOtherTitle = (index === 0 && !isSelected) || (index > 0 && assignee?.id === prevMember?.userId && !isSelected);
                    return (
                      <React.Fragment key={member.id}>
                        {showAssignedTitle && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Assigned
                            </span>
                          </div>
                        )}
                        {showOtherTitle && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Space Members
                            </span>
                          </div>
                        )}
                        <CommandItem
                          value={`${member.userFirstName} ${member.userLastName} ${member.userEmail}`}
                          onSelect={() =>
                            handleSelect(isSelected ? null : member.userId)
                          }
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              firstName={member.userFirstName}
                              lastName={member.userLastName}
                              profilePicture={member.userProfilePicture}
                              size="sm"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {member.userFirstName} {member.userLastName}
                              </span>
                              {member.userEmail && (
                                <span className="text-xs text-muted-foreground">
                                  {member.userEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      </React.Fragment>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Inline Editable Participants ─────────────────────────────────────────────

interface InlineEditableParticipantsProps {
  participants: any[];
  members: any[]; // passed from parent (TicketPermission format) — no self-fetching
  ticketId: number;
  onUpdate?: (participantIds: number[]) => Promise<void>;
  externalLoading?: boolean;
  readonly?: boolean;
}

export function InlineEditableParticipants({
  participants = [],
  members = [],
  ticketId,
  onUpdate,
  externalLoading,
  readonly,
}: InlineEditableParticipantsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const showLoading = externalLoading;

  useEffect(() => {
    if (!isOpen) setSearchQuery("");
  }, [isOpen]);

  // Participants are USER objects (id = userId); members are TicketSpaceMember objects (id = memberId, userId property)
  const selectedPermissionIds = useMemo(() => {
    const participantUserIds = new Set(participants.map((p) => p.id));
    return members
      .filter((m) => participantUserIds.has(m.userId))
      .map((m) => m.id);
  }, [participants, members]);

  const [selectedIds, setSelectedIds] = useState<number[]>(
    selectedPermissionIds,
  );
  const [initialIds, setInitialIds] = useState<number[]>(selectedPermissionIds);

  const localParticipants = useMemo(() => {
    if (
      !isOpen &&
      selectedIds.length === initialIds.length &&
      selectedIds.every((id) => initialIds.includes(id))
    ) {
      return participants;
    }
    const originalOrder = new Map(participants.map((p, i) => [p.id, i]));
    const mapped = members
      .filter((m) => selectedIds.includes(m.id))
      .map((m) => ({
        id: m.userId,
        first_name: m.userFirstName,
        last_name: m.userLastName,
        profile_picture: m.userProfilePicture,
        firstName: m.userFirstName,
        lastName: m.userLastName,
      }));
    mapped.sort((a, b) => {
      const indexA = originalOrder.has(a.id) ? originalOrder.get(a.id)! : Infinity;
      const indexB = originalOrder.has(b.id) ? originalOrder.get(b.id)! : Infinity;
      if (indexA !== indexB) return indexA - indexB;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
    return mapped;
  }, [selectedIds, members, participants, isOpen, initialIds]);

  useEffect(() => {
    setSelectedIds(selectedPermissionIds);
    setInitialIds(selectedPermissionIds);
  }, [selectedPermissionIds]);

  const handleOpenChange = async (open: boolean) => {
    if (!open && !isLoading) {
      const hasChanged =
        selectedIds.length !== initialIds.length ||
        selectedIds.some((id) => !initialIds.includes(id));
      if (hasChanged) {
        setIsLoading(true);
        try {
          if (onUpdate) {
            await onUpdate(selectedIds);
          } else {
            const { patchTicketParticipants } =
              await import("@/services/ticket-management/ticket.service");
            await patchTicketParticipants(ticketId, selectedIds);
            window.location.reload();
          }
          setInitialIds(selectedIds);
        } catch {
          setSelectedIds(initialIds);
          toast.error("Failed to update ticket participants",
            undefined,
            "bottom-right",
          );
        } finally {
          setIsLoading(false);
        }
      }
    }
    setIsOpen(open);
  };

  const handleToggle = (memberPermissionId: number) => {
    setSelectedIds((prev) =>
      prev.includes(memberPermissionId)
        ? prev.filter((id) => id !== memberPermissionId)
        : [...prev, memberPermissionId],
    );
  };

  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        const fullName =
          `${member.userFirstName || ""} ${member.userLastName || ""}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const aSelected = selectedIds.includes(a.id);
        const bSelected = selectedIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        const aName = a.userFirstName || "";
        const bName = b.userFirstName || "";
        return aName.localeCompare(bName);
      });
  }, [members, searchQuery, selectedIds]);

  const participantsTitle =
    localParticipants.length > 0
      ? `Participants: ${localParticipants.map((p: any) => `${p.first_name || p.firstName || p.userFirstName} ${p.last_name || p.lastName || p.userLastName}`).join(", ")}`
      : "Add participants";

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center group/avatars rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
          disabled={externalLoading}
          title={participantsTitle}
        >
          <AvatarGroup className={cn("*:transition-all *:ring-1 *:ring-border *:group-hover/avatars:ring-2 *:group-hover/avatars:ring-primary/50", localParticipants.length <= 1 ? '-space-x-0' : '')}>
            {showLoading ? (
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 z-10">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              </div>
            ) : localParticipants.length > 0 ? (
              <>
                {localParticipants.slice(0, 1).map((participant: any) => (
                  <div key={participant.id} className="relative rounded-full">
                    <UserAvatar
                      firstName={participant.first_name || participant.firstName}
                      lastName={participant.last_name || participant.lastName}
                      profilePicture={participant.profile_picture || participant.profilePicture}
                      size="sm"
                    />
                  </div>
                ))}
                {localParticipants.length > 1 && (
                  <AvatarGroupCount>
                    +{localParticipants.length - 1}
                  </AvatarGroupCount>
                )}
              </>
            ) : (
              <div className="w-6 h-6 rounded-full border border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </AvatarGroup>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[320px] p-0"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => handleOpenChange(false)}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search participants"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {members.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No members configured
              </div>
            ) : (
              <>
                {filteredMembers.length === 0 && (
                  <CommandEmpty>No member found.</CommandEmpty>
                )}
                <CommandGroup>
                  {filteredMembers.map((member, index) => {
                    const isSelected = selectedIds.includes(member.id);
                    const prevMember = filteredMembers[index - 1];
                    const showAssignedTitle = index === 0 && isSelected;
                    const showOtherTitle = (index === 0 && !isSelected) || (index > 0 && selectedIds.includes(prevMember?.id) && !isSelected);
                    return (
                      <React.Fragment key={member.id}>
                        {showAssignedTitle && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Selected
                            </span>
                          </div>
                        )}
                        {showOtherTitle && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900/50">
                            <span className="text-xs tracking-wider text-gray-400 dark:text-gray-500">
                              Space Members
                            </span>
                          </div>
                        )}
                        <CommandItem
                          value={`${member.userFirstName} ${member.userLastName} ${member.userEmail}`}
                          onSelect={() => handleToggle(member.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              firstName={member.userFirstName}
                              lastName={member.userLastName}
                              profilePicture={member.userProfilePicture}
                              size="sm"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {member.userFirstName} {member.userLastName}
                              </span>
                              {member.userEmail && (
                                <span className="text-xs text-muted-foreground">
                                  {member.userEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      </React.Fragment>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
