import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';

export interface TicketAnalyticsQuery {
  companyId: number;
  spaceId?: number;
  dateFrom?: string;
  dateTo?: string;
  assigneePermissionIds?: number[];
  assigneeName?: string;
  statusBases?: string[];
  limit?: number;
}

export const getTicketDashboard = async (query: TicketAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/ticket/dashboard`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

export const getTicketStatusKpi = async (query: TicketAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/ticket/status-kpi`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

export const getTicketDailyActivity = async (query: TicketAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/ticket/daily-activity`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

export const getTicketWorkload = async (query: TicketAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/ticket/workload`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

export const getTicketRecentList = async (query: TicketAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/ticket/recent-list`,
    query,
    { withCredentials: true },
  );
  return response.data;
};
