"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useBreadcrumbsEffect } from "@/hooks/useBreadcrumbsEffect";
import { useAuth } from '@/contexts/auth.context';
import PulseHeader from './components/PulseHeader';
import NeedsAttention from './components/NeedsAttention';
import SynlioActivity from './components/SynlioActivity';
import MeetingTime, { MeetingTimeHandle } from './components/MeetingTime';
import StatCards from './components/StatCards';
import ThisWeekInsight from './components/ThisWeekInsight';
import type { DateRange } from "react-day-picker";
import { addDays, format, nextFriday, subDays, formatDistanceToNow } from 'date-fns';
import { createSnapShot, getLoggedUserWorkingHoursPerWeek, getNeedsAttentionData, getSynlioActivityData, searchPulseWeeks, submitPulseWeek, getPulseMyStatus } from '@/services/pulse.service';
import { getMeetingStats, getMeetings, MeetingStats, Meeting } from '@/services/meetings-integration.service';

import { Button } from "@/components/ui/button";
import { PulseType } from "@/enums/pulse-type.enum";
import { AssigneeType } from "@/enums/assignee-type.enum";
import { PulseSnapshotStatus } from "@/enums/pulse-snapshot-status.enum";
import { toast } from "sonner";
import { Loader2, Send, CalendarCheck, CalendarClock, RefreshCw, ShieldOff } from "lucide-react";
import PulseHistoryPage, { Pulse, PulseWeek } from "@/app/(pages)/pulse/components/PulseHistory";
import { usePrivilegeGuard } from "@/hooks/use-privilege-guard";

interface PulseWeekWithPulses extends PulseWeek {
  pulses: Pulse[];
}

