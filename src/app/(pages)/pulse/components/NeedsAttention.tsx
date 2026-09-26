import React, { useState } from 'react';
import {
    AlertCircle,
    ArrowUpRight,
    Check,
    ChevronLeft,
    ChevronRight,
    Flame,
    PackageOpen,
    TrendingUp,
    TrendingDown,
    TriangleAlert,
    UserStar,
    Users,
    CircleDashed,
    ClockArrowUp,
    Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTaskSpaceStatusConfig } from "@/services/task-management/task-space.service";
import { getTicketSpaceStatusConfig } from "@/services/ticket-management/ticket-space.service";
import { patchTaskStatus, patchTaskDates, patchTaskProgress } from "@/services/task-management/task.service";
import { patchTicketStatus } from "@/services/ticket-management/ticket.service";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { ParentLevelsHoverCard } from '@/components/common/ParentLevelsHoverCard';

const getConditionMessage = (conditionStatus: string, dueDate: string | null, updatedAt: string | null) => {
    const statuses = conditionStatus.split(', ');
    const priorityOrder = ['overdue', 'stale', 'exceed effort', 'lagging', 'upcoming'];
    const priorityStatus = priorityOrder.find(s => statuses.includes(s)) || statuses[0] || 'unknown';

    if (priorityStatus === 'unknown') return null;

    if (priorityStatus === 'overdue' && dueDate) {
        const due = new Date(dueDate);
        return { label: `Was due on ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, danger: true, isOverdue: true, isDueToday: false };
    }
    if (priorityStatus === 'stale' && updatedAt) {
        const updated = new Date(updatedAt);
        return { label: `No change since ${updated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, danger: true, isOverdue: false, isDueToday: false };
    }
    if (priorityStatus === 'exceed effort') {
        return { label: 'Effort exceeded', danger: true, isOverdue: false, isDueToday: false };
    }
    if (priorityStatus === 'lagging') {
        return { label: 'Lagging behind schedule', danger: true, isOverdue: false, isDueToday: false };
    }
    if (priorityStatus === 'upcoming' && dueDate) {
        const due = new Date(dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { label: 'Due today', danger: true, isOverdue: false, isDueToday: true };
        if (diffDays === 1) return { label: 'Due tomorrow', danger: false, isOverdue: false, isDueToday: false };
        return { label: `Due in ${diffDays} days`, danger: false, isOverdue: false, isDueToday: false };
    }
    return { label: priorityStatus.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), danger: false, isOverdue: false, isDueToday: false };
};

interface AttentionItem {
    id: string;
    title: string;
    postType: 'Task' | 'Ticket';
    code: string;
    dueDate: string | null;
    spaceName: string | null;
    spaceCompletionPct: string | null;
    userRole: 'Assignee' | 'Co-Assignee' | 'Participant';
    statusId: number;
    statusBase: string;
    statusName: string;
    statusColor: string;
    spaceId: number;
    startDate: string | null;
    conditionStatus: string;
    updatedAt: string | null;
    progressPercentage?: number;
    actualEffort?: number;
    plannedEffort?: number;
}

const ITEMS_PER_PAGE = 5;

const PostTypeBadge = ({ type }: { type: 'Task' | 'Ticket' }) => {
    const isTask = type === 'Task';
    const color = isTask ? '#10B981' : '#3B82F6';

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0",
        )}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {type}
        </div>
    );
}

const UserRoleBadge = ({ role }: { role: 'Assignee' | 'Co-Assignee' | 'Participant' }) => {
    const Icon = {
        'Assignee': UserStar,
        'Co-Assignee': Users,
        'Participant': Users,
    }[role];

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 shrink-0",
        )}>
            <Icon className="w-3 h-3" />
            {role}
        </div>
    );
}

