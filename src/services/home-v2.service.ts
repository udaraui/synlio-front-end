import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "./API/api";

type StatusCount = {
  id: number;
  name: string;
  color: string;
  count: number;
};

/**
 * Fetch the top-5 tasks assigned to the currently authenticated user.
 * Backend: GET /dashboard/my-tasks
 * Returns tasks not in "Finished" status, sorted by dueDate DESC.
 */
export const getMyTasks = async (
  signal?: AbortSignal,
  dates?: string[],
  rows?: number,
  page?: number,
  windowFrom?: string,
  fromDate?: string,
  toDate?: string,
  tab?: string,
): Promise<{
  total: number;
  overdueCount: number;
  dueTodayCount: number;
  statusCounts: StatusCount[];
  data: any[];
}> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/my-tasks`, {
      withCredentials: true,
      signal,
      params: {
        ...(dates && dates.length > 0 ? { dates: dates.join(',') } : {}),
        ...(windowFrom ? { windowFrom } : {}),
        ...(rows ? { rows } : {}),
        ...(page !== undefined && page > 0 ? { page } : {}),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
        ...(tab && { tab }),
      },
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") {
      throw error; // re-throw silently — callers already ignore cancellations
    }
    console.error("Error fetching my tasks:", error);
    throw error;
  }
};

/**
 * Fetch tickets assigned to the currently authenticated user.
 * Optional date filter (YYYY-MM-DD): only tickets whose slaResolutionDeadline falls on that day.
 * Optional rows override (default 10).
 */
export const getMyTickets = async (
  signal?: AbortSignal,
  dates?: string[],
  rows?: number,
  page?: number,
  windowFrom?: string,
  fromDate?: string,
  toDate?: string,
  tab?: string,
): Promise<{
  total: number;
  overdueCount: number;
  dueTodayCount: number;
  statusCounts: StatusCount[];
  data: any[];
}> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/my-tickets`, {
      withCredentials: true,
      signal,
      params: {
        ...(dates && dates.length > 0 ? { dates: dates.join(',') } : {}),
        ...(windowFrom ? { windowFrom } : {}),
        ...(rows ? { rows } : {}),
        ...(page !== undefined && page > 0 ? { page } : {}),
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
        ...(tab && { tab }),
      },
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") {
      throw error; // re-throw silently — callers already ignore cancellations
    }
    console.error("Error fetching my tickets:", error);
    throw error;
  }
};

/**
 * Fetch total (not-finished) task + ticket counts assigned to the current user.
 * Lightweight — does not return data rows.
 */
export const getMyCounts = async (
  signal?: AbortSignal,
  includeTasks = true,
  includeTickets = true,
): Promise<{
  dueTasks: number;
  dueTickets: number;
  dueTaskSpaces: string[];
  dueTicketSpaces: string[];
}> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/my-counts`, {
      withCredentials: true,
      signal,
      params: {
        includeTasks:   includeTasks   ? undefined : 'false',
        includeTickets: includeTickets ? undefined : 'false',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") throw error;
    console.error("Error fetching my counts:", error);
    throw error;
  }
};

/**
 * Fetch task-space summaries for the logged-in user.
 * Lazy – only called when the user switches to "Spaces" view in MyTasksColumn.
 */
export const getMyTaskSpaces = async (
  signal?: AbortSignal,
): Promise<{ id: number; name: string; prefix: string; avgProgress: number; taskCount: number; rootLevelName: string | null; rootLevelIcon: string | null; rootLevelColor: string | null }[]> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/my-task-spaces`, {
      withCredentials: true,
      signal,
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") throw error;
    console.error("Error fetching my spaces:", error);
    throw error;
  }
};

/**
 * Fetch ticket-space summaries for the logged-in user.
 * Lazy – only called when the user switches to "Spaces" view in MyTicketsColumn.
 */
export const getMyTicketSpaces = async (
  signal?: AbortSignal,
): Promise<{ id: number; name: string; prefix: string; completedCount: number; totalCount: number }[]> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/my-ticket-spaces`, {
      withCredentials: true,
      signal,
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") throw error;
    console.error("Error fetching my ticket spaces:", error);
    throw error;
  }
};

/**
 * Fetch per-day task + ticket counts for the calendar dots.
 * from/to: YYYY-MM-DD (inclusive). Meetings always 0 for now.
 */
export const getCalendarCounts = async (
  from: string,
  to: string,
  signal?: AbortSignal,
  includeTasks = true,
  includeTickets = true,
): Promise<Record<string, { tasks: number; tickets: number; meetings: number }>> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/calendar-counts`, {
      withCredentials: true,
      signal,
      params: {
        from,
        to,
        includeTasks:   includeTasks   ? undefined : 'false',
        includeTickets: includeTickets ? undefined : 'false',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError") {
      throw error;
    }
    console.error("Error fetching calendar counts:", error);
    throw error;
  }
};