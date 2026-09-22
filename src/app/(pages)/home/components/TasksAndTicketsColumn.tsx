"use client";

import React, { useState, useEffect } from 'react';
import MyTasksColumn from './MyTasksColumn';
import MyTicketsColumn from './MyTicketsColumn';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TasksAndTicketsColumnProps {
  dates: string[];
  canFetchTasks: boolean;
  canFetchTickets: boolean;
  dateRange?: DateRange;
}

const TasksAndTicketsColumn: React.FC<TasksAndTicketsColumnProps> = ({
  dates,
  canFetchTasks,
  canFetchTickets,
  dateRange,
}) => {
  const [activeView, setActiveView] = useState<'tasks' | 'tickets'>('tasks');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [taskTotalPages, setTaskTotalPages] = useState(0);
  const [ticketTotalPages, setTicketTotalPages] = useState(0);

  const activeTotalPages = activeView === 'tasks' ? taskTotalPages : ticketTotalPages;

  useEffect(() => {
    setTotalPages(activeTotalPages);
  }, [activeTotalPages]);

  return (
    <div className="min-w-0 flex flex-col overflow-hidden min-h-[300px]">
      <div className="flex justify-between items-center px-3 pt-3 pb-2">
        <div className="flex w-fit gap-1 rounded-md border p-0.5 bg-background shadow-shrink-0">
          <Button
            size="sm"
            className="h-6 text-xs px-2.5"
            variant={activeView === 'tasks' ? 'default' : 'ghost'}
            onClick={() => { setActiveView('tasks'); setPage(0); }}
            disabled={!canFetchTasks}
          >
            {activeView === 'tasks' ? 'My Tasks' : 'Tasks'}
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2.5"
            variant={activeView === 'tickets' ? 'default' : 'ghost'}
            onClick={() => { setActiveView('tickets'); setPage(0); }}
            disabled={!canFetchTickets}
          >
            {activeView === 'tickets' ? 'My Tickets' : 'Tickets'}
          </Button>
        </div>
        {totalPages > 1 && (
          <div className={`flex items-center justify-center gap-1 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={loading || page === 0} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={loading || page >= totalPages - 1} className="p-1 disabled:opacity-30 disabled:cursor-not-allowed" title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {activeView === 'tasks' && canFetchTasks && (
        <MyTasksColumn
          dates={dates}
          canFetch={canFetchTasks}
          dateRange={dateRange}
          page={page}
          setPage={setPage}
          totalPages={taskTotalPages}
          setTotalPages={setTaskTotalPages}
          setLoading={setLoading}
        />
      )}
      {activeView === 'tickets' && canFetchTickets && (
        <MyTicketsColumn
          dates={dates}
          canFetch={canFetchTickets}
          dateRange={dateRange}
          page={page}
          setPage={setPage}
          totalPages={ticketTotalPages}
          setTotalPages={setTicketTotalPages}
          setLoading={setLoading}
        />
      )}
    </div>
  );
};

export default TasksAndTicketsColumn;