const ConditionStatusBadge = ({ status, item }: { status: string, item: AttentionItem }) => {
    if (status === 'unknown') return null;
    const icon = {
        'exceed effort': <Flame className="w-3 h-3 text-orange-500" />,
        'stale': <CircleDashed className="w-3 h-3 text-gray-500" />,
        'overdue': <TriangleAlert className="w-3 h-3 text-red-500" />,
        'lagging': <TrendingDown className="w-3 h-3 text-orange-500" />,
        'upcoming': <TrendingUp className="w-3 h-3 text-green-500" />,
    }[status];

    let tooltipText = '';
    if (status === 'overdue' && item.dueDate) {
        tooltipText = `Due Date: ${format(new Date(item.dueDate), 'MMM d, yyyy')}`;
    } else if (status === 'stale' && item.updatedAt) {
        tooltipText = `Last Updated: ${format(new Date(item.updatedAt), 'MMM d, yyyy')}`;
    } else if (status === 'upcoming' && item.dueDate) {
        tooltipText = `Due Date: ${format(new Date(item.dueDate), 'MMM d, yyyy')}`;
    } else if (status === 'exceed effort') {
        tooltipText = `Actual Effort (${item.actualEffort ?? 0}h) > Planned Effort (${item.plannedEffort ?? 0}h)`;
    } else if (status === 'lagging') {
        tooltipText = `Progress is lagging (${item.progressPercentage ?? 0}%)`;
    }

    const badge = (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0",
        )}>
            {icon}
            {status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </div>
    );

    if (!tooltipText) return badge;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="cursor-default">
                        {badge}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {tooltipText}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

import { getItemStatusConfig, getItemProgress, getItemDates, syncPulseRecord } from "@/services/pulse/pulse.service";

interface StatusChangeDropdownProps {
    item: AttentionItem;
    onStatusChange: (item: AttentionItem, statusId: number, statusesList?: any[]) => void;
}

