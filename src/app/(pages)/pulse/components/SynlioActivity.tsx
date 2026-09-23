"use client";
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Clock,
  Link as Link2,
  Unlink,
  Plus,
  MousePointerClick
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getHierarchyLevelIcon, getTicketTypeIcon } from "@/enums/space-configure-icon.enum";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { ParentLevelsHoverCard } from '@/components/common/ParentLevelsHoverCard';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { unlinkTaskFromActivity, Activity } from '@/services/activity.service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityDialog } from './ActivityDialog';
import { WorkLogPopover } from './WorkLogPopover';
import { useRouter } from 'next/navigation';

const ITEMS_PER_PAGE = 5;

interface ChangePayload {
  from: any;
  to: any;
}

interface Change {
  event_id: number;
  event_type: string;
  version: number;
  actor_id: string;
  payload: Record<string, ChangePayload> | Record<string, any>;
  total_effort_in_range: number;
}

interface ActivityItem {
  postType: 'Task' | 'Ticket' | 'Activity';
  id: number;
  code: string;
  name: string;
  icon: string;
  color: string;
  space: string;
  spaceId: number;
  statusBase: string;
  changeOccurredAt: string;
  totalEffortInRange: number;
  change: Change;
}

interface GroupedActivity {
  id: number;
  postType: 'Task' | 'Ticket' | 'Activity';
  name: string;
  code: string;
  icon: string;
  color: string;
  space: string;
  spaceId: number;
  statusBase: string;
  mostRecentChangeAt: string;
  totalEffortInRange: number;
  changes: ActivityItem[];
}

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SynlioActivityProps {
  data: ActivityItem[];
  loading: boolean;
  error: Error | null;
  startDate?: string;
  endDate?: string;
  onActionComplete?: () => void;
  user?: any;
}

const renderIcon = (iconName: string, color: string, postType: 'Task' | 'Ticket') => {
  const IconComponent = postType === 'Task'
    ? getHierarchyLevelIcon(iconName)
    : getTicketTypeIcon(iconName);
  const iconProps = { color, className: 'h-3.5 w-3.5' };
  return <IconComponent {...iconProps} />;
};

const PostTypeBadge = ({ type }: { type: 'Task' | 'Ticket' | 'Activity' }) => {
  const color = type === 'Task' ? '#10B981' : type === 'Ticket' ? '#3B82F6' : '#F59E0B';

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0",
    )}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {type}
    </div>
  );
}

/** Badge for standalone Activity items */
const ActivityBadge = () => (
  <div className={cn(
    "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0",
  )}>
    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#F59E0B' }} />
    Activity
  </div>
);

const formatEffort = (hoursValue: number, short: boolean = false): string => {
  if (hoursValue <= 0) return '';
  const hours = Math.floor(hoursValue);
  const minutes = Math.round((hoursValue - hours) * 60);
  let result = '';
  if (hours > 0) {
    result += `${hours}h`;
  }
  if (minutes > 0) {
    result += ` ${minutes}m`;
  }
  if (short) return result.trim();
  return 'You logged ' + result.trim();
};

const formatDurationMinutes = (minutes: number | null): string => {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return 'none';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return String(value);
};