const PulsePage = () => {

  const { user } = useAuth();
  const hasPulsePrivilege = usePrivilegeGuard('109');
  const [activeTab, setActiveTab] = useState('current');
  const [needsAttentionData, setNeedsAttentionData] = useState<any[]>([]);
  const [synlioActivityData, setSynlioActivityData] = useState<any[]>([]);
  const [loggedUserWorkingHoursPerWeek, setLoggedUserWorkingHoursPerWeek] = useState<number>(0);
  const [meetingStats, setMeetingStats] = useState<MeetingStats | null>(null);
  const [meetingsData, setMeetingsData] = useState<Meeting[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [historyStats, setHistoryStats] = useState<{ count: number; tab: 'submissions' | 'approvals' }>({ count: 0, tab: 'submissions' });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    try {
      if (typeof window === 'undefined') return undefined;
      const activeCompanyStr = localStorage.getItem("active_company") || localStorage.getItem("activeCompany");
      const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;

      if (activeCompany?.weekStartDate && activeCompany?.weekEndDate) {
        const calculatedStartDate = new Date(activeCompany.weekStartDate);
        calculatedStartDate.setHours(0, 0, 0, 0);
        const calculatedEndDate = new Date(activeCompany.weekEndDate);
        calculatedEndDate.setHours(23, 59, 59, 999);
        return { from: calculatedStartDate, to: calculatedEndDate };
      }

      return { from: undefined, to: undefined };
    } catch (error) {
      return { from: undefined, to: undefined };
    }
  });
  const [hasSubmittedForCycle, setHasSubmittedForCycle] = useState(false);
  const [lastSubmissionDate, setLastSubmissionDate] = useState<string | null>(null);
  const meetingTimeRef = useRef<MeetingTimeHandle>(null);

  useBreadcrumbsEffect([
    { label: "Pulse", isCurrentPage: true },
  ]);

  const fetchCurrentData = useCallback((signal?: AbortSignal) => {
    if (activeTab === 'current' && dateRange) {
      setLoading(true);
      setError(null);

      const activityData = {
        startDate: dateRange?.from?.toISOString(),
        endDate: dateRange?.to?.toISOString(),
      };
      Promise.allSettled([
        getNeedsAttentionData(signal),
        getSynlioActivityData(activityData, signal),
        getMeetingStats({ startDate: activityData.startDate, endDate: activityData.endDate }),
        getMeetings({ startDate: activityData.startDate, endDate: activityData.endDate }),
        getLoggedUserWorkingHoursPerWeek(),
        getPulseMyStatus(signal),
      ])
        .then((results) => {
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              if (index === 0) setNeedsAttentionData((result.value as any)?.data || []);
              if (index === 1) setSynlioActivityData((result.value as any)?.data || []);
              if (index === 2) setMeetingStats((result.value as MeetingStats) || null);
              if (index === 3) setMeetingsData((result.value as any)?.data || []);
              if (index === 4) setLoggedUserWorkingHoursPerWeek((result.value as any)?.data || 0);
              if (index === 5) {
                const res = result.value as any;
                setHasSubmittedForCycle(res?.data?.hasSubmittedForCycle || false);
                if (res?.data?.lastSubmissionDate) {
                  setLastSubmissionDate(res.data.lastSubmissionDate);
                }
              }
            } else {
              if (result.reason.name !== 'AbortError' && result.reason.name !== 'CanceledError' && result.reason.code !== 'ERR_CANCELED') {
                console.error("Failed to fetch data:", result.reason);
                setError(result.reason);
              }
            }
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [dateRange, activeTab, user]);

  useEffect(() => {
    if (activeTab === 'current') {
      const controller = new AbortController();
      fetchCurrentData(controller.signal);
      return () => controller.abort();
    }
  }, [fetchCurrentData, activeTab]);

  const handleSubmitWeeklySnapshot = async () => {
    if (!user) {
      return;
    }
    setIsSubmitting(true);
    try {

      const activeCompany = JSON.parse(localStorage.getItem('activeCompany') || '{}');

      const activityDataPayload = synlioActivityData.map(item => ({
        companyId: activeCompany?.companyId,
        pulseType: PulseType.SYNLIO_ACTIVITY,
        postType: item.postType,
        postId: item.id,
        postCode: item.code,
        postName: item.name,
        postSpaceId: item.spaceId,
        postSpaceName: item.space,
        resourceType: item.userRole === 'SBASS' ? AssigneeType.SBASS : (item.userRole === 'ASS' ? AssigneeType.ASS : item.userRole as AssigneeType),
        pulseSummary: JSON.stringify({ ...item.change, _statusBase: item.statusBase }),
        pulseSnapshotStatus: PulseSnapshotStatus.PENDING,
        allocatedHours: parseFloat(item.totalEffortInRange || '0'),
        submittedAt: new Date(),
      }));

      const meetingDataPayload = meetingsData.map(item => ({
        companyId: activeCompany?.companyId,
        pulseType: PulseType.MEETING_TIME,
        // postId: item.id,
        postCode: item.provider,
        postName: item.title,
        postSpaceId: 0,
        postSpaceName: 'Meetings',
        resourceType: AssigneeType.ASS,
        pulseSummary: JSON.stringify({ durationMinutes: item.effectiveDurationMinutes || item.durationMinutes, provider: item.provider }),
        pulseSnapshotStatus: PulseSnapshotStatus.PENDING,
        allocatedHours: (item.effectiveDurationMinutes || item.durationMinutes || 0) / 60,
        submittedAt: new Date(),
      }));

      const pulses = [...activityDataPayload, ...meetingDataPayload];
      const uniqueActivities = Array.from(new Map(synlioActivityData.map(item => [`${item.id}-${item.postType}`, item])).values());
      const synlioActivityTime = uniqueActivities.reduce((acc, item) => acc + parseFloat(item.totalEffortInRange || '0'), 0);
      const meetingTime = meetingStats?.totalHours ?? 0;
      const uniqueNeedsAttention = Array.from(new Map(needsAttentionData.map(item => [`${item.id}-${item.postType}`, item])).values());
      const needAttentionCount = uniqueNeedsAttention.length;

      const taskFromMeetingCount = meetingsData.filter(
        m => m.actionState === 'linked_to_task' || m.linkedTaskId != null
      ).length;

      const totalTrackedTime = synlioActivityTime + meetingTime;
      const missingTime = loggedUserWorkingHoursPerWeek - totalTrackedTime;

      const payload = {
        weekStartDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        weekEndDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        status: PulseSnapshotStatus.PENDING,
        submittedAt: new Date(),
        pulses: pulses,
        userProfilePicture: user.profile_picture,
        userFullName: user.first_name + ' ' + user.last_name,
        synlioActivityTime,
        meetingTime,
        needAttentionCount,
        taskFromMeetingCount,
        missingTime,
      };

      const response = await createSnapShot(payload);
      const newSnapshot = response.data;

      toast.success("Weekly snapshot submitted");
      setHasSubmittedForCycle(true);
      setLastSubmissionDate(new Date().toISOString());
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit weekly snapshot");
      // console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const dayOfWeek = today.getDay();
  let weekEndDay = 5;
  let isSubmissionDay = false;
  let nextSubmissionDate = "";

  try {
    const activeCompanyStr = localStorage.getItem('active_company') || localStorage.getItem('activeCompany');
    const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : {};

    if (activeCompany?.weekEndDate) {
      const endDate = new Date(activeCompany.weekEndDate);
      isSubmissionDay = today.toDateString() === endDate.toDateString();
      if (!isSubmissionDay) {
        nextSubmissionDate = format(endDate, "MMM d, yyyy");
      }
    }
  } catch (e) { }

  const isActuallySubmitted = hasSubmittedForCycle;

  if (!hasPulsePrivilege) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <ShieldOff className="h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm opacity-70">You don&apos;t have permission to access the Pulse module.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PulseHeader
        user={user}
        dateRange={dateRange}
        setDateRange={setDateRange}
        needsAttentionData={needsAttentionData}
        synlioActivityData={synlioActivityData}
        loading={loading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        snapshotCount={historyStats.count} // Loaded from PulseHistoryPage
        historyData={[]}
        isButtonDisabled={isActuallySubmitted}
        historyInnerTab={historyStats.tab}
      />
      <div className="flex-1 overflow-y-auto px-2">
        {activeTab === 'current' ? (
          <>
            <div className="px-6 pb-2">
              <StatCards
                needsAttentionData={needsAttentionData}
                synlioActivityData={synlioActivityData}
                loggedUserWorkingHoursPerWeek={loggedUserWorkingHoursPerWeek}
                meetingStats={meetingStats}
                loading={loading}
              />
            </div>
            <div className="px-6 py-2">
              <ThisWeekInsight
                synlioActivityData={synlioActivityData}
                needsAttentionData={needsAttentionData}
                loggedUserWorkingHoursPerWeek={loggedUserWorkingHoursPerWeek}
                meetingStats={meetingStats}
                loading={loading}
              />
            </div>
            <div className="grid gap-4 px-6 py-2">
              <SynlioActivity
                user={user}
                data={synlioActivityData}
                loading={loading}
                error={error}
                startDate={dateRange?.from ? (() => { const d = new Date(dateRange.from); d.setHours(0, 0, 0, 0); return d.toISOString(); })() : undefined}
                endDate={dateRange?.to ? (() => { const d = new Date(dateRange.to); d.setHours(23, 59, 59, 999); return d.toISOString(); })() : undefined}
                onActionComplete={(newEffort?: number, postId?: number, postType?: string) => {
                  if (newEffort !== undefined && postId !== undefined && postType) {
                    setSynlioActivityData(prev => prev.map(item =>
                      (item.id === postId) ? { ...item, totalEffortInRange: String(newEffort) } : item
                    ));
                  } else {
                    fetchCurrentData();
                  }
                }}
              />
              <MeetingTime
                ref={meetingTimeRef}
                startDate={dateRange?.from ? (() => { const d = new Date(dateRange.from); d.setHours(0, 0, 0, 0); return d.toISOString(); })() : undefined}
                endDate={dateRange?.to ? (() => { const d = new Date(dateRange.to); d.setHours(23, 59, 59, 999); return d.toISOString(); })() : undefined}
                onActionComplete={() => {
                  fetchCurrentData();
                }}
              />
              <NeedsAttention
                data={needsAttentionData}
                loading={loading}
                error={error}
                onActionComplete={() => {
                  fetchCurrentData();
                }}
              />
            </div>
          </>
        ) : (
          <PulseHistoryPage
            user={user}
            onActionComplete={() => { }}
            onStatsChange={(count, tab) => setHistoryStats({ count, tab })}
          />
        )}
      </div>
      {activeTab === 'current' && (
        <footer className="shrink-0 border-t px-9 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {/*© {new Date().getFullYear()} Synlio. All rights reserved.*/}
          </span>
          <div className="flex items-center gap-2">
            {lastSubmissionDate && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4" /> Submitted {formatDistanceToNow(new Date(lastSubmissionDate), { addSuffix: true })}
              </span>
            )}
            {lastSubmissionDate && !isSubmissionDay && !isActuallySubmitted && (
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            )}
            {!isSubmissionDay && nextSubmissionDate && !isActuallySubmitted && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4" /> Next Submission at {nextSubmissionDate}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => {
                fetchCurrentData();
                meetingTimeRef.current?.syncMeetingsData();
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            {!isActuallySubmitted && isSubmissionDay && (
              <Button
                variant="default"
                size="sm"
                className="text-sm"
                onClick={handleSubmitWeeklySnapshot}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Snapshot
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Snapshot
                  </>
                )}
              </Button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};

export default PulsePage;
