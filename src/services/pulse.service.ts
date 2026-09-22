import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from './API/api';

export const getNeedsAttentionData = async (signal?: AbortSignal) => {
  try {
    return await axiosInstance.get(`${API_ENDPOINTS.PULSE}/needs-attention`, { signal, withCredentials: true });
  } catch (error) {
    // console.error("Error fetching needs attention data:", error);
    throw error;
  }
};

export const getPulseMyStatus = async (signal?: AbortSignal) => {
  try {
    return await axiosInstance.get<{ hasSubmittedForCycle: boolean, lastSubmissionDate: string | null }>(`${API_ENDPOINTS.PULSE}/get-my-submisson-status`, { signal, withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const getSynlioActivityData = async (data: { startDate?: string; endDate?: string }, signal?: AbortSignal) => {
  try {
    return await axiosInstance.get(`${API_ENDPOINTS.PULSE}/synlio-activity`, { params: data, signal, withCredentials: true });
  } catch (error) {
    // console.error("Error fetching Synlio activity data:", error);
    throw error;
  }
};

export const getLoggedUserWorkingHoursPerWeek = async () => {
  try {
    return await axiosInstance.get<number>(`${API_ENDPOINTS.PULSE}/logged-user-working-hours`, { withCredentials: true });
  } catch (error) {
    // console.error("Error fetching logged user working hours per week:", error);
    throw error;
  }
};

export const createSnapShot = async (data: any) => {
  try {
    return await axiosInstance.post(`${API_ENDPOINTS.PULSE}/snapshot`, data, { withCredentials: true });
  } catch (error) {
    console.error("Error creating snapshot:", error);
    throw error;
  }
};

export const searchPulseWeeks = async (queryParams: any) => {
  try {
    return await axiosInstance.post(`${API_ENDPOINTS.PULSE}/week/search`, queryParams, { withCredentials: true });
  } catch (error) {
    // console.error("Error searching pulse weeks:", error);
    throw error;
  }
};

export const syncPulseRecord = async (weekId: number, pulseData: any) => {
  return axiosInstance.patch(`${API_ENDPOINTS.PULSE}/week/${weekId}/sync-pulse`, pulseData);
};

export const getPulseWeekToApprove = async (data: { weekId: number, companyId: number, submittedToEmail: string }) => {
  try {
    return await axiosInstance.post(`${API_ENDPOINTS.PULSE}/week/to-approve`, data, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const getPulseWeekPulses = async (weekId: number) => {
  try {
    return await axiosInstance.get(`${API_ENDPOINTS.PULSE}/week/${weekId}/pulses`, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const getPostHierarchy = async (postId: number, postType: string) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.PULSE}/hierarchy/${postType}/${postId}`, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getItemStatusConfig = async (postType: string, spaceId: number, postId: number): Promise<{ statuses: any[], currentStatusId: number | null }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.PULSE}/item-status-config/${postType}/${spaceId}/${postId}`, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getItemProgress = async (postType: string, postId: number): Promise<{ progressPercentage: number | null }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.PULSE}/item-progress/${postType}/${postId}`, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getItemDates = async (postType: string, postId: number): Promise<{ startDate: Date | null, dueDate: Date | null }> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.PULSE}/item-dates/${postType}/${postId}`, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const submitPulseWeek = async (id: number, data: { submittedToId: number }) => {
  try {
    return await axiosInstance.patch(`${API_ENDPOINTS.PULSE}/week/${id}/submit`, data, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const forwardPulseWeek = async (id: number, data: { submittedToId: number, forwardMessage?: string }) => {
  try {
    return await axiosInstance.patch(`${API_ENDPOINTS.PULSE}/week/${id}/forward`, data, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const approvePulseWeek = async (id: number, data: { approvedById?: number; approvedByEmail?: string }) => {
  try {
    return await axiosInstance.patch(`${API_ENDPOINTS.PULSE}/week/${id}/approve`, data, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const rejectPulseWeek = async (id: number, data: { rejectReason: string }) => {
  try {
    return await axiosInstance.patch(`${API_ENDPOINTS.PULSE}/week/${id}/reject`, data, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};

export const logTimeOnPulseRecord = async (weekId: number, pulseId: number, data: { hours: number; startDate?: string; endDate?: string }) => {
  try {
    return await axiosInstance.patch(`${API_ENDPOINTS.PULSE}/week/${weekId}/pulse/${pulseId}/log-time`, data, { withCredentials: true });
  } catch (error) {
    throw error;
  }
};