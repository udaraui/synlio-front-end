import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../API/api';

export interface ResourceAnalyticsQuery {
  companyId: number;
}

export const getResourceDashboard = async (query: ResourceAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/resource/dashboard`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

export const getResourceSkillGap = async (query: ResourceAnalyticsQuery): Promise<any[]> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.SYNALYTICS}/resource/skill-gap`,
    query,
    { withCredentials: true },
  );
  return response.data;
};

