import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';

export type WorkItemType = 'Task' | 'Ticket';

export interface LinkedWorkItem {
  id: number;
  type: WorkItemType;
  code: string;
  name: string;
  spaceName: string | null;
  severityName: string | null;
  severityColor: string | null;
  statusName: string | null;
  statusColor: string | null;
  startDate: string | null;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeProfilePicUrl: string | null;
  typeIcon: string | null;
  typeColor: string | null;
  typeName: string | null;
}

export interface WorkItemLink {
  linkId: number;
  linkTypeId: number | null;
  linkTypeName: string | null;
  linkTypeColor: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  item: LinkedWorkItem;
}

/** Fetch every link attached to a work item (from either side). */
export const getWorkItemLinks = async (
  type: WorkItemType,
  id: number,
): Promise<{ links: WorkItemLink[] }> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WORK_ITEM_LINK}/${type}/${id}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching work item links:', error);
    throw error;
  }
};

export const createWorkItemLink = async (dto: {
  sourceType: WorkItemType;
  sourceId: number;
  targetType: WorkItemType;
  targetId: number;
  linkTypeId: number;
  note?: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WORK_ITEM_LINK}`,
      dto,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error creating work item link:', error);
    throw error;
  }
};

export const updateWorkItemLink = async (
  linkId: number,
  dto: { linkTypeId?: number; note?: string },
): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.WORK_ITEM_LINK}/${linkId}`,
      dto,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating work item link:', error);
    throw error;
  }
};

export const deleteWorkItemLink = async (linkId: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.WORK_ITEM_LINK}/${linkId}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting work item link:', error);
    throw error;
  }
};

export const checkWorkItemAccess = async (
  type: WorkItemType,
  id: number,
): Promise<{ hasAccess: boolean; message?: string }> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WORK_ITEM_LINK}/check-access/${type}/${id}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error checking work item access:', error);
    return {
      hasAccess: false,
      message:
        "Sorry, you must be a member of the space to view this item.",
    };
  }
};