const formatSingleChange = (item: ActivityItem, capitalizeFirst: boolean = false, currentUserEmail?: string, highlight: boolean = true, currentUserName?: string): React.ReactNode => {
  const { change } = item;
  const { payload, event_type, actor_id } = change;

  const isNotMe = Boolean(actor_id && currentUserEmail && actor_id !== currentUserEmail);
  const formatName = (uName: string, uEmail?: string) => {
    if (uEmail && currentUserEmail && uEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
                return !isNotMe ? "yourself" : "you";
            }
            if (currentUserName && uName === currentUserName) {
                return !isNotMe ? "yourself" : "you";
            }
    
    return uName;
  };

  let actionText: React.ReactNode = 'updated the item';

  if (event_type === 'TASK_CREATED' || event_type === 'TICKET_CREATED') {
    actionText = 'created the item';
  } else if (event_type === 'TASK_DELETED' || event_type === 'TICKET_DELETED') {
    actionText = 'deleted the item';
  } else if (event_type === 'COMMENT_ADDED' || event_type === 'TICKET_COMMENT_ADDED') {
    actionText = 'added a comment';
  } else if (event_type === 'TASK_UPDATED' || event_type === 'TICKET_UPDATED') {
    let keys = Object.keys(payload || {}).filter(k => !['id', 'taskId', 'ticketId', 'updatedBy', 'changeOccurredAt'].includes(k));

    // If a 'Name' field exists alongside an 'Id' field, prefer the Name field (e.g., statusName > statusId)
    keys = keys.filter(k => {
      if (k.endsWith('Id')) {
        const nameKey = k.replace(/Id$/, 'Name');
        if (keys.includes(nameKey)) return false; // hide the Id field since we have the Name field
      }
      return true;
    });

    if (keys.length > 0) {
      const fieldMappings: Record<string, string> = {
        statusName: 'Status',
        severityName: 'Severity',
        assigneeName: 'Assignee',
        queueName: 'Queue',
        ticketTypeName: 'Ticket Type',
        progressPercentage: 'Progress',
        description: 'Description',
        name: 'Title',
      };

      // Prioritize keys that are in fieldMappings
      keys.sort((a, b) => {
        const aMapped = a in fieldMappings;
        const bMapped = b in fieldMappings;
        if (aMapped && !bMapped) return -1;
        if (!aMapped && bMapped) return 1;
        return 0;
      });

      const firstKey = keys[0];
      const displayField = fieldMappings[firstKey] || firstKey.replace(/([A-Z])/g, ' $1').toLowerCase();

      const fieldData = payload[firstKey];
      if (typeof fieldData === 'object' && fieldData !== null) {
        let from = fieldData.from;
        let to = fieldData.to;

        if (displayField.toLowerCase() === 'description') {
          if (from && to) actionText = 'updated description';
          else if (to) actionText = 'added a description';
          else actionText = 'removed description';
        } else {
          const displayKey = firstKey;

          if (displayKey === 'assigneeName') {
            const fromUser = { name: from, pic: payload.assigneeProfilePicUrl?.from, email: payload.assigneeEmail?.from };
            const toUser = { name: to, pic: payload.assigneeProfilePicUrl?.to, email: payload.assigneeEmail?.to };
            if (from && to) {
              actionText = (
                <>
                  <span>changed assignee from </span>
                  <span className="inline-flex items-center gap-1 align-middle mx-0.5">
                    <Avatar className="h-5 w-5"><AvatarImage src={fromUser.pic} /><AvatarFallback className="text-[9px] bg-primary text-white dark:text-gray-900">{getInitials(fromUser.name)}</AvatarFallback></Avatar>
                    <span className={highlight ? "font-medium text-foreground" : ""}>{formatName(fromUser.name, fromUser.email)}</span>
                  </span>
                  <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                  <span className="inline-flex items-center gap-1 align-middle mx-0.5">
                    <Avatar className="h-5 w-5"><AvatarImage src={toUser.pic} /><AvatarFallback className="text-[9px] bg-primary text-white dark:text-gray-900">{getInitials(toUser.name)}</AvatarFallback></Avatar>
                    <span className={highlight ? "font-medium text-foreground" : ""}>{formatName(toUser.name, toUser.email)}</span>
                  </span>
                </>
              );
            } else if (to) {
              actionText = (
                <>
                  <span>added </span>
                  <span className="inline-flex items-center gap-1 align-middle mx-0.5">
                    <Avatar className="h-5 w-5"><AvatarImage src={toUser.pic} /><AvatarFallback className="text-[9px] bg-primary text-white dark:text-gray-900">{getInitials(toUser.name)}</AvatarFallback></Avatar>
                    <span className={highlight ? "font-medium text-foreground" : ""}>{formatName(toUser.name, toUser.email)}</span>
                  </span>
                  <span> as assignee</span>
                </>
              );
            } else if (from) {
              actionText = (
                <>
                  <span>removed </span>
                  <span className="inline-flex items-center gap-1 align-middle mx-0.5">
                    <Avatar className="h-5 w-5"><AvatarImage src={fromUser.pic} /><AvatarFallback className="text-[9px] bg-primary text-white dark:text-gray-900">{getInitials(fromUser.name)}</AvatarFallback></Avatar>
                    <span className={highlight ? "font-medium text-foreground" : ""}>{formatName(fromUser.name, fromUser.email)}</span>
                  </span>
                  <span> as assignee</span>
                </>
              );
            }
          } else {
            const isProgress = firstKey === 'progressPercentage';
            const fromFormatted = formatValue(from) + (isProgress && from != null ? '%' : '');
            const toFormatted = formatValue(to) + (isProgress && to != null ? '%' : '');
            if (from && to) {
              actionText = (
                <>
                  <span>changed {displayField.toLowerCase()} from </span>
                  <span className={highlight ? "font-medium text-foreground" : ""}>{fromFormatted}</span>
                  <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                  <span className={highlight ? "font-medium text-foreground" : ""}>{toFormatted}</span>
                </>
              );
            } else if (to) {
              actionText = <><span>set {displayField.toLowerCase()} to </span><span className={highlight ? "font-medium text-foreground" : ""}>{toFormatted}</span></>;
            } else if (from) {
              actionText = <><span>removed {displayField.toLowerCase()} </span><span className={highlight ? "font-medium text-foreground" : ""}>{fromFormatted}</span></>;
            }
          }
        }
      }
    }
  } else if (event_type === 'TASK_CO_ASSIGNEE_ADDED' || event_type === 'TICKET_PARTICIPANT_ADDED') {
    const name = (payload as any).name;
    const email = (payload as any).email;
    const pic = (payload as any).profilePicUrl;
    if (name) {
      actionText = (
        <>
          <span>added participant </span>
          <span className="inline-flex items-center gap-1 align-middle mx-0.5">
            <Avatar className="h-5 w-5"><AvatarImage src={pic} /><AvatarFallback className="text-[9px] bg-primary text-white dark:text-gray-900">{getInitials(name)}</AvatarFallback></Avatar>
            <span className={highlight ? "font-medium text-foreground" : ""}>{formatName(name, email)}</span>
          </span>
        </>
      );
    } else {
      actionText = `added a participant`;
    }
  } else if (event_type === 'TASK_CO_ASSIGNEE_REMOVED' || event_type === 'TICKET_PARTICIPANT_REMOVED') {
    const name = (payload as any).name;
    const email = (payload as any).email;
    const pic = (payload as any).profilePicUrl;
    if (name) {
      actionText = (
        <>
          <span>removed participant </span>
          <span className="inline-flex items-center gap-1 align-middle mx-0.5">
            <Avatar className="h-5 w-5"><AvatarImage src={pic} /><AvatarFallback className="text-[9px] bg-primary text-white dark:text-gray-900">{getInitials(name)}</AvatarFallback></Avatar>
            <span className={highlight ? "font-medium text-foreground" : ""}>{formatName(name, email)}</span>
          </span>
        </>
      );
    } else {
      actionText = `removed a participant`;
    }
  } else if (event_type === 'TASK_ATTACHMENT_UPLOADED' || event_type === 'TICKET_ATTACHMENT_UPLOADED') {
    actionText = 'uploaded an attachment';
  } else if (event_type === 'TASK_ATTACHMENT_DELETED' || event_type === 'TICKET_ATTACHMENT_DELETED') {
    actionText = 'deleted an attachment';
  }

  const actorDisplay = isNotMe
    ? <span className={highlight ? "font-semibold text-foreground" : ""}>{actor_id}</span>
    : <span className={highlight ? "font-semibold text-foreground" : ""}>You</span>;

  return (
    <>
      {actorDisplay}{' '}
      {actionText}
    </>
  );
};

