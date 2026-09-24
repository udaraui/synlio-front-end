import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';

export type LinkTypePostType = 'Task' | 'Ticket';

export interface LinkType {
  id: number;
  name: string;
  postType: LinkTypePostType;
  color?: string | null;
  icon?: string | null;
  isDefault?: boolean;
  /** Number of work_item_link records currently using this link type. */
  usageCount?: number;
}

export const getLinkTypes = async (
  postType?: LinkTypePostType,
): Promise<LinkType[]> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.LINK_TYPE}`, {
      params: postType ? { postType } : {},
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching link types:', error);
    throw error;
  }
};

export const createLinkType = async (dto: {
  name: string;
  postType: LinkTypePostType;
  color?: string;
  icon?: string;
  isDefault?: boolean;
}): Promise<LinkType> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.LINK_TYPE}`,
      dto,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error creating link type:', error);
    throw error;
  }
};

export const updateLinkType = async (
  id: number,
  dto: {
    id: number;
    name?: string;
    postType?: LinkTypePostType;
    color?: string;
    icon?: string;
    isDefault?: boolean;
  },
): Promise<LinkType> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.LINK_TYPE}/${id}`,
      dto,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating link type:', error);
    throw error;
  }
};

export const deleteLinkType = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.LINK_TYPE}/${id}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting link type:', error);
    throw error;
  }
};

