"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock, ClockPlus } from "lucide-react";
import { WorkLogTable } from "@/components/common/work-log-table";
import { 
  getResourceTaskLogHistory, 
  getResourceTicketLogHistory, 
  createResourceLog, 
  updateResourceLog, 
  deleteResourceLog 
} from "@/services/work-log/work-log.service";
import { toast } from "sonner";
import { format, endOfWeek, addDays, startOfWeek } from "date-fns";

export interface WorkLogPopoverProps {
  postId: number;
  postType: 'Task' | 'Ticket' | 'Activity';
  postCode: string;
  postName: string;
  spaceId: number;
  spaceName: string;
  statusBase: string;
  user: any;
  currentEffort: number;
  startDate?: string; // Week start date for calculation
  endDate?: string;   // Week end date for calculation
  onActionComplete?: (totalEffort?: number, postId?: number, postType?: string) => void;
  isDraft?: boolean;
  draftId?: number | null;
  triggerButton?: React.ReactNode;
}

export function WorkLogPopover({
  postId,
  postType,
  postCode,
  postName,
  spaceId,
  spaceName,
  statusBase,
  user,
  currentEffort,
  startDate,
  endDate,
  onActionComplete,
  isDraft,
  draftId,
  triggerButton
}: WorkLogPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // WorkLogTable specific states
  const [logPage, setLogPage] = useState(1);
  const [newLogEntry, setNewLogEntry] = useState<{ startTimeDate: Date | null, endTimeDate: Date | null, effort: string, note: string }>({
    startTimeDate: null,
    endTimeDate: null,
    effort: '',
    note: ''
  });
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingLogEntry, setEditingLogEntry] = useState<{ startTimeDate: Date | null, endTimeDate: Date | null, effort: string, note: string } | null>(null);

  const LOGS_PER_PAGE = 5;
  const totalLogPages = Math.ceil(logs.length / LOGS_PER_PAGE);
  
  const paginatedLogs = useMemo(() => {
    return logs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);
  }, [logs, logPage]);

  const activeCompany = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('active_company') || '{}');
    } catch {
      return {};
    }
  }, []);

  const currentUser = useMemo(() => {
    return user || (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        return {};
      }
    })();
  }, [user]);

  const getNextWeekEndDay = useCallback((d: Date | string) => {
    if (!d) return null;
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return null;
    const sunday = addDays(dateObj, (0 - dateObj.getDay() + 7) % 7);
    return sunday;
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!postId || postType === 'Activity') return;
    setLoading(true);
    try {
      let data = [];
      if (postType === 'Task') {
        data = await getResourceTaskLogHistory(postId);
      } else {
        data = await getResourceTicketLogHistory(postId);
      }
      // Sort desc by latest week (startTimeDate), fallback to creation date
      data = (data || []).sort((a: any, b: any) => {
        const dateA = a.startTimeDate ? new Date(a.startTimeDate).getTime() : 0;
        const dateB = b.startTimeDate ? new Date(b.startTimeDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load past logs');
    } finally {
      setLoading(false);
    }
  }, [postId, postType]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      
      // Auto set current week selection
      const now = new Date();
      
      const parsedStart = startDate ? new Date(startDate.split('T')[0] + 'T00:00:00') : startOfWeek(now, { weekStartsOn: 1 });
      const parsedEnd = endDate ? new Date(endDate.split('T')[0] + 'T00:00:00') : endOfWeek(now, { weekStartsOn: 1 });
      
      setNewLogEntry({
        startTimeDate: parsedStart,
        endTimeDate: parsedEnd,
        effort: '',
        note: ''
      });
      setLogPage(1);
    }
  }, [isOpen, fetchLogs]);

  // Recalculate effort and sync
  const recalculateAndSync = async (updatedLogs: any[]) => {
    if (!startDate || !endDate) {
      if (onActionComplete) onActionComplete();
      return;
    }
    
    // Sum logs within the start/end date range of the pulse
    let totalEffortInRange = 0;
    const weekStart = new Date(startDate);
    const weekEnd = new Date(endDate);
    
    updatedLogs.forEach(log => {
      const logStart = new Date(log.startTimeDate);
      const logEnd = new Date(log.endTimeDate);
      // Overlap logic
      if ((logStart >= weekStart && logStart <= weekEnd) || (logEnd >= weekStart && logEnd <= weekEnd) || (logStart <= weekStart && logEnd >= weekEnd)) {
         totalEffortInRange += Number(log.effort || 0);
      }
    });

    if (isDraft && draftId) {
      try {
        const { syncPulseRecord } = await import("@/services/pulse.service");
        const pulseSummary = JSON.stringify({
          event_type: postType === 'Task' ? 'TASK_UPDATED' : 'TICKET_UPDATED',
          payload: {
            effort: { from: null, to: totalEffortInRange }
          },
          _changeOccurredAt: (endDate && new Date() > new Date(endDate)) ? endDate : new Date().toISOString(),
          _statusBase: statusBase
        });
        await syncPulseRecord(draftId, {
          postId: postId,
          postCode: postCode,
          postName: postName,
          postSpaceId: spaceId,
          postSpaceName: spaceName,
          postType: postType,
          pulseType: 'Synlio Activity',
          resourceType: 'ASSIGNEE',
          pulseSummary: pulseSummary,
          allocatedHours: totalEffortInRange
        });
      } catch (err) {
        console.error(err);
      }
    }
    
    if (onActionComplete) {
      onActionComplete(totalEffortInRange, postId, postType);
    }
  };

  const handleSaveLog = async () => {
    if (!newLogEntry.effort || !newLogEntry.startTimeDate || !newLogEntry.endTimeDate) return;
    setIsAddingLog(true);
    try {
      const payload = {
        companyId: activeCompany.companyId || activeCompany.id,
        divisionId: currentUser.divisionId || activeCompany.divisionId || null,
        postId: postId,
        postCode: postCode,
        postType: postType,
        resourceId: currentUser.id,
        resourceName: `${currentUser.first_name || currentUser.firstName || ''} ${currentUser.last_name || currentUser.lastName || ''}`.trim(),
        resourceEmail: currentUser.email,
        resourceType: 'ASSIGNEE',
        startTimeDate: format(newLogEntry.startTimeDate, 'yyyy-MM-dd'),
        endTimeDate: format(newLogEntry.endTimeDate, 'yyyy-MM-dd'),
        effort: parseFloat(newLogEntry.effort),
        note: newLogEntry.note,
      };

      const res = await createResourceLog(payload);
      toast.success('Work log added');
      
      const newLogs = [res, ...logs];
      setLogs(newLogs);
      
      const now = new Date();
      setNewLogEntry({ 
        startTimeDate: startOfWeek(now, { weekStartsOn: 1 }), 
        endTimeDate: endOfWeek(now, { weekStartsOn: 1 }), 
        effort: '', 
        note: '' 
      });
      
      await recalculateAndSync(newLogs);
    } catch (error) {
      toast.error('Failed to add work log');
    } finally {
      setIsAddingLog(false);
    }
  };

  const handleUpdateLog = async () => {
    if (!editingLogId || !editingLogEntry) return;
    try {
      const payload = {
        startTimeDate: editingLogEntry.startTimeDate ? format(editingLogEntry.startTimeDate, 'yyyy-MM-dd') : null,
        endTimeDate: editingLogEntry.endTimeDate ? format(editingLogEntry.endTimeDate, 'yyyy-MM-dd') : null,
        effort: parseFloat(editingLogEntry.effort),
        note: editingLogEntry.note,
      };

      const res = await updateResourceLog(editingLogId, payload);
      toast.success('Work log updated');
      
      const newLogs = logs.map(l => l.id === editingLogId ? res : l);
      setLogs(newLogs);
      setEditingLogId(null);
      setEditingLogEntry(null);
      
      await recalculateAndSync(newLogs);
    } catch (error) {
      toast.error('Failed to update work log');
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      await deleteResourceLog(id);
      toast.success('Work log deleted');
      const newLogs = logs.filter(l => l.id !== id);
      setLogs(newLogs);
      await recalculateAndSync(newLogs);
    } catch (error) {
      toast.error('Failed to delete work log');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerButton ? triggerButton : (
          Number(currentEffort || 0) > 0 ? (
            <Button variant="outline" size="xs" className="h-6 text-xs gap-1 border-dashed border-primary/50 text-primary hover:text-primary hover:bg-primary/5" title="Edit Time">
              <Clock className="h-3.5 w-3.5 mr-0.5" /> {Number(currentEffort || 0).toFixed(2)}h
            </Button>
          ) : (
            <Button variant="outline" size="xs" className="h-6 text-xs gap-1" title="Add Time">
              <ClockPlus className="h-3.5 w-3.5 mr-0.5" /> Log Time
            </Button>
          )
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="max-h-[600px] overflow-y-auto bg-muted/30 rounded-md">
           <WorkLogTable
              paginatedLogs={paginatedLogs}
              canEditLogs={true}
              newLogEntry={newLogEntry}
              setNewLogEntry={setNewLogEntry as any}
              handleSaveLog={handleSaveLog}
              isAddingLog={isAddingLog}
              editingLogId={editingLogId}
              setEditingLogId={setEditingLogId}
              editingLogEntry={editingLogEntry}
              setEditingLogEntry={setEditingLogEntry as any}
              handleUpdateLog={handleUpdateLog}
              handleDeleteLog={handleDeleteLog}
              logPage={logPage}
              setLogPage={setLogPage}
              totalLogPages={totalLogPages}
              getNextWeekEndDay={getNextWeekEndDay as any}
              postType={postType}
              disableWeekSelection={true}
              activeWeekStart={startDate}
              activeWeekEnd={endDate}
              showTopBorder={false}
              hideNotice={true}
            />
        </div>
      </PopoverContent>
    </Popover>
  );
}