const getChangeSummary = (changes: ActivityItem[], user?: any): React.ReactNode => {
  if (changes.length === 1) {
    const currentUserName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name}` : undefined);
    return formatSingleChange(changes[0], true, user?.email, false, currentUserName);
  }

  const changeCounts: Record<string, number> = {};

  const fieldMappings: Record<string, string> = {
    statusName: 'Status',
    severityName: 'Severity',
    assigneeName: 'Assignee',
    ticketTypeName: 'Type',
    queueName: 'Queue',
    impactName: 'Impact',
    ticketSlaName: 'SLA',
    name: 'Name',
    description: 'Description',
    progressPercentage: 'Progress',
    special: 'Special',
    effort: 'Effort',
    startDate: 'Start Date',
    dueDate: 'Due Date',
  };

  changes.forEach(item => {
    if (item.change.event_type.includes('UPDATED')) {
      for (const key in item.change.payload) {
        if (fieldMappings[key]) {
          const fieldName = fieldMappings[key];
          changeCounts[fieldName] = (changeCounts[fieldName] || 0) + 1;
        }
      }
    }
  });

  if (Object.keys(changeCounts).length === 0) return "Multiple updates";

  const summaryArray = Object.entries(changeCounts)
    .map(([field, count]) => `${count} ${field}`);

  const summaryText = summaryArray.length > 1
    ? summaryArray.join(', ') + ' and ' + summaryArray.pop() + ' changed'
    : summaryArray[0] + ' changed';

  const firstItem = changes[0];
  const actorId = firstItem.change.actor_id;
  const isNotMe = Boolean(actorId && !actorId.includes('You'));
  const actorDisplay = isNotMe ? <span>{actorId}</span> : <span>You</span>;

  return (
    <>
      {actorDisplay} changed {summaryText.replace(' changed', '').toLowerCase()}
    </>
  );
}

// EffortUpdatePopover was replaced by WorkLogPopover

/** Row for standalone Activity items */
const ActivityRow = ({
  activity,
  isLast,
  onActionComplete,
}: {
  activity: Activity;
  isLast: boolean;
  onActionComplete?: () => void;
}) => {
  const router = useRouter();
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [localActivity, setLocalActivity] = useState(activity);

  const durationHours = localActivity.durationMinutes ? localActivity.durationMinutes / 60 : 0;
  const isLinked = !!localActivity.taskId;

  const handleLinkTask = () => {
    // Navigate to task picker with activityId as query param (same pattern as meetings)
    router.push(`/task-management/task-space?activityId=${localActivity.id}&activityTitle=${encodeURIComponent(localActivity.title)}`);
  };

  const handleUnlinkTask = async () => {
    setUnlinking(true);
    try {
      const updated = await unlinkTaskFromActivity(localActivity.id);
      setLocalActivity(prev => ({ ...prev, taskId: null, linkedTaskCode: null, linkedTaskName: null }));
      toast.success('Task unlinked');
      onActionComplete?.();
    } catch {
      toast.error('Failed to unlink task');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 border-b last:border-b-0 dark:bg-card">
      {/* Left: Activity info */}
      <div className="grow flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium line-clamp-1">{localActivity.title}</span>
          <ActivityBadge />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          {isLinked && localActivity.linkedTaskCode && (
            <>
              <ParentLevelsHoverCard
                id={localActivity.taskId!}
                postType="Task"
                code={localActivity.linkedTaskCode}
                className="text-xs"
              />
              <span>·</span>
            </>
          )}
          {localActivity.startDate && (
            <span className="whitespace-nowrap">
              {format(new Date(localActivity.startDate), 'MMM d')}
              {localActivity.endDate && localActivity.endDate !== localActivity.startDate
                ? ` — ${format(new Date(localActivity.endDate), 'MMM d, yyyy')}`
                : `, ${format(new Date(localActivity.startDate), 'yyyy')}`}
            </span>
          )}
          {localActivity.description && (
            <>
              <span>·</span>
              <span className="truncate max-w-[200px]">{localActivity.description}</span>
            </>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="shrink-0 flex items-center justify-center w-16 mr-2">
        {durationHours > 0 && (
          <span className="flex items-center gap-1 text-sm font-semibold tabular-nums whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {formatEffort(durationHours, true)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isLinked ? (
          <Button
            variant="outline"
            size="xs"
            className="text-xs h-6 gap-1 hover:bg-muted dark:hover:bg-gray-700/50"
            onClick={handleUnlinkTask}
            disabled={unlinking}
          >
            {unlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
            Unlink Task
          </Button>
        ) : (
          <Button
            variant="outline"
            size="xs"
            className="text-xs h-6 gap-1 hover:bg-muted dark:hover:bg-gray-700/50"
            onClick={handleLinkTask}
            disabled={linking}
          >
            <Link2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            Link Task
          </Button>
        )}
      </div>
    </div>
  );
};

const SynlioActivity: React.FC<SynlioActivityProps> = ({ data, loading, error, startDate, endDate, user, onActionComplete }) => {
  const [page, setPage] = useState(0);
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  const [showCompletedWork, setShowCompletedWork] = useState(false);
  const [showInProgressWork, setShowInProgressWork] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  const groupedData = useMemo(() => {
    if (!data) return [];
    const groups: Record<string, GroupedActivity> = {};
    data.forEach(item => {
      if (!groups[item.id]) {
        groups[item.id] = {
          id: item.id,
          postType: item.postType,
          name: item.name,
          code: item.code,
          icon: item.icon,
          color: item.color,
          space: item.space,
          spaceId: item.spaceId,
          statusBase: item.statusBase,
          mostRecentChangeAt: item.changeOccurredAt,
          totalEffortInRange: item.totalEffortInRange,
          changes: [],
        };
      }
      groups[item.id].changes.push(item);
      if (new Date(item.changeOccurredAt) > new Date(groups[item.id].mostRecentChangeAt)) {
        groups[item.id].mostRecentChangeAt = item.changeOccurredAt;
      }
      if ((item.totalEffortInRange || 0) > (groups[item.id].totalEffortInRange || 0)) {
        groups[item.id].totalEffortInRange = item.totalEffortInRange;
      }
    });
    let filteredGroups = Object.values(groups).sort((a, b) => {
      const aNoEffort = !a.totalEffortInRange || a.totalEffortInRange <= 0;
      const bNoEffort = !b.totalEffortInRange || b.totalEffortInRange <= 0;
      if (aNoEffort && !bNoEffort) return -1;
      if (!aNoEffort && bNoEffort) return 1;
      return new Date(b.mostRecentChangeAt).getTime() - new Date(a.mostRecentChangeAt).getTime();
    });

    if (showCompletedWork || showInProgressWork) {
      filteredGroups = filteredGroups.filter(g => {
        if (showCompletedWork && showInProgressWork) {
          return g.statusBase === 'Finished' || g.statusBase === 'Processing';
        }
        if (showCompletedWork) return g.statusBase === 'Finished';
        if (showInProgressWork) return g.statusBase === 'Processing';
        return true;
      });
    }

    return filteredGroups;
  }, [data, showCompletedWork, showInProgressWork]);

  const allItems: GroupedActivity[] = useMemo(() => {
    return groupedData;
  }, [groupedData]);

  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  const paginatedItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalCount = allItems.length;

  return (
    <div className="border rounded-lg border-l-3 border-l-primary overflow-hidden bg-card text-card-foreground shadow-xs">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <MousePointerClick className="h-4 w-4 text-primary shrink-0" />
          Synlio Activity
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs max-w-[300px] leading-relaxed">
                Displays recent updates to your tasks &amp; tickets, including the hours you've spent on each work.
                <div className="mt-1 text-foreground">You can,</div>
                <ul className="mt-1 space-y-2">
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <strong className="font-bold text-foreground">Log time on your work</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <strong className="font-bold text-foreground">Add activity</strong>
                  </li>
                  {/* <li className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <strong className="font-bold text-foreground">View standalone activity</strong>
                  </li> */}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        <div className="flex items-center gap-2 mx-4 mr-auto">
          {/* New Activity button */}
          <Button
            variant="outline"
            size="xs"
            className="text-xs h-6 px-2 font-medium cursor-pointer gap-1.5 border-dashed"
            onClick={() => setIsActivityDialogOpen(true)}
          >
            <Plus className="w-3 h-3" />
            Add Activity
          </Button>
          <div className="flex items-center gap-2 pl-2.5">
            <Checkbox
              id="show-completed"
              className="dark:bg-background"
              checked={showCompletedWork}
              onCheckedChange={(checked) => {
                setShowCompletedWork(checked as boolean);
                setPage(0);
              }}
            />
            <Label htmlFor="show-completed" className={cn("text-xs font-medium cursor-pointer", !showCompletedWork && "text-muted-foreground/80")}>
              Completed work
            </Label>
          </div>
          
          <div className="flex items-center gap-2 pl-2.5">
            <Checkbox
              id="show-inprogress"
              className="dark:bg-background"
              checked={showInProgressWork}
              onCheckedChange={(checked) => {
                setShowInProgressWork(checked as boolean);
                setPage(0);
              }}
            />
            <Label htmlFor="show-inprogress" className={cn("text-xs font-medium cursor-pointer", !showInProgressWork && "text-muted-foreground/80")}>
              In progress work
            </Label>
          </div>
        </div>
        <span className='text-muted-foreground text-xs flex items-center'>
          <span className="pr-2">
            See changes you done to your work
          </span>
        </span>
      </div>

      <div className="flex flex-col">
        {loading && Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
            <div className="grow flex flex-col gap-1">
              <div className="flex items-center justify-start gap-2">
                <Skeleton className="h-5 w-1/3 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center justify-between mt-1">
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>
          </div>
        ))}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <p className="text-sm font-medium text-destructive">Failed to load activity</p>
            <p className="text-xs text-muted-foreground">Please try refreshing the page.</p>
          </div>
        )}

        {!loading && !error && paginatedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
            <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground/60">Your recent updates will appear here.</p>
          </div>
        )}

        {!loading && !error && paginatedItems.map((group, index) => {
          let link = '#';
          if (group.postType === 'Task') {
            link = `/task-management/task/form?id=${group.id}`;
          } else if (group.postType === 'Ticket') {
            link = `/ticket-management/ticket/form?ticketSpaceId=${group.spaceId}&edit=true&ticketId=${group.id}`;
          }
          const isExpanded = openGroupId === group.id;
          const formattedEffort = formatEffort(group.totalEffortInRange, true);
          const hasMultipleChanges = group.changes.length > 1;

          return (
            <Collapsible key={group.id} className="border-b last:border-b-0" open={isExpanded} onOpenChange={() => hasMultipleChanges && setOpenGroupId(isExpanded ? null : group.id)}>
              <div className={cn("group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 dark:bg-card", isExpanded && "border-b")}>
                <div className="grow flex flex-col gap-1">
                  <div className="flex items-center justify-start gap-2">
                    <span className="text-sm font-medium line-clamp-1">{group.name}</span>
                    <PostTypeBadge type={group.postType} />
                  </div>
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        {group.postType === 'Activity' ? (
                          <>
                            <span>Manual Activity</span>
                            <span>·</span>
                            <span>{group.space}</span>
                            <span>·</span>
                            <span>Occured at {format(new Date(group.mostRecentChangeAt), 'MMM d')}</span>
                          </>
                        ) : (
                          <>
                            <ParentLevelsHoverCard id={group.id} postType={group.postType} code={group.code} />
                            <span>·</span>
                            <span>{group.space}</span>
                          </>
                        )}
                        {group.postType !== 'Activity' && (
                          <>
                            <span>·</span>
                            <span>{getChangeSummary(group.changes, user)}</span>
                          </>
                        )}
                        {hasMultipleChanges && (
                          <>
                            <span>·</span>
                            <span className="text-primary hover:underline">
                              {isExpanded ? 'Hide details' : 'See details'}
                            </span>
                          </>
                        )}
                      </div>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <WorkLogPopover 
                    postId={group.id} 
                    postType={group.postType}
                    postCode={group.code}
                    postName={group.name}
                    spaceId={group.spaceId}
                    spaceName={group.space}
                    statusBase={group.statusBase}
                    user={user}
                    currentEffort={group.totalEffortInRange}
                    startDate={startDate} 
                    endDate={endDate} 
                    onActionComplete={onActionComplete} 
                  />
                  {link === '#' ? (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button variant="link" size="xs" className="text-[11px] opacity-50" disabled>
                              Open <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          This is a manual activity
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="link" size="xs" className="text-[11px]">
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              {hasMultipleChanges && (
                <CollapsibleContent className="px-4 pt-2 pb-3 bg-muted/40">
                  <div className="pl-2 pt-2 pb-1 space-y-0">
                    {[...group.changes].sort((a, b) => {
                      const isACreated = a.change.event_type?.includes('CREATED');
                      const isBCreated = b.change.event_type?.includes('CREATED');
                      if (isACreated && !isBCreated) return 1;
                      if (!isACreated && isBCreated) return -1;
                      return new Date(b.changeOccurredAt).getTime() - new Date(a.changeOccurredAt).getTime();
                    }).map((changeItem, index, arr) => {
                      const isLast = index === arr.length - 1;
                      const occurredDate = new Date(changeItem.changeOccurredAt);
                      const timeStr = formatRelativeTime(occurredDate);

                      const actorId = changeItem.change?.actor_id;
                      const isNotMe = Boolean(actorId && user?.email && actorId !== user?.email);

                      return (
                        <div key={index} className="flex relative">
                          <div className={cn("flex-1 min-w-0 pt-1", !isLast && "pb-2")}>
                            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                              {
            (() => {
                const currentUserName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name}` : undefined);
                return formatSingleChange(changeItem, false, user?.email, true, currentUserName);
            })()
        }
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {timeStr}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
      </div>

      {totalPages > 0 && (
        <div className={`flex items-center py-1.5 px-4 border-t bg-muted/30 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="flex-1" />

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={loading || page === 0} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Previous">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i)} className={`h-1.5 rounded-full transition-all ${i === page ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"}`} />
                ))}
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={loading || page >= totalPages - 1} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex-1 flex justify-end">
            <span className="text-xs text-muted-foreground tabular-nums font-medium">
              {!loading && !error && totalPages > 1 && `Showing ${page * ITEMS_PER_PAGE + 1} - ${Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of ${totalCount}`}
              {!loading && !error && totalPages <= 1 && `${totalCount} item${totalCount === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>
      )}

      {/* New Activity Dialog */}
      <ActivityDialog
        open={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
        onCreated={onActionComplete}
        pulseWeekEndDate={endDate}
      />
    </div>
  );
};

export default SynlioActivity;