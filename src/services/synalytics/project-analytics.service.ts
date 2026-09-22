import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../API/api';

export interface ProjectAnalyticsQuery {
  companyId: number;
  taskSpaceId?: number;
  assigneeResourceId?: number;
  statusBases?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export const getProjectDashboard = async (query: ProjectAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/project/dashboard`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

export const getProjectTaskDetail = async (query: ProjectAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/project/task-detail`,
    query,
    { withCredentials: true },
  );
  return response.data;
};