const StatusChangeDropdown: React.FC<StatusChangeDropdownProps> = ({ item, onStatusChange }) => {
    const [statuses, setStatuses] = useState<any[]>([]);
    const [currentStatusId, setCurrentStatusId] = useState<number | null>(item.statusId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOpenChange = async (open: boolean) => {
        if (open) {
            setIsLoading(true);
            setError(null);
            setStatuses([]);
            try {
                const result = await getItemStatusConfig(item.postType, item.spaceId, parseInt(item.id));
                if (result) {
                    setStatuses(result.statuses || []);
                    if (result.currentStatusId) {
                        setCurrentStatusId(result.currentStatusId);
                    }
                }
            } catch (e) {
                setError("Failed to load statuses.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSelect = (statusId: number) => {
        setCurrentStatusId(statusId);
        onStatusChange(item, statusId, statuses);
    };

    return (
        <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="xs" className="text-xs">
                    <CircleDashed className="w-1 h-1" />
                    Change Status
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {isLoading && <DropdownMenuItem disabled>Loading...</DropdownMenuItem>}
                {error && <DropdownMenuItem disabled className="text-destructive">{error}</DropdownMenuItem>}
                {!isLoading && !error && statuses.length === 0 && <DropdownMenuItem disabled>No statuses available</DropdownMenuItem>}
                {!isLoading && !error && statuses.map((status) => {
                    const isSelected = currentStatusId === status.id;
                    return (
                        <DropdownMenuItem
                            key={status.id}
                            onSelect={() => handleSelect(status.id)}
                            className={`cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                                <span className="text-xs flex-1">{status.name}</span>
                                {isSelected && <Check className="w-4 h-4 text-primary" />}
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

import { Info } from "lucide-react";

interface NeedsAttentionProps {
    data: AttentionItem[];
    loading?: boolean;
    error?: Error | string | null;
    onActionComplete?: () => void;
    isDraft?: boolean;
    draftId?: number | null;
}

const NeedsAttention: React.FC<NeedsAttentionProps> = ({ data, loading, error, onActionComplete, isDraft, draftId }) => {
    const [page, setPage] = useState(0);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AttentionItem | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [progressPopoverOpen, setProgressPopoverOpen] = useState(false);
    const [tempProgress, setTempProgress] = useState(0);
    const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
    const paginatedData = data.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    const handleProgressUpdate = async () => {
        if (!selectedItem) return;
        setIsUpdatingProgress(true);
        try {
            await patchTaskProgress(Number(selectedItem.id), tempProgress);

            if (isDraft && draftId) {
                const metadata = {
                    ...selectedItem,
                    progressPercentage: tempProgress
                };
                const pulseSummary = JSON.stringify(metadata);
                await syncPulseRecord(draftId, {
                    postId: Number(selectedItem.id),
                    postType: selectedItem.postType,
                    pulseType: 'Need Attention',
                    pulseSummary: pulseSummary
                }).catch(console.error);
            }

            setProgressPopoverOpen(false);
            if (onActionComplete) onActionComplete();
        } finally {
            setIsUpdatingProgress(false);
        }
    };

    const handleStatusChange = async (item: AttentionItem, statusId: number, statusesList?: any[]) => {
        if (item.postType === 'Task') {
            await patchTaskStatus(Number(item.id), statusId);
        } else {
            await patchTicketStatus(Number(item.id), statusId);
        }

        if (isDraft && draftId) {
            const statusObj = statusesList?.find(s => s.id === statusId);
            const metadata = {
                ...item,
                statusId: statusId,
                statusName: statusObj?.name || item.statusName,
                statusColor: statusObj?.color || item.statusColor,
            };
            const pulseSummary = JSON.stringify(metadata);
            await syncPulseRecord(draftId, {
                postId: Number(item.id),
                postType: item.postType,
                pulseType: 'Need Attention',
                pulseSummary: pulseSummary
            }).catch(console.error);
        }

        if (onActionComplete) onActionComplete();
    };

    const handleDateSelect = (newDateRange: DateRange | undefined) => {
        setDateRange(newDateRange);
    }

    return (
        <div className="border rounded-lg border-l-2 border-l-red-400 overflow-hidden bg-card text-card-foreground">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <span className="flex items-center gap-2 text-sm font-semibold">
                    <TriangleAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
                    Need Attention
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs max-w-[250px] leading-relaxed">
                                Highlights tasks or tickets that are overdue, lagging, effort exceeded or otherwise need your attention.
                                <div className="mt-1 text-foreground">You can,</div>
                                <ul className="mt-1 space-y-2">
                                    <li className="flex items-center gap-2">
                                        <CircleDashed className="h-3.5 w-3.5 text-primary" />
                                        <strong className="font-bold text-foreground">Change current status</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                        <strong className="font-bold text-foreground">Update current progress</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <ClockArrowUp className="h-3.5 w-3.5 text-primary" />
                                        <strong className="font-bold text-foreground">Reschedule the work</strong>
                                    </li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </span>
                <span className='text-muted-foreground text-xs flex items-center'>
                    <span className="pr-2">
                        {isDraft ? "Need attention items on that week" : "Lagging work and what's coming up"}
                    </span>
                </span>
            </div>

            <div className="flex flex-col">
                {/* Skeletons */}
                {loading && (
                    Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-1.5 px-4 py-3 border-b last:border-b-0 animate-pulse">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 w-full">
                                    <Skeleton className="h-4 w-4 rounded-sm" />
                                    <Skeleton className="h-5 w-2/3 rounded" />
                                </div>
                                <Skeleton className="h-5 w-24 rounded-full shrink-0" />
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                                <Skeleton className="h-3 w-12 rounded" />
                                <Skeleton className="h-3 w-20 rounded" />
                                <Skeleton className="h-5 w-24 rounded-md" />
                                <Skeleton className="h-4 w-16 rounded" />
                                <Skeleton className="h-5 w-20 rounded-md" />
                            </div>
                        </div>
                    ))
                )}

                {/* Error state */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
                        <AlertCircle className="h-8 w-8 text-destructive/50" />
                        <p className="text-sm font-medium text-destructive">Failed to load items</p>
                        <p className="text-xs text-muted-foreground">Please try refreshing the page.</p>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && data.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 text-center py-8 px-4">
                        <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">Nothing needs your attention</p>
                        <p className="text-xs text-muted-foreground/60">Your prioritized work will appear here.</p>
                    </div>
                )}

                {/* Item list */}
                {!loading && !error && paginatedData.length > 0 && (
                    paginatedData.map((item) => {
                        const condition = getConditionMessage(item.conditionStatus, item.dueDate, item.updatedAt);
                        const link = item.postType === 'Task'
                            ? `/task-management/task/form?id=${item.id}`
                            : `/ticket-management/ticket/form?id=${item.id}`;

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 transition-colors border-b last:border-b-0 hover:bg-muted/50 dark:bg-card")}
                            >
                                <div className="flex-grow flex flex-col gap-1">
                                    <div className="flex items-center justify-start gap-2">
                                        <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                                        <PostTypeBadge type={item.postType} />
                                        {/*<UserRoleBadge role={item.userRole} />*/}
                                        {item.conditionStatus.split(', ').map((status) => (
                                            <ConditionStatusBadge key={status} status={status} item={item} />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <ParentLevelsHoverCard id={Number(item.id)} postType={item.postType} code={item.code} />
                                        {item.spaceName && (
                                            <>
                                                <span>·</span>
                                                <span>{item.spaceName}</span>
                                            </>
                                        )}
                                        {item.spaceCompletionPct && (
                                            <>
                                                <span>·</span>
                                                <span>{item.progressPercentage}% progressing</span>
                                            </>
                                        )}
                                        {condition && (
                                            <>
                                                <span>·</span>
                                                <span>{condition.label}</span>
                                            </>
                                        )}
                                        {item.userRole && (
                                            <>
                                                <span>·</span>
                                                <UserRoleBadge role={item.userRole} />
                                                {/*<span>*/}
                                                {/*    {item.userRole === 'Assignee' ? 'You are the Assignee' : `You are a ${item.userRole}`}*/}
                                                {/*</span>*/}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                    {condition?.isOverdue && (
                                        <>
                                            <StatusChangeDropdown item={item} onStatusChange={handleStatusChange} />
                                            {item.postType === 'Task' && (
                                                <Popover open={datePickerOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                                                    if (open) {
                                                        setSelectedItem(item);
                                                        setDateRange({ from: item.startDate ? new Date(item.startDate) : undefined, to: item.dueDate ? new Date(item.dueDate) : undefined });
                                                        setDatePickerOpen(true);
                                                    } else {
                                                        setDatePickerOpen(false);
                                                        if (dateRange?.from && dateRange?.to) {
                                                            const prevStart = item.startDate ? format(new Date(item.startDate), 'yyyy-MM-dd') : null;
                                                            const prevEnd = item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : null;
                                                            const newStart = format(dateRange.from, 'yyyy-MM-dd');
                                                            const newEnd = format(dateRange.to, 'yyyy-MM-dd');
                                                            if (prevStart !== newStart || prevEnd !== newEnd) {
                                                                patchTaskDates(Number(item.id), newStart, newEnd).then(() => {
                                                                    if (isDraft && draftId) {
                                                                        const metadata = {
                                                                            ...item,
                                                                            startDate: newStart,
                                                                            dueDate: newEnd
                                                                        };
                                                                        const pulseSummary = JSON.stringify(metadata);
                                                                        syncPulseRecord(draftId, {
                                                                            postId: Number(item.id),
                                                                            postType: item.postType,
                                                                            pulseType: 'Need Attention',
                                                                            pulseSummary: pulseSummary
                                                                        }).catch(console.error).finally(() => {
                                                                            if (onActionComplete) onActionComplete();
                                                                        });
                                                                    } else {
                                                                        if (onActionComplete) onActionComplete();
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="xs" className="text-xs">
                                                            <ClockArrowUp className="w-1 h-1" />
                                                            Reschedule
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 overflow-hidden" align="end">
                                                        <Calendar
                                                            mode="range"
                                                            defaultMonth={dateRange?.from ?? dateRange?.to}
                                                            selected={dateRange}
                                                            onSelect={handleDateSelect}
                                                            numberOfMonths={2}
                                                        />
                                                        {(dateRange?.from || dateRange?.to) && (
                                                            <div className="border-t px-3 py-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleDateSelect(undefined); }}
                                                                    className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                                                                >
                                                                    Clear all dates
                                                                </button>
                                                            </div>
                                                        )}
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </>
                                    )}
                                    {condition?.isDueToday && (
                                        <>
                                            {/* Open button moved to dynamic logic at the bottom */}
                                            {item.postType === 'Task' && (
                                                <Popover open={datePickerOpen && selectedItem?.id === item.id} onOpenChange={async (open) => {
                                                    if (open) {
                                                        setSelectedItem(item);
                                                        setDatePickerOpen(true);
                                                        try {
                                                            const res = await getItemDates(item.postType, parseInt(item.id));
                                                            setDateRange({
                                                                from: res.startDate ? new Date(res.startDate) : (item.startDate ? new Date(item.startDate) : undefined),
                                                                to: res.dueDate ? new Date(res.dueDate) : (item.dueDate ? new Date(item.dueDate) : undefined)
                                                            });
                                                        } catch (e) {
                                                            setDateRange({ from: item.startDate ? new Date(item.startDate) : undefined, to: item.dueDate ? new Date(item.dueDate) : undefined });
                                                        }
                                                    } else {
                                                        setDatePickerOpen(false);
                                                        if (dateRange?.from && dateRange?.to) {
                                                            const prevStart = item.startDate ? format(new Date(item.startDate), 'yyyy-MM-dd') : null;
                                                            const prevEnd = item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : null;
                                                            const newStart = format(dateRange.from, 'yyyy-MM-dd');
                                                            const newEnd = format(dateRange.to, 'yyyy-MM-dd');
                                                            if (prevStart !== newStart || prevEnd !== newEnd) {
                                                                patchTaskDates(Number(item.id), newStart, newEnd).then(() => {
                                                                    if (isDraft && draftId) {
                                                                        const metadata = {
                                                                            ...item,
                                                                            startDate: newStart,
                                                                            dueDate: newEnd
                                                                        };
                                                                        const pulseSummary = JSON.stringify(metadata);
                                                                        syncPulseRecord(draftId, {
                                                                            postId: Number(item.id),
                                                                            postType: item.postType,
                                                                            pulseType: 'Need Attention',
                                                                            pulseSummary: pulseSummary
                                                                        }).catch(console.error).finally(() => {
                                                                            if (onActionComplete) onActionComplete();
                                                                        });
                                                                    } else {
                                                                        if (onActionComplete) onActionComplete();
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="xs" className="text-xs">
                                                            <ClockArrowUp className="w-1 h-1" />
                                                            Reschedule
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 overflow-hidden" align="end">
                                                        <Calendar
                                                            mode="range"
                                                            defaultMonth={dateRange?.from ?? dateRange?.to}
                                                            selected={dateRange}
                                                            onSelect={handleDateSelect}
                                                            numberOfMonths={2}
                                                        />
                                                        {(dateRange?.from || dateRange?.to) && (
                                                            <div className="border-t px-3 py-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleDateSelect(undefined); }}
                                                                    className="w-full text-xs text-red-500 hover:text-red-700 transition-colors text-center py-0.5"
                                                                >
                                                                    Clear all dates
                                                                </button>
                                                            </div>
                                                        )}
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </>
                                    )}
                                    {item.conditionStatus?.includes('lagging') && item.postType === 'Task' && (
                                        <Popover open={progressPopoverOpen && selectedItem?.id === item.id} onOpenChange={async (open) => {
                                            if (open) {
                                                setSelectedItem(item);
                                                setProgressPopoverOpen(true);
                                                try {
                                                    const res = await getItemProgress(item.postType, parseInt(item.id));
                                                    if (res.progressPercentage !== null) {
                                                        setTempProgress(res.progressPercentage);
                                                    } else {
                                                        setTempProgress(item.progressPercentage || 0);
                                                    }
                                                } catch (e) {
                                                    setTempProgress(item.progressPercentage || 0);
                                                }
                                            } else {
                                                setProgressPopoverOpen(false);
                                            }
                                        }}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="xs" className="text-[11px]">
                                                    <TrendingUp className="w-2 h-2" />
                                                    Update Progress
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-4" align="end" onClick={(e) => e.stopPropagation()}>
                                                <div className="space-y-4">
                                                    {/*<h4 className="font-medium text-sm leading-none">Update Progress</h4>*/}
                                                    <div className="flex items-center gap-4">
                                                        <Slider
                                                            value={[tempProgress]}
                                                            onValueChange={(val) => setTempProgress(val[0])}
                                                            max={100}
                                                            step={1}
                                                        />
                                                        <span className="text-sm font-medium w-9 text-right">{tempProgress}%</span>
                                                    </div>
                                                    <div className="pt-2">
                                                        <Button size="sm" className="w-full h-8" onClick={handleProgressUpdate} disabled={isUpdatingProgress}>
                                                            {isUpdatingProgress ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                                                            Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                    {(() => {
                                        let actionCount = 0;
                                        if (condition?.isOverdue) actionCount++;
                                        if ((condition?.isOverdue || condition?.isDueToday) && item.postType === 'Task') actionCount++;
                                        if (item.conditionStatus?.includes('lagging') && item.postType === 'Task') actionCount++;

                                        if (actionCount < 2) {
                                            return (
                                                <a href={link} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="link" size="xs" className="text-[11px]">
                                                        Open <ArrowUpRight className="h-0.5 w-0.5" />
                                                    </Button>
                                                </a>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className={`flex items-center px-4 py-1.5 border-t bg-muted/30 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                    <div className="flex-1" />

                    {totalPages > 1 ? (
                        <div className="flex items-center justify-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={loading || page === 0}
                                className="p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Previous"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i)}
                                        className={`h-1.5 rounded-full transition-all ${i === page ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"
                                            }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={loading || page >= totalPages - 1}
                                className="p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1" />
                    )}

                    <div className="flex-1 flex justify-end">
                        <span className="text-xs text-muted-foreground tabular-nums font-medium">
                            {!loading && !error && totalPages > 1 && `Showing ${page * ITEMS_PER_PAGE + 1} - ${Math.min((page + 1) * ITEMS_PER_PAGE, data.length)} of ${data.length}`}
                            {!loading && !error && totalPages <= 1 && `${data.length} item${data.length === 1 ? '' : 's'}`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NeedsAttention;