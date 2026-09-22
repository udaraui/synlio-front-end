"use client";
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PulseType } from "@/enums/pulse-type.enum";
import { cn, formatRelativeTime } from "@/lib/utils";
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { ArrowRight, TriangleAlert, UserStar, Users, Video, ChevronLeft, ChevronRight, PackageOpen, Loader2, Check, X, Info, Clock, ClockPlus, MousePointerClick, CalendarDays, Filter } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getAllResourcesByCompanyOnly, getMyDirectReports } from '@/services/resource-service';
import { approvePulseWeek, forwardPulseWeek, rejectPulseWeek, submitPulseWeek, searchPulseWeeks, getPulseWeekPulses, logTimeOnPulseRecord, syncPulseRecord } from '@/services/pulse.service';
import { WorkLogPopover } from './WorkLogPopover';

const TruncatedTooltip = ({ children, tooltipContent }: { children: React.ReactNode, tooltipContent?: React.ReactNode }) => {
    const textRef = React.useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = React.useState(false);

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div
                        ref={textRef}
                        className="truncate cursor-default w-full block"
                        onMouseEnter={() => {
                            if (textRef.current) {
                                setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
                            }
                        }}
                    >
                        {children}
                    </div>
                </TooltipTrigger>
                {isTruncated && (
                    <TooltipContent className="max-w-[550px] max-h-[350px] overflow-y-auto whitespace-normal">
                        {tooltipContent || children}
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
};

// Interfaces
export interface PulseWeek {
    id: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    companyId: number;
    weekStartDate: string;
    weekEndDate: string;
    status: string;
    submittedAt: string;
    userId: number;
    userEmail: string;
    userFullName: string;
    userProfilePicture: string | null;
    synlioActivityTime: number | string | null;
    meetingTime: number | string | null;
    needAttentionCount: number | null;
    taskFromMeetingCount: number | null;
    missingTime: number | string | null;
    rejectReason?: string | null;
    responsedAt?: string | null;
    submittedToEmail?: string | null;
    submittedToFullName?: string | null;
    submittedToProfilePicture?: string | null;
    approvedByFullName?: string | null;
}

export interface Pulse {
    id: number;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    companyId: number;
    pulseType: PulseType;
    postType: 'Task' | 'Ticket';
    postId: number;
    postCode: string;
    postName: string;
    postSpaceId: number;
    postSpaceName: string;
    resourceType: string;
    pulseSummary: string | null;
    attentionConditions: string | null;
    meetingType: string | null;
    allocatedHours: number | null;
    pulseWeek: PulseWeek;
    pulseWeekId: number;
}

interface PulseWeekWithPulses extends PulseWeek {
    pulses: Pulse[];
}

interface PulseHistoryPageProps {
    user: any;
    onActionComplete: () => void;
    onStatsChange: (count: number, tab: 'submissions' | 'approvals') => void;
    initialTab?: 'submissions' | 'approvals';
    initialExpandedWeekId?: number;
}

const UserRoleBadge = ({ role, postType, pulseType }: { role: string, postType?: string, pulseType?: PulseType }) => {
    let name = role;
    let Icon: React.ElementType = Users;

    if (pulseType === PulseType.MEETING_TIME) {
        name = 'Attendee';
        Icon = Users;
    } else if (role === 'ASSIGNEE' || role === 'ASS') {
        name = 'Assignee';
        Icon = UserStar;
    } else if (role === 'SUB_ASSIGNEE' || role === 'SBASS') {
        if (postType === 'Task') {
            name = 'Co-Assignee';
        } else if (postType === 'Ticket') {
            name = 'Participant';
        } else {
            name = 'Sub-Assignee';
        }
    }

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0 translate-y-[1px]",
        )}>
            <Icon className="w-3 h-3" />
            {name}
        </div>
    );
}

const PulseTypeIcon = ({ type }: { type: PulseType }) => {
    const icon = {
        [PulseType.NEED_ATTENTION]: <TriangleAlert className="w-4 h-4 text-red-400" />,
        [PulseType.SYNLIO_ACTIVITY]: <MousePointerClick className="h-4 w-4 text-primary" />,
        [PulseType.MEETING_TIME]: <Video className="h-4 w-4 text-purple-500" />,
    }[type];

    const name = {
        [PulseType.NEED_ATTENTION]: 'Need Attention',
        [PulseType.SYNLIO_ACTIVITY]: 'Synlio Activity',
        [PulseType.MEETING_TIME]: 'Meeting Time',
    }[type];

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                        {icon}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs font-medium">{name}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

const PostTypeBadge = ({ type, pulseType }: { type: 'Task' | 'Ticket' | 'Activity' | string | null, pulseType?: PulseType }) => {
    let actualType = type;
    if (!type && pulseType === PulseType.SYNLIO_ACTIVITY) {
        actualType = 'Activity';
    }
    const typeLower = actualType?.toLowerCase();
    const isTask = typeLower === 'task';
    const isActivity = typeLower === 'activity';
    const isTicket = typeLower === 'ticket';
    const isUnknown = !actualType || typeLower === 'unknown';

    let color = '#9ca3af'; // Default generic color
    if (isTask) color = '#10B981';
    else if (isActivity) color = '#eab308';
    else if (isTicket) color = '#3B82F6';

    const displayType = isUnknown || !actualType ? 'Unknown' : actualType.charAt(0).toUpperCase() + actualType.slice(1).toLowerCase();

    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0",
        )}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {displayType}
        </div>
    );
}

const PROVIDER_META: Record<string, { label: string; color: string }> = {
    teams: { label: 'Teams', color: '#6264A7' },
    zoom: { label: 'Zoom', color: '#2D8CFF' },
    google_meet: { label: 'Google', color: '#00A783' },
    slack: { label: 'Slack', color: '#4A154B' },
    internal: { label: 'Internal', color: '#8b5cf6' },
};

const ProviderBadge = ({ provider }: { provider: string }) => {
    const info = PROVIDER_META[provider] ?? { label: provider, color: '#b89494' };
    return (
        <div className="inline-flex items-center gap-1.5 px-2 text-[11px] border rounded-md font-medium shrink-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
            <span className="capitalize">{info.label}</span>
        </div>
    );
};

const PulseHistorySkeleton = () => (
    <div className="space-y-4 w-full">
        {[...Array(3)].map((_, i) => (
            <Card key={i} className="px-2 py-3 gap-0">
                <CardHeader className="px-1 py-1">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div>
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32 mt-1" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-2 pt-2 border-t border-dashed">
                    <div className="flex justify-between px-2 pt-2 items-center text-left">
                        <div className="grow grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, j) => (
                                <div key={j}>
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-6 w-12 mt-1" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="h-6 w-24" />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);

const PulseHistoryError = ({ error, innerTab }: { error: Error | string | null, innerTab?: string }) => (
    <div className="w-full">
        <Card className="px-2 py-12 gap-0">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
                <TriangleAlert className="h-8 w-8 text-destructive/40" />
                <p className="text-sm font-medium text-destructive">
                    {innerTab === 'approvals' ? 'Failed to load approvals' : 'Failed to load pulse history'}
                </p>
                <p className="text-xs text-destructive/80">
                    {typeof error === 'string' ? error : error?.message}
                </p>
            </div>
        </Card>
    </div>
);

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PulseHistoryEmpty = ({ innerTab }: { innerTab?: string }) => (
    <div className="w-full">
        <Card className="px-2 py-12 gap-0">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
                <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No pulse data found</p>
                <p className="text-xs text-muted-foreground/60">
                    {innerTab === 'approvals'
                        ? 'Snapshots awaiting your review will appear here.'
                        : 'Your submitted pulses will appear here.'}
                </p>
            </div>
        </Card>
    </div>
);

const LogTimePopover = ({ pulse, week, allocatedHours, onSave }: { pulse: any, week: PulseWeek, allocatedHours?: number, onSave: (weekId: number, pulseId: number, hours: number, startDate: string, endDate: string, closePopover: () => void, setLoading: (l: boolean) => void) => Promise<void> }) => {
    const getDateString = (dateObj: any) => {
        if (!dateObj) return format(new Date(), 'yyyy-MM-dd');
        if (typeof dateObj === 'string') return dateObj.split('T')[0];
        return format(new Date(dateObj), 'yyyy-MM-dd');
    };

    const initialStartDate = getDateString(week.weekStartDate);
    const initialEndDate = getDateString(week.weekEndDate);

    const [isOpen, setIsOpen] = useState(false);
    const [effort, setEffort] = useState(allocatedHours ? allocatedHours.toString() : '');
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEffort(allocatedHours ? allocatedHours.toString() : '');
            setStartDate(initialStartDate);
            setEndDate(initialEndDate);
        }
    }, [isOpen, allocatedHours, initialStartDate, initialEndDate]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {allocatedHours && allocatedHours > 0 ? (
                    <Button variant="outline" size="xs" className="h-6 text-xs gap-1 border-dashed border-primary/50 text-primary hover:text-primary hover:bg-primary/5" title="Edit Time">
                        <Clock className="h-3.5 w-3.5 mr-0.5" /> {allocatedHours.toFixed(2)}h
                    </Button>
                ) : (
                    <Button variant="outline" size="xs" className="h-6 text-xs gap-1 border" title="Add Time">
                        <ClockPlus className="h-3.5 w-3.5 mr-0.5" /> Log Time
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="end" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Start Date</Label>
                            <Input
                                className="h-8 text-xs"
                                type="date"
                                min={initialStartDate}
                                max={initialEndDate}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">End Date</Label>
                            <Input
                                className="h-8 text-xs"
                                type="date"
                                min={initialStartDate}
                                max={initialEndDate}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Effort (Hours)</Label>
                            <Input
                                className="h-8 text-xs"
                                type="number"
                                min={0.1}
                                step="any"
                                value={effort}
                                onChange={(e) => setEffort(e.target.value)}
                                placeholder="e.g. 2.5"
                            />
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="w-full h-8"
                        disabled={loading || !effort || parseFloat(effort) <= 0 || !startDate || !endDate}
                        onClick={() => onSave(week.id, pulse.id, parseFloat(effort), startDate, endDate, () => setIsOpen(false), setLoading)}
                    >
                        {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};


import { useEffect, useCallback } from 'react';


const PulseHistoryPage: React.FC<PulseHistoryPageProps> = ({ user, onActionComplete, onStatsChange, initialTab, initialExpandedWeekId }) => {
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set(initialExpandedWeekId ? [initialExpandedWeekId] : []));
    const [pagination, setPagination] = useState<Record<number, number>>({});
    const [innerTab, setInnerTab] = useState<'submissions' | 'approvals'>(initialTab || 'submissions');
    const [pageIndex, setPageIndex] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [weeksData, setWeeksData] = useState<PulseWeek[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | string | null>(null);
    const [weekPulsesData, setWeekPulsesData] = useState<Record<number, Pulse[]>>({});
    const [loadingPulses, setLoadingPulses] = useState<Record<number, boolean>>({});
    const [submittingDrafts, setSubmittingDrafts] = useState<Record<number, boolean>>({});

    // --- Submissions: date range filter ---
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // --- Approvals: resource filter ---
    const [approvalResourceFilter, setApprovalResourceFilter] = useState<string>('');  // email of selected resource
    const [reportingResources, setReportingResources] = useState<any[]>([]);
    const [loadingReportingResources, setLoadingReportingResources] = useState(false);
    const [resourceFilterOpen, setResourceFilterOpen] = useState(false);
    const [resourceFilterSearch, setResourceFilterSearch] = useState('');

    const fetchWeeksData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any[] = innerTab === 'submissions'
                ? [{ field: 'userEmail', value: user?.email, matchMode: 'equals' }]
                : [{ field: 'submittedToEmail', value: user?.email, matchMode: 'equals' }];

            // Date range filter (both tabs)
            if (dateRange?.from && dateRange?.to) {
                const startStr = format(dateRange.from, 'yyyy-MM-dd');
                const endStr = format(dateRange.to, 'yyyy-MM-dd');
                filters.push({ field: 'weekStartDate', value: [startStr, endStr], matchMode: 'dateBetween' });
            }

            // Approvals: resource (userEmail) filter
            if (innerTab === 'approvals' && approvalResourceFilter) {
                filters.push({ field: 'userEmail', value: approvalResourceFilter, matchMode: 'equals' });
            }

            const response = await searchPulseWeeks({
                first: pageIndex * 3,
                rows: 3,
                filters,
                multiSorts: [{ field: 'weekStartDate', order: -1 }]
            });
            setWeeksData(response.data.data);
            setTotalPages(Math.ceil(response.data.total / 3));
            if (onStatsChange) {
                onStatsChange(response.data.total, innerTab);
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [innerTab, pageIndex, user, dateRange, approvalResourceFilter]);

    useEffect(() => {
        fetchWeeksData();
    }, [fetchWeeksData]);

    // Load reporting resources when switching to approvals tab
    useEffect(() => {
        if (innerTab !== 'approvals') return;
        if (reportingResources.length > 0 || loadingReportingResources) return;

        const fetchReportingResources = async () => {
            setLoadingReportingResources(true);
            try {
                const data = await getMyDirectReports();
                setReportingResources(data);
            } catch (err) {
                console.error('Failed to load reporting resources:', err);
            } finally {
                setLoadingReportingResources(false);
            }
        };

        fetchReportingResources();
    }, [innerTab]);

    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: 'approve' | 'reject' | null;
        weekId: number | null;
        companyId: number | null;
        rejectReason: string;
        forwardToId: string;
        forwardMessage: string;
        weekOwnerEmail: string | null;
        weekOwnerName: string | null;
        weekRange: string | null;
    }>({
        isOpen: false,
        type: null,
        weekId: null,
        companyId: null,
        rejectReason: '',
        forwardToId: '',
        forwardMessage: 'Hi, please review and approve this weekly pulse snapshot.',
        weekOwnerEmail: null,
        weekOwnerName: null,
        weekRange: null,
    });

    const [companyResources, setCompanyResources] = useState<any[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);
    const [actionSubmitting, setActionSubmitting] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleLogTimeSubmit = async (weekId: number, pulseId: number, difference: number, startDate: string, endDate: string, closePopover: () => void, setLoading: (l: boolean) => void, pulse: any) => {
        setLoading(true);
        try {
            const pulseSummary = JSON.stringify({
                event_type: pulse.postType === 'Task' ? 'TASK_UPDATED' : 'TICKET_UPDATED',
                payload: {
                    effort: { from: null, to: pulse.allocatedHours + difference }
                },
                _changeOccurredAt: (endDate && new Date() > new Date(endDate)) ? endDate : new Date().toISOString(),
                _statusBase: (pulse as any).statusBase
            });

            const res = await syncPulseRecord(weekId, {
                postId: pulse.postId || pulse.id,
                postCode: pulse.postCode,
                postName: pulse.postName,
                postSpaceId: pulse.postSpaceId,
                postSpaceName: pulse.postSpaceName,
                postType: pulse.postType,
                pulseType: PulseType.SYNLIO_ACTIVITY,
                resourceType: pulse.resourceType || 'ASSIGNEE',
                pulseSummary: pulseSummary,
                allocatedHours: difference
            });

            // Local state update based on difference since we didn't use logTimeOnPulseRecord
            setWeekPulsesData(prev => ({
                ...prev,
                [weekId]: prev[weekId].map(p => p.id === pulseId ? { ...p, allocatedHours: Number(p.allocatedHours) + difference } : p)
            }));

            setWeeksData(prev => prev.map(w => w.id === weekId ? {
                ...w,
                synlioActivityTime: (Number(w.synlioActivityTime) || 0) + difference
            } : w));

            toast.success("Time logged");
            closePopover();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to log time");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReject = (weekId: number) => {
        setSearchQuery('');
        setIsDropdownOpen(false);
        setActionModal({
            isOpen: true,
            type: 'reject',
            weekId,
            companyId: null,
            rejectReason: '',
            forwardToId: '',
            forwardMessage: 'Hi, please review and approve this weekly pulse snapshot.',
            weekOwnerEmail: null,
            weekOwnerName: null,
            weekRange: null,
        });
    };

    const handleOpenApprove = async (weekId: number, companyId: number, weekOwnerEmail: string, weekOwnerName: string, weekRange: string) => {
        setSearchQuery('');
        setIsDropdownOpen(false);
        setActionModal({
            isOpen: true,
            type: 'approve',
            weekId,
            companyId,
            rejectReason: '',
            forwardToId: '',
            forwardMessage: 'Hi, please review and approve this weekly pulse snapshot.',
            weekOwnerEmail,
            weekOwnerName,
            weekRange,
        });
        setCompanyResources([]);
        setLoadingResources(false);
    };

    const handleSearchQueryChange = async (val: string) => {
        setSearchQuery(val);
        setIsDropdownOpen(true);
        if (!val) {
            setActionModal(prev => ({ ...prev, forwardToId: '' }));
            return;
        }

        if (companyResources.length === 0 && !loadingResources && actionModal.companyId) {
            setLoadingResources(true);
            try {
                const res = await getAllResourcesByCompanyOnly(actionModal.companyId);
                const data = res.data ?? res ?? [];
                setCompanyResources(data);
            } catch (error) {
                console.error("Error loading resources by company:", error);
                toast.error("Failed to load company resources");
            } finally {
                setLoadingResources(false);
            }
        }
    };

    const handleActionSubmit = async () => {
        if (!actionModal.weekId) return;

        setActionSubmitting(true);
        try {
            if (actionModal.type === 'reject') {
                if (!actionModal.rejectReason.trim()) {
                    toast.error('Please enter a reject reason');
                    setActionSubmitting(false);
                    return;
                }
                const response = await rejectPulseWeek(actionModal.weekId, { rejectReason: actionModal.rejectReason });
                const updatedWeek = response?.data || response;
                if (updatedWeek) {
                    setWeeksData(prev => prev.map(w => w.id === actionModal.weekId ? { ...w, ...updatedWeek } : w));
                }
                toast.success('Weekly snapshot rejected');
            } else if (actionModal.type === 'approve') {
                if (actionModal.forwardToId) {
                    const response = await forwardPulseWeek(actionModal.weekId, {
                        submittedToId: Number(actionModal.forwardToId),
                        forwardMessage: actionModal.forwardMessage
                    });
                    const updatedWeek = response?.data || response;
                    if (updatedWeek) {
                        setWeeksData(prev => prev.filter(w => w.id !== actionModal.weekId));
                    }
                    toast.success('Weekly snapshot forwarded');
                } else {
                    const approvedByEmail = user?.email;
                    if (!approvedByEmail) {
                        toast.error('Could not identify your user email');
                        setActionSubmitting(false);
                        return;
                    }
                    const response = await approvePulseWeek(actionModal.weekId, { approvedByEmail });
                    const updatedWeek = response?.data || response;
                    if (updatedWeek) {
                        setWeeksData(prev => prev.map(w => w.id === actionModal.weekId ? { ...w, ...updatedWeek } : w));
                    }
                    toast.success('Weekly snapshot approved');
                }
            }
            setActionModal(prev => ({ ...prev, isOpen: false }));
            if (onActionComplete) {
                onActionComplete();
            }
        } catch (error) {
            console.error("Action submission failed:", error);
            toast.error('Failed to submit snapshot action');
        } finally {
            setActionSubmitting(false);
        }
    };

    const toggleWeekExpansion = async (weekId: number) => {
        setExpandedWeeks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(weekId)) {
                newSet.delete(weekId);
            } else {
                newSet.add(weekId);
            }
            return newSet;
        });

        if (!weekPulsesData[weekId] && !loadingPulses[weekId]) {
            setLoadingPulses(prev => ({ ...prev, [weekId]: true }));
            try {
                const response = await getPulseWeekPulses(weekId);
                setWeekPulsesData(prev => ({ ...prev, [weekId]: response.data.data }));
            } catch (err) {
                console.error("Failed to load pulses", err);
                toast.error("Failed to load details");
            } finally {
                setLoadingPulses(prev => ({ ...prev, [weekId]: false }));
            }
        }
    };

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'none';
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return format(date, 'MMM d, yyyy');
            }
        }
        return String(value);
    };

    const parsePulsePayload = (summary: any, postType: string = 'item', highlightValues: boolean = false, userName: string = 'You', currentUserEmail?: string, currentUserName?: string): React.ReactNode | React.ReactNode[] => {
        const { event_type, payload, actor_id } = summary;

        const valClass = highlightValues ? "font-medium text-foreground" : "";
        const toText = <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />;

        const isNotMe = Boolean(actor_id && currentUserEmail && actor_id !== currentUserEmail);
        const displayClass = highlightValues ? "font-semibold text-foreground" : "";
        const actorDisplay = isNotMe
            ? <span className={displayClass}>{actor_id}</span>
            : <span className={displayClass}>You</span>;
            
        const formatName = (uName: string, uEmail?: string) => {
            if (uEmail && currentUserEmail && uEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
                return !isNotMe ? "yourself" : "you";
            }
            if (currentUserName && uName === currentUserName) {
                return !isNotMe ? "yourself" : "you";
            }
            
            return uName;
        };

        const wrapSentence = (sentenceContent: React.ReactNode) => {
            if (highlightValues) {
                return (
                    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
                        {actorDisplay} {sentenceContent}
                    </span>
                );
            }
            return (
                <span className="inline truncate">
                    {actorDisplay} {sentenceContent}
                </span>
            );
        };

        if (event_type?.includes('CREATED')) {
            let sentence = `created the ${postType.toLowerCase()}`;
            const parts = [];
            if (payload?.startDate) {
                parts.push(`start date of ${new Date(payload.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
            }
            if (payload?.endDate) {
                parts.push(`end date of ${new Date(payload.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
            }
            if (payload?.durationMinutes) {
                parts.push(`duration of ${(payload.durationMinutes / 60).toFixed(1)}h`);
            }
            if (parts.length > 0) {
                sentence += ` with ${parts.join(', ')}.`;
            } else {
                sentence += "";
            }
            const node = wrapSentence(sentence);
            return highlightValues ? [node] : node;
        }

        if (event_type?.includes('DELETED')) {
            const node = wrapSentence(`deleted the ${postType.toLowerCase()}.`);
            return highlightValues ? [node] : node;
        }

        if (event_type?.includes('COMMENT_ADDED')) {
            const node = wrapSentence(`added a comment.`);
            return highlightValues ? [node] : node;
        }

        if (event_type === 'TASK_CO_ASSIGNEE_ADDED' || event_type === 'TICKET_PARTICIPANT_ADDED') {
            const name = payload?.name;
            const email = payload?.email;
            const node = wrapSentence(<span>added {name ? <span className={valClass}>{formatName(name, email)}</span> : 'a participant'} as a participant.</span>);
            return highlightValues ? [node] : node;
        }

        if (event_type === 'TASK_CO_ASSIGNEE_REMOVED' || event_type === 'TICKET_PARTICIPANT_REMOVED') {
            const name = payload?.name;
            const email = payload?.email;
            const node = wrapSentence(<span>removed {name ? <span className={valClass}>{formatName(name, email)}</span> : 'a participant'} as a participant.</span>);
            return highlightValues ? [node] : node;
        }

        if (!payload) return null;

        const sentences: React.ReactNode[] = [];

        // 1. Status & Progress
        if (payload.statusName || payload.progressPercentage) {
            if (payload.statusName) {
                const from = payload.statusName.from;
                const to = payload.statusName.to;
                sentences.push(wrapSentence(<span key="status">changed status from <span className={valClass}>{from || 'None'}</span>{toText}<span className={valClass}>{to || 'None'}</span>.</span>));
            }
            if (payload.progressPercentage) {
                const from = payload.progressPercentage.from;
                const to = payload.progressPercentage.to;
                sentences.push(wrapSentence(<span key="progress">changed progress from <span className={valClass}>{from || 0}%</span>{toText}<span className={valClass}>{to || 0}%</span>.</span>));
            }
        }

        // 2. Effort Fields
        const effortFields = [
            { key: 'effort', label: 'effort' },
            { key: 'estimateEffort', label: 'estimate effort' },
            { key: 'actualEffort', label: 'actual effort' },
            { key: 'plannedEffort', label: 'planned effort' }
        ];
        effortFields.forEach(({ key, label }) => {
            if (payload[key]) {
                const from = payload[key].from;
                const to = payload[key].to;
                if (from == null || from === 0 || from === "0.00" || from === "0") {
                    sentences.push(wrapSentence(<span key={key}>added <span className={valClass}>{to}h</span> of {label}.</span>));
                } else {
                    sentences.push(wrapSentence(<span key={key}>changed {label} from <span className={valClass}>{from}h</span>{toText}<span className={valClass}>{to}h</span>.</span>));
                }
            }
        });

        // 3. Attachment
        if (payload.attachmentId || payload.link) {
            if (payload.link) {
                sentences.push(wrapSentence(<span key="attachment">added an <a href={payload.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">attachment</a>.</span>));
            } else {
                sentences.push(wrapSentence(<span key="attachment">added an attachment.</span>));
            }
        }

        // 4. Assignee
        if (payload.assigneeName) {
            const fromUser = { name: payload.assigneeName.from, pic: payload.assigneeProfilePicUrl?.from, email: payload.assigneeEmail?.from };
            const toUser = { name: payload.assigneeName.to, pic: payload.assigneeProfilePicUrl?.to, email: payload.assigneeEmail?.to };

            if (fromUser.name && toUser.name) {
                sentences.push(wrapSentence(
                    <span key="assignee">
                        changed assignee from <span className={valClass || ""}>{formatName(fromUser.name, fromUser.email)}</span>
                        {toText}
                        <span className={valClass || ""}>{formatName(toUser.name, toUser.email)}</span>.
                    </span>
                ));
            } else if (toUser.name) {
                sentences.push(wrapSentence(
                    <span key="assignee">
                        added <span className={valClass || ""}>{formatName(toUser.name, toUser.email)}</span> as assignee.
                    </span>
                ));
            } else if (fromUser.name) {
                sentences.push(wrapSentence(
                    <span key="assignee">
                        removed <span className={valClass || ""}>{formatName(fromUser.name, fromUser.email)}</span> as assignee.
                    </span>
                ));
            }
        }

        // 5. Dates
        ['startDate', 'dueDate', 'completionDate', 'actualStartDate', 'actualEndDate', 'slaResponseDeadline', 'slaResolutionDeadline'].forEach(dateField => {
            if (payload[dateField] && typeof payload[dateField] === 'object' && ('from' in payload[dateField] || 'to' in payload[dateField])) {
                const label = dateField.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
                const from = payload[dateField].from;
                const to = payload[dateField].to;

                const formatDate = (d: string) => {
                    if (!d) return 'None';
                    const date = new Date(d);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                    return d;
                };
                sentences.push(wrapSentence(<span key={dateField}>changed {label} from <span className={valClass}>{formatDate(from)}</span>{toText}<span className={valClass}>{formatDate(to)}</span>.</span>));
            }
        });

        // 6. Explicit Names mapped to formatted sentences
        const nameFields = [
            { key: 'severityName', label: 'severity' },
            { key: 'ticketTypeName', label: 'ticket type' },
            { key: 'queueName', label: 'queue' },
            { key: 'impactName', label: 'impact' },
            { key: 'departmentName', label: 'department' },
            { key: 'taskSpaceName', label: 'project space' },
            { key: 'ticketSpaceName', label: 'ticket space' },
            { key: 'hierarchyLevelName', label: 'hierarchy level' }
        ];

        nameFields.forEach(({ key, label }) => {
            if (payload[key] && typeof payload[key] === 'object') {
                const from = payload[key].from;
                const to = payload[key].to;
                sentences.push(wrapSentence(<span key={key}>changed {label} from <span className={valClass}>{from || 'None'}</span>{toText}<span className={valClass}>{to || 'None'}</span>.</span>));
            }
        });

        // Profile Picture generic handling
        const profilePicKeys = ['profilePicUrl', 'profilePic', 'profilePicture', 'avatar', 'avatarUrl', 'assigneeProfilePicUrl'];
        profilePicKeys.forEach(picKey => {
            if (payload[picKey]) {
                // Only show "Profile Pic Updated" if it wasn't an assignee change (assignee change already handles itself well)
                if (picKey !== 'assigneeProfilePicUrl') {
                    sentences.push(wrapSentence(<span key={picKey}>updated profile pic.</span>));
                }
            }
        });

        // 7. Generic catch-all for other fields not covered (and excluding IDs!)
        const coveredKeys = [
            'statusId', 'statusName', 'progressPercentage',
            'effort', 'estimateEffort', 'actualEffort', 'plannedEffort',
            'attachmentId', 'link',
            'assigneeId', 'assigneeName', 'assigneeEmail', 'assigneeSkill',
            'startDate', 'dueDate', 'completionDate', 'actualStartDate', 'actualEndDate', 'slaResponseDeadline', 'slaResolutionDeadline',
            'title', 'name', 'code', 'description', 'durationMinutes',
            ...nameFields.map(f => f.key),
            ...profilePicKeys,
            'statusColor', 'statusBase', 'severityColor', 'ticketTypeIcon', 'hierarchyLevelIcon', 'hierarchyLevelColor'
        ];

        const otherKeys = Object.keys(payload).filter(k =>
            !coveredKeys.includes(k) &&
            !k.toLowerCase().endsWith('id') // Specifically ignores permissionId, ticketId, taskId, etc.
        );

        otherKeys.forEach(k => {
            const val = payload[k];
            const label = k.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
            if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
                sentences.push(wrapSentence(<span key={k}>changed {label} from <span className={valClass}>{String(val.from || 'None')}</span>{toText}<span className={valClass}>{String(val.to || 'None')}</span>.</span>));
            } else if (val && typeof val !== 'object') {
                sentences.push(wrapSentence(<span key={k}>updated {label} to <span className={valClass}>{String(val)}</span>.</span>));
            }
        });

        if (sentences.length > 0) {
            if (highlightValues) return sentences;
            return (
                <span className="inline">
                    {sentences.map((s, idx) => (
                        <React.Fragment key={idx}>
                            {s}{idx < sentences.length - 1 ? ' ' : ''}
                        </React.Fragment>
                    ))}
                </span>
            );
        }

        const fallbackNode = wrapSentence(<span>was assigned to this.</span>);
        return highlightValues ? [fallbackNode] : fallbackNode;
    };

    const getPulseInfo = (pulse: Pulse, highlightValues: boolean = false, userName: string = 'You', currentUserEmail?: string, currentUserName?: string): React.ReactNode | React.ReactNode[] => {
        if (pulse.pulseType === PulseType.NEED_ATTENTION) {
            const str = `Was ${pulse.attentionConditions}`;
            return highlightValues ? [<span>{str}</span>] : str;
        }
        if (pulse.pulseType === PulseType.SYNLIO_ACTIVITY) {
            if (!pulse.postType || pulse.postType.toLowerCase() === 'activity') {
                const node = <span>This is a manual activity.</span>;
                return highlightValues ? [node] : node;
            }
            if (!pulse.pulseSummary) return null;
            try {
                const summary = JSON.parse(pulse.pulseSummary);
                const res = parsePulsePayload(summary, pulse.postType, highlightValues, userName, currentUserEmail, currentUserName);
                if (!res) return null;
                return res;
            } catch {
                return null;
            }
        }
        if (pulse.pulseType === PulseType.MEETING_TIME) {
            if (pulse.pulseSummary) {
                try {
                    const summary = JSON.parse(pulse.pulseSummary);
                    const duration = summary.actualDurationMinutes || summary.durationMinutes;
                    if (duration) {
                        const hours = duration / 60;
                        const provider = pulse.postCode ? pulse.postCode.toLowerCase() : 'meeting';
                        const str = `Created the ${provider} meeting with duration of ${Number(hours.toFixed(2))}h.`;
                        return highlightValues ? [<span>{str}</span>] : str;
                    }
                } catch { }
            }
            return 'Attended meeting';
        }
        return 'N/A';
    };

    const getPulseGroupInfo = (pulses: Pulse[], highlightValues: boolean = false, userName: string = 'You', currentUserEmail?: string, currentUserName?: string): React.ReactNode => {
        const rawInfos = [...pulses].reverse().map(pulse => {
            const result = getPulseInfo(pulse, highlightValues, userName, currentUserEmail, currentUserName);
            if (!result) return null;
            return { result, time: pulse.createdAt };
        }).filter(Boolean) as { result: React.ReactNode | React.ReactNode[], time: string }[];
        if (rawInfos.length === 0) return null;

        let infos: { info: React.ReactNode, time: string }[] = [];
        rawInfos.forEach(item => {
            if (Array.isArray(item.result)) {
                item.result.forEach(info => infos.push({ info, time: item.time }));
            } else {
                infos.push({ info: item.result, time: item.time });
            }
        });

        // Deduplicate identical sequential messages
        const getReactNodeText = (node: any): string => {
            if (node == null) return '';
            if (typeof node === 'string' || typeof node === 'number') return String(node);
            if (Array.isArray(node)) return node.map(getReactNodeText).join('');
            if (node.props && node.props.children) {
                return getReactNodeText(node.props.children);
            }
            return '';
        };

        const deduplicated: { info: React.ReactNode, time: string }[] = [];
        infos.forEach((item, i) => {
            if (i === 0 || getReactNodeText(item.info) !== getReactNodeText(infos[i - 1].info)) {
                deduplicated.push(item);
            }
        });

        if (highlightValues) {
            return (
                <ul className="list-none p-0 m-0 flex flex-col space-y-1 my-1">
                    {deduplicated.map((item, i) => (
                        <li key={i} className={i < deduplicated.length - 1 ? "pb-2" : ""}>
                            {item.info}
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                {formatRelativeTime(new Date(item.time))}
                            </div>
                        </li>
                    ))}
                </ul>
            );
        }

        return (
            <>
                {deduplicated.map((item, i) => (
                    <React.Fragment key={i}>
                        {item.info}
                        {i < deduplicated.length - 1 ? ' ' : ''}
                    </React.Fragment>
                ))}
            </>
        );
    };

    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('');
    }

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'PENDING': return '#f59e0b';
            case 'FORWARDED': return '#3b82f6';
            case 'APPROVED': return '#10b981';
            case 'REJECTED': return '#ef4444';
            default: return '#6b7280';
        }
    }

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const formatSubmittedDate = (dateString: string) => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
        const parts = formattedDate.split(', ');
        return `${parts[1]} ${parts[0]} ${parts[2]}`;
    }



    return (
        <div className="px-6 pb-4 space-y-4">
            <div className="flex justify-between border-b border-border w-full mb-4 items-center">
                <div className="flex">
                    <button
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] disabled:opacity-50 disabled:cursor-not-allowed",
                            innerTab === "submissions"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                        )}
                        onClick={() => {
                            setInnerTab("submissions");
                            setPageIndex(0);
                        }}
                        disabled={loading}
                    >
                        My Submissions
                    </button>
                    <button
                        className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] disabled:opacity-50 disabled:cursor-not-allowed",
                            innerTab === "approvals"
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                        )}
                        onClick={() => {
                            setInnerTab("approvals");
                            setPageIndex(0);
                        }}
                        disabled={loading}
                    >
                        To Review & Approve
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date range filter (both tabs) */}
                    <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-7 gap-1.5 text-xs",
                                    (dateRange?.from || dateRange?.to) && "border-primary text-primary bg-primary/5"
                                )}
                            >
                                <CalendarDays className="h-3.5 w-3.5" />
                                {dateRange?.from && dateRange?.to
                                    ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                                    : dateRange?.from
                                        ? `From ${format(dateRange.from, 'MMM d, yyyy')}`
                                        : 'Filter by date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <div className="p-3 pb-2 border-b">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {dateRange?.from && dateRange?.to
                                        ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                                        : dateRange?.from
                                            ? `From ${format(dateRange.from, 'MMM d, yyyy')} — pick end date`
                                            : 'Select a date range'}
                                </p>
                            </div>
                            <Calendar
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range) => {
                                    setDateRange(range);
                                    if (range?.from && range?.to) {
                                        setPageIndex(0);
                                    }
                                }}
                                numberOfMonths={1}
                            />
                            {(dateRange?.from || dateRange?.to) && (
                                <div className="p-2 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs w-full text-destructive hover:text-destructive"
                                        onClick={() => {
                                            setDateRange(undefined);
                                            setDateFilterOpen(false);
                                            setPageIndex(0);
                                        }}
                                    >
                                        Clear filter
                                    </Button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    {/* Approvals: Resource filter */}
                    {innerTab === 'approvals' && (
                        <Popover open={resourceFilterOpen} onOpenChange={setResourceFilterOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-7 gap-1.5 text-xs",
                                        approvalResourceFilter && "border-primary text-primary bg-primary/5"
                                    )}
                                >
                                    <Filter className="h-3.5 w-3.5" />
                                    {approvalResourceFilter
                                        ? (() => {
                                            const r = reportingResources.find(x => x.email === approvalResourceFilter);
                                            return r ? `${r.first_name} ${r.last_name}` : 'Resource';
                                        })()
                                        : 'Filter by resource'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="end">
                                <div className="p-2 border-b">
                                    <input
                                        type="text"
                                        placeholder="Search resource..."
                                        className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                                        value={resourceFilterSearch}
                                        onChange={(e) => setResourceFilterSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-56 overflow-y-auto p-1">
                                    {loadingReportingResources ? (
                                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </div>
                                    ) : (
                                        <>
                                            {/* All option */}
                                            <button
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors text-left",
                                                    !approvalResourceFilter && "bg-primary/10 text-primary font-medium"
                                                )}
                                                onClick={() => {
                                                    setApprovalResourceFilter('');
                                                    setResourceFilterOpen(false);
                                                    setPageIndex(0);
                                                }}
                                            >
                                                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                    <Users className="w-3 h-3" />
                                                </span>
                                                All resources
                                                {!approvalResourceFilter && <Check className="w-3 h-3 ml-auto" />}
                                            </button>
                                            {reportingResources
                                                .filter(r => {
                                                    const name = `${r.first_name} ${r.last_name}`.toLowerCase();
                                                    const email = (r.email || '').toLowerCase();
                                                    return name.includes(resourceFilterSearch.toLowerCase()) || email.includes(resourceFilterSearch.toLowerCase());
                                                })
                                                .map(r => (
                                                    <button
                                                        key={r.id}
                                                        className={cn(
                                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors text-left",
                                                            approvalResourceFilter === r.email && "bg-primary/10 text-primary font-medium"
                                                        )}
                                                        onClick={() => {
                                                            setApprovalResourceFilter(r.email);
                                                            setResourceFilterOpen(false);
                                                            setPageIndex(0);
                                                        }}
                                                    >
                                                        <Avatar className="w-6 h-6 shrink-0">
                                                            <AvatarImage src={r.profile_pic ?? undefined} />
                                                            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                                                                {getInitials(`${r.first_name} ${r.last_name}`)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="truncate font-medium">{r.first_name} {r.last_name}</span>
                                                            <span className="truncate text-muted-foreground">{r.email}</span>
                                                        </div>
                                                        {approvalResourceFilter === r.email && <Check className="w-3 h-3 ml-auto shrink-0" />}
                                                    </button>
                                                ))
                                            }
                                            {reportingResources.length === 0 && !loadingReportingResources && (
                                                <div className="text-center text-xs text-muted-foreground py-4">
                                                    No direct reports found
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Page {pageIndex + 1} of {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6"
                                    disabled={pageIndex === 0}
                                    onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-6 h-6"
                                    disabled={pageIndex >= totalPages - 1}
                                    onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
                                >
                                    <ChevronRight className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <PulseHistorySkeleton />
            ) : error ? (
                <PulseHistoryError error={error} innerTab={innerTab} />
            ) : weeksData.length > 0 ? (
                <>
                    {weeksData.map((week) => {
                        const isExpanded = expandedWeeks.has(week.id);
                        const showActionButtons = user?.email !== week.userEmail && ['PENDING', 'FORWARDED'].includes(week.status.toUpperCase());
                        const isDraftOwner = user?.email === week.userEmail && ['DRAFT', 'REJECTED'].includes(week.status.toUpperCase());

                        return (
                            <Card key={week.id} className="px-2 py-3 gap-0">
                                <CardHeader className="px-1 py-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarImage src={week.userProfilePicture ?? undefined} alt={week.userFullName} />
                                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                                    {getInitials(week.userFullName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-4">
                                                {innerTab === 'approvals' && (
                                                    <>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-foreground leading-tight">{week.userFullName}</span>
                                                            <span className="text-xs text-muted-foreground leading-tight mt-0.5">{week.userEmail}</span>
                                                        </div>
                                                        <div className="w-px h-8 bg-border" />
                                                    </>
                                                )}
                                                <div className="flex flex-col">
                                                    <CardTitle className="flex items-center gap-2 text-sm leading-tight">
                                                        {format(new Date(week.weekStartDate), 'dd MMMM yyyy')}
                                                        <ArrowRight className="w-4 h-4" />
                                                        {format(new Date(week.weekEndDate), 'dd MMMM yyyy')}
                                                    </CardTitle>
                                                    {week.submittedAt ? (
                                                        <p className="text-xs text-muted-foreground mt-1 leading-tight normal-case">Submitted {formatSubmittedDate(week.submittedAt)}</p>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground mt-1 leading-tight normal-case">Not submitted for approval yet</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 bg-card text-card-foreground text-xs border rounded-md shrink-0")}>
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(week.status) }} />
                                                <span className="font-semibold">{['PENDING', 'FORWARDED'].includes(week.status.toUpperCase()) ? (week.status.toUpperCase() === 'FORWARDED' ? 'Forwarded' : 'Pending Approval') : toTitleCase(week.status)}</span>
                                                {['REJECTED', 'PENDING', 'FORWARDED', 'APPROVED'].includes(week.status.toUpperCase()) && (
                                                    <HoverCard>
                                                        <HoverCardTrigger asChild>
                                                            <button className="text-muted-foreground hover:text-foreground outline-none flex items-center ml-0.5">
                                                                <Info className="w-3.5 h-3.5" />
                                                            </button>
                                                        </HoverCardTrigger>
                                                        <HoverCardContent className="w-80 text-sm" align="end" sideOffset={5}>
                                                            {week.status.toUpperCase() === 'REJECTED' && (
                                                                <div className="space-y-2">
                                                                    {/* <h4 className="font-semibold text-destructive flex items-center gap-2">
                                                                    <TriangleAlert className="w-4 h-4" />
                                                                    Rejection Details
                                                                </h4> */}
                                                                    <div className="grid gap-2 text-xs">
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-muted-foreground font-medium">Reason</span>
                                                                            <span className="font-medium text-foreground break-words bg-muted/50 p-2 rounded-md">{week.rejectReason || 'No reason provided'}</span>
                                                                        </div>
                                                                        <div className="flex gap-2 justify-between">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-muted-foreground font-medium">Rejected By</span>
                                                                                <span className="font-medium text-primary break-words">{user?.email === week.updatedBy ? 'You' : (week.approvedByFullName || week.updatedBy || 'System')}</span>
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5 text-right">
                                                                                <span className="text-muted-foreground font-medium">Rejected At</span>
                                                                                <span className="font-medium">{week.responsedAt ? format(new Date(week.responsedAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {/* {week.userEmail === user?.email && (
                                                                    <div className="pt-2 mt-2 border-t border-dashed">
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Please resubmit the snapshot for this week in the <span className="font-semibold text-primary">My Pulse</span> tab.
                                                                        </p>
                                                                    </div>
                                                                )} */}
                                                                </div>
                                                            )}
                                                            {week.status.toUpperCase() === 'PENDING' && (
                                                                <div className="space-y-2">
                                                                    {/* <h4 className="font-semibold">Pending Details</h4> */}
                                                                    <div className="grid gap-2 text-xs">
                                                                        <div className="flex gap-2 justify-between">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-muted-foreground font-medium">Pending With</span>
                                                                                <span className="font-medium text-primary break-words">{week.submittedToFullName || week.submittedToEmail || 'Not assigned'}</span>
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5 text-right">
                                                                                <span className="text-muted-foreground font-medium">Submitted At</span>
                                                                                <span className="font-medium text-foreground">{week.submittedAt ? format(new Date(week.submittedAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {week.status.toUpperCase() === 'FORWARDED' && (
                                                                <div className="space-y-2">
                                                                    <div className="grid gap-2 text-xs">
                                                                        <div className="flex flex-col gap-0.5 mb-2">
                                                                            <span className="text-muted-foreground font-medium">Forwarded By</span>
                                                                            <span className="font-medium text-primary break-words">{user?.email === week.updatedBy ? 'You' : (week.updatedBy || 'Unknown')}</span>
                                                                        </div>
                                                                        <div className="flex gap-2 justify-between">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-muted-foreground font-medium">Forwarded To</span>
                                                                                <span className="font-medium text-primary break-words">{user?.email === week.submittedToEmail ? 'You' : (week.submittedToFullName || week.submittedToEmail || 'Not assigned')}</span>
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5 text-right">
                                                                                <span className="text-muted-foreground font-medium">Forwarded At</span>
                                                                                <span className="font-medium text-foreground">{week.submittedAt ? format(new Date(week.submittedAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {week.status.toUpperCase() === 'APPROVED' && (
                                                                <div className="space-y-2">
                                                                    {/* <h4 className="font-semibold text-emerald-500 flex items-center gap-2">
                                                                    <Check className="w-4 h-4" />
                                                                    Approval Details
                                                                </h4> */}
                                                                    <div className="grid gap-2 text-xs">
                                                                        <div className="flex gap-2 justify-between">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-muted-foreground font-medium">Approved By</span>
                                                                                <span className="font-medium text-primary break-words">{user?.email === week.updatedBy ? 'You' : (week.approvedByFullName || week.updatedBy || 'System')}</span>
                                                                            </div>
                                                                            <div className="flex flex-col gap-0.5 text-right">
                                                                                <span className="text-muted-foreground font-medium">Approved At</span>
                                                                                <span className="font-medium text-foreground">{week.responsedAt ? format(new Date(week.responsedAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </HoverCardContent>
                                                    </HoverCard>
                                                )}
                                            </div>
                                            {showActionButtons && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        className="text-xs text-destructive"
                                                        onClick={() => handleOpenReject(week.id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        className="text-xs"
                                                        onClick={() => handleOpenApprove(week.id, week.companyId, week.userEmail, week.userFullName, `${format(new Date(week.weekStartDate), 'dd MMM yyyy')} - ${format(new Date(week.weekEndDate), 'dd MMM yyyy')}`)}
                                                    >
                                                        Approve
                                                    </Button>
                                                </>
                                            )}
                                            {isDraftOwner && (
                                                <Button
                                                    size="xs"
                                                    className="text-xs"
                                                    disabled={submittingDrafts[week.id]}
                                                    onClick={async () => {
                                                        setSubmittingDrafts(prev => ({ ...prev, [week.id]: true }));
                                                        try {
                                                            const res = await submitPulseWeek(week.id, { submittedToId: 0 });
                                                            setWeeksData(prev => prev.map(w => w.id === week.id ? res.data : w));
                                                            toast.success("Draft submitted");
                                                            onActionComplete?.();
                                                        } catch (error: any) {
                                                            toast.error(error.response?.data?.message || "Failed to submit draft");
                                                        } finally {
                                                            setSubmittingDrafts(prev => ({ ...prev, [week.id]: false }));
                                                        }
                                                    }}
                                                >
                                                    {submittingDrafts[week.id] && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                                    {week.status.toUpperCase() === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-2 pt-2 pb-2 border-t border-dashed">
                                    <div className="flex justify-between px-2 pt-2 items-center text-left">
                                        <div className="grow grid grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Synlio activity</p>
                                                <p className="text-xl font-bold">{Number(week.synlioActivityTime ?? 0).toFixed(1)}h</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Meeting time</p>
                                                <p className="text-xl font-bold">{Number(week.meetingTime ?? 0).toFixed(1)}h</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{Number(week.missingTime ?? 0) < 0 ? 'Overtime' : 'Missing time'}</p>
                                                <p className="text-xl font-bold">{Math.abs(Number(week.missingTime ?? 0)).toFixed(1)}h</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Tasks from meetings</p>
                                                <p className="text-xl font-bold">{week.taskFromMeetingCount ?? 0}</p>
                                            </div>
                                        </div>
                                        <Button variant="link" size="xs" className="text-xs"
                                            onClick={() => toggleWeekExpansion(week.id)}>
                                            {isExpanded ? 'Hide Details' : 'More Details'}
                                        </Button>
                                    </div>
                                    {isExpanded && (
                                        <div className="pt-4">
                                            {(() => {
                                                const allPulses = weekPulsesData[week.id] || [];
                                                const groupedMap = new Map<string, { id: string, pulses: Pulse[], primaryPulse: Pulse, allocatedHours: number }>();
                                                allPulses.forEach(pulse => {
                                                    const key = `${pulse.pulseType}-${pulse.postId || pulse.id}`;
                                                    if (!groupedMap.has(key)) {
                                                        groupedMap.set(key, { id: key, pulses: [], primaryPulse: pulse, allocatedHours: 0 });
                                                    }
                                                    const group = groupedMap.get(key)!;
                                                    group.pulses.push(pulse);
                                                    group.allocatedHours += Number(pulse.allocatedHours || 0);
                                                });
                                                const groupedPulses = Array.from(groupedMap.values()).sort((a, b) => {
                                                    const aHasTime = a.allocatedHours > 0;
                                                    const bHasTime = b.allocatedHours > 0;
                                                    if (aHasTime === bHasTime) return 0;
                                                    return aHasTime ? 1 : -1;
                                                });
                                                const page = pagination[week.id] || 0;
                                                const paginatedGrouped = groupedPulses.slice(page * 6, (page + 1) * 6);
                                                const totalPagesInner = Math.ceil(groupedPulses.length / 6);

                                                return loadingPulses[week.id] ? (
                                                    <div className="flex justify-center py-8">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Table className="border-t">
                                                            {/* <TableHeader>
                                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                    <TableHead className="w-[100px]"></TableHead>
                                                    <TableHead className="w-[300px]">Work</TableHead>
                                                    <TableHead className="w-[150px]">Role</TableHead>
                                                    <TableHead>Changes happened</TableHead>
                                                    <TableHead className="text-right w-[120px]">Effort</TableHead>
                                                </TableRow>
                                            </TableHeader> */}
                                                            <TableBody>
                                                                {paginatedGrouped.map((group) => {
                                                                    const { primaryPulse: pulse, pulses, allocatedHours, id: groupId } = group;
                                                                    return (
                                                                        <TableRow key={groupId}>
                                                                            <TableCell className="w-[50px]"><PulseTypeIcon type={pulse.pulseType} /></TableCell>
                                                                            <TableCell className="w-[100px]">
                                                                                {pulse.pulseType === PulseType.MEETING_TIME ? (
                                                                                    <ProviderBadge provider={pulse.postCode} />
                                                                                ) : (
                                                                                    <PostTypeBadge type={pulse.pulseType === PulseType.SYNLIO_ACTIVITY && !pulse.postType ? 'Activity' : pulse.postType} />
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="w-[130px]"><UserRoleBadge role={pulse.resourceType} postType={pulse.postType} pulseType={pulse.pulseType} /></TableCell>
                                                                            <TableCell className="w-[250px]">
                                                                                <div className="flex items-center gap-3">
                                                                                    {pulse.pulseType !== PulseType.MEETING_TIME && pulse.postCode && (
                                                                                        <span style={{ color: '#3B82F6' }}>{pulse.postCode}</span>
                                                                                    )}
                                                                                    <span className="text-gray-900 dark:text-gray-100 truncate">{pulse.postName}</span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="text-muted-foreground text-xs w-[500px] max-w-[500px]">
                                                                                {(() => {
                                                                                    const userNameToDisplay = week.userEmail === user?.email ? 'You' : (week.userFullName || 'User');
                                                                                    const currentUserName = user?.name || (user?.first_name ? `${user.first_name} ${user.last_name}` : undefined);
                                                                                    const infoNormal = getPulseGroupInfo(pulses, false, userNameToDisplay, user?.email, currentUserName);
                                                                                    const infoHighlighted = getPulseGroupInfo(pulses, true, userNameToDisplay, user?.email, currentUserName);
                                                                                    if (!infoNormal) return null;
                                                                                    return <TruncatedTooltip tooltipContent={infoHighlighted}>{infoNormal}</TruncatedTooltip>;
                                                                                })()}
                                                                            </TableCell>
                                                                            <TableCell className="w-[120px] text-right">
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    {(() => {
                                                                                        let nativeHours = 0;
                                                                                        if (pulse.pulseType === PulseType.MEETING_TIME && pulse.pulseSummary) {
                                                                                            try {
                                                                                                const summary = JSON.parse(pulse.pulseSummary);
                                                                                                const duration = summary.actualDurationMinutes || summary.durationMinutes;
                                                                                                if (duration) nativeHours = duration / 60;
                                                                                            } catch (e) { }
                                                                                        }

                                                                                        if (nativeHours > 0) {
                                                                                            return (
                                                                                                <span className="flex items-center gap-1 text-sm font-semibold mr-1">
                                                                                                    <Clock className="h-3.5 w-3.5" /> {nativeHours.toFixed(2)}h
                                                                                                </span>
                                                                                            );
                                                                                        }

                                                                                        return isDraftOwner ? (
                                                                                            <WorkLogPopover
                                                                                                postId={pulse.postId || pulse.id}
                                                                                                postType={pulse.postType as any}
                                                                                                postCode={pulse.postCode}
                                                                                                postName={pulse.postName}
                                                                                                spaceId={pulse.postSpaceId}
                                                                                                spaceName={pulse.postSpaceName}
                                                                                                statusBase={(pulse as any).statusBase || ''}
                                                                                                user={user}
                                                                                                currentEffort={allocatedHours}
                                                                                                startDate={week.weekStartDate ? (typeof week.weekStartDate === 'string' ? week.weekStartDate.split('T')[0] : format(new Date(week.weekStartDate), 'yyyy-MM-dd')) : undefined}
                                                                                                endDate={week.weekEndDate ? (typeof week.weekEndDate === 'string' ? week.weekEndDate.split('T')[0] : format(new Date(week.weekEndDate), 'yyyy-MM-dd')) : undefined}
                                                                                                isDraft={false}
                                                                                                onActionComplete={(totalEffortInRange) => {
                                                                                                    const startDateStr = week.weekStartDate ? (typeof week.weekStartDate === 'string' ? week.weekStartDate.split('T')[0] : format(new Date(week.weekStartDate), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd');
                                                                                                    const endDateStr = week.weekEndDate ? (typeof week.weekEndDate === 'string' ? week.weekEndDate.split('T')[0] : format(new Date(week.weekEndDate), 'yyyy-MM-dd')) : format(new Date(), 'yyyy-MM-dd');
                                                                                                    const difference = (totalEffortInRange || 0) - allocatedHours;
                                                                                                    handleLogTimeSubmit(week.id, pulse.id, difference, startDateStr, endDateStr, () => { }, () => { }, pulse);
                                                                                                }}
                                                                                            />
                                                                                        ) : allocatedHours > 0 ? (
                                                                                            <span className="flex items-center gap-1 text-sm font-semibold mr-1">
                                                                                                <Clock className="h-3.5 w-3.5" /> {allocatedHours.toFixed(2)}h
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-sm font-semibold mr-1">0h</span>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                        {totalPagesInner > 1 && (
                                                            <div className="flex items-center justify-between mt-2 pt-2 border-t px-2 text-xs">
                                                                <span className="text-muted-foreground">
                                                                    Showing {page * 6 + 1} to {Math.min((page + 1) * 6, groupedPulses.length)} of {groupedPulses.length}
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="w-6 h-6"
                                                                        onClick={() => setPagination(prev => ({ ...prev, [week.id]: Math.max(0, page - 1) }))}
                                                                        disabled={page === 0}
                                                                    >
                                                                        <ChevronLeft className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="w-6 h-6"
                                                                        onClick={() => setPagination(prev => ({ ...prev, [week.id]: Math.min(totalPagesInner - 1, page + 1) }))}
                                                                        disabled={page >= totalPagesInner - 1}
                                                                    >
                                                                        <ChevronRight className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </>
            ) : (
                <PulseHistoryEmpty innerTab={innerTab} />
            )}

            <Dialog open={actionModal.isOpen} onOpenChange={(open) => !open && setActionModal(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>
                            {actionModal.type === 'reject' ? 'Reject Weekly Snapshot' : 'Approve Weekly Snapshot'}
                        </DialogTitle>
                    </DialogHeader>

                    {actionModal.type === 'reject' && (
                        <div className="space-y-4 py-2">
                            <label className="text-sm font-medium">Reject Reason <span className="text-destructive">*</span></label>
                            <textarea
                                className="w-full min-h-[100px] p-2 border rounded-md text-sm bg-background"
                                placeholder="Enter the reason for rejection..."
                                value={actionModal.rejectReason}
                                onChange={(e) => setActionModal(prev => ({ ...prev, rejectReason: e.target.value }))}
                            />
                        </div>
                    )}

                    {actionModal.type === 'approve' && (
                        <div className="space-y-4 py-2">
                            <p className="text-sm mb-4">
                                Are you sure you want to approve the Weekly Pulse Snapshot of<br />
                                <span className="font-medium">{actionModal.weekOwnerName}</span> for <span className="font-medium">{actionModal.weekRange}</span>?
                            </p>
                            <div className="relative mt-2">
                                <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-4 mb-2"></div>
                                <label className="text-sm">Forward to review & approve Weekly Pulse Snapshot</label>
                                <div className="relative pt-2">
                                    <div className="flex gap-2">
                                        <div className="relative grow">
                                            {(() => {
                                                const selectedResource = actionModal.forwardToId ? companyResources.find(r => String(r.id) === actionModal.forwardToId) : null;

                                                if (selectedResource) {
                                                    return (
                                                        <div
                                                            className="flex items-center justify-between w-full rounded-md border border-input bg-transparent px-3 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                                                            onClick={() => {
                                                                setActionModal(prev => ({ ...prev, forwardToId: '' }));
                                                                setSearchQuery('');
                                                                setTimeout(() => setIsDropdownOpen(true), 0);
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <Avatar className="h-7 w-7 flex-shrink-0">
                                                                    <AvatarImage src={selectedResource.profile_pic ?? undefined} alt={selectedResource.first_name} />
                                                                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{getInitials(`${selectedResource.first_name} ${selectedResource.last_name}`)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col min-w-0 text-left gap-0.5">
                                                                    <span className="truncate text-xs font-medium leading-tight">{selectedResource.first_name} {selectedResource.last_name}</span>
                                                                    <span className="truncate text-xs text-muted-foreground leading-tight">{selectedResource.email}</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSearchQuery('');
                                                                    setIsDropdownOpen(false);
                                                                    setActionModal(prev => ({ ...prev, forwardToId: '' }));
                                                                }}
                                                                className="text-muted-foreground hover:text-foreground shrink-0 p-1 ml-2"
                                                            >
                                                                <X className="w-4 h-4 text-destructive" />
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        <input
                                                            type="text"
                                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                                                            placeholder="Find resource to forward..."
                                                            value={searchQuery}
                                                            onChange={(e) => handleSearchQueryChange(e.target.value)}
                                                            onFocus={() => {
                                                                setIsDropdownOpen(true);
                                                            }}
                                                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                                        />
                                                        {searchQuery && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchQuery('');
                                                                    setIsDropdownOpen(false);
                                                                    setActionModal(prev => ({ ...prev, forwardToId: '' }));
                                                                }}
                                                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-sm font-semibold z-10"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-y-auto p-1 flex flex-col">
                                            {loadingResources ? (
                                                <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    Loading company resources...
                                                </div>
                                            ) : companyResources.filter(r => r.email !== actionModal.weekOwnerEmail).filter(r => {
                                                const fullName = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
                                                const email = (r.email || '').toLowerCase();
                                                return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
                                            }).length === 0 ? (
                                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                                    No resources found
                                                </div>
                                            ) : (
                                                companyResources
                                                    .filter(r => r.email !== actionModal.weekOwnerEmail)
                                                    .filter(r => {
                                                        const fullName = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase();
                                                        const email = (r.email || '').toLowerCase();
                                                        return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
                                                    })
                                                    .map((r) => {
                                                        const isSelected = actionModal.forwardToId === String(r.id);
                                                        return (
                                                            <button
                                                                key={r.id}
                                                                type="button"
                                                                onMouseDown={() => {
                                                                    const name = `${r.first_name} ${r.last_name}`;
                                                                    setSearchQuery(name);
                                                                    setActionModal(prev => ({ ...prev, forwardToId: String(r.id) }));
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={`w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-sm text-sm text-left hover:bg-accent hover:text-accent-foreground select-none outline-none transition-colors ${isSelected ? "bg-primary/10 text-primary font-medium" : ""}`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                                                        <AvatarImage src={r.profile_pic ?? undefined} alt={r.first_name} />
                                                                        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                                                                            {getInitials(`${r.first_name} ${r.last_name}`)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-semibold truncate text-foreground leading-snug">
                                                                            {r.first_name} {r.last_name}
                                                                        </span>
                                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-none">
                                                                            <span className="truncate">{r.email}</span>
                                                                            {/* {r.division?.name && (
                                                                                <>
                                                                                    <span>•</span>
                                                                                    <span className="truncate italic text-primary/80">{r.division.name}</span>
                                                                                </>
                                                                            )} */}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                                                            </button>
                                                        );
                                                    })
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {actionModal.forwardToId && (
                                <>
                                    <div className="space-y-2 mt-4">
                                        <textarea
                                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                                            value={actionModal.forwardMessage}
                                            onChange={(e) => setActionModal(prev => ({ ...prev, forwardMessage: e.target.value }))}
                                            placeholder="Enter a message to include in the email..."
                                            disabled={!actionModal.forwardToId}
                                        />
                                    </div>
                                </>
                            )}
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={handleActionSubmit}
                                    disabled={actionSubmitting}
                                >
                                    {actionSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {actionModal.forwardToId ? 'Forward' : 'Approve'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {actionModal.type !== 'approve' && (
                        <DialogFooter>
                            <Button
                                variant="ghost"
                                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                                disabled={actionSubmitting}
                            >
                                Cancel
                            </Button>
                            {actionModal.type === 'reject' && (
                                <Button
                                    variant="destructive"
                                    onClick={handleActionSubmit}
                                    disabled={actionSubmitting || !actionModal.rejectReason.trim()}
                                >
                                    {actionSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Reject Snapshot
                                </Button>
                            )}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

        </div >
    );
};

export default PulseHistoryPage;
