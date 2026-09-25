import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';

export type FilterTemplateType = 'TASK' | 'TICKET';
export type FilterTemplateVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

export interface FilterTemplateUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string | null;
}

export interface FilterTemplate {
  id: number;
  name: string;
  description?: string;
  type: FilterTemplateType;
  visibility: FilterTemplateVisibility;
  filters: Record<string, any>;
  isDefault?: boolean;
  userId: number;
  companyId: number;
  createdAt: string;
  updatedAt?: string;
  isOwner?: boolean;
  creator?: FilterTemplateUser | null;
  sharedUserIds?: number[];
}

export interface CategorizedFilterTemplates {
  private: FilterTemplate[];
  sharedWithMe: FilterTemplate[];
  public: FilterTemplate[];
}

export interface CreateFilterTemplatePayload {
  name: string;
  description?: string;
  type: FilterTemplateType;
  visibility?: FilterTemplateVisibility;
  filters: Record<string, any>;
  sharedUserIds?: number[];
}

export interface ShareFilterTemplatePayload {
  userIds: number[];
  visibility?: FilterTemplateVisibility;
}

/**
 * Fetch all visible filter templates for the active company, categorized by visibility:
 * - private
 * - sharedWithMe
 * - public
 */
export const getCategorizedFilterTemplates = async (
  type: FilterTemplateType,
): Promise<CategorizedFilterTemplates> => {
  try {
    const response = await axiosInstance.get<CategorizedFilterTemplates>(
      `${API_ENDPOINTS.FILTER_TEMPLATE}?type=${type}`,
      { withCredentials: true },
    );
    return response.data || { private: [], sharedWithMe: [], public: [] };
  } catch (error) {
    console.error('Error fetching filter templates:', error);
    return { private: [], sharedWithMe: [], public: [] };
  }
};

/**
 * Create a new filter template
 */
export const createFilterTemplate = async (
  payload: CreateFilterTemplatePayload,
): Promise<FilterTemplate> => {
  const response = await axiosInstance.post<FilterTemplate>(
    API_ENDPOINTS.FILTER_TEMPLATE,
    payload,
    { withCredentials: true },
  );
  return response.data;
};

/**
 * Update an existing filter template
 */
export const updateFilterTemplate = async (
  id: number,
  payload: Partial<CreateFilterTemplatePayload>,
): Promise<FilterTemplate> => {
  const response = await axiosInstance.patch<FilterTemplate>(
    `${API_ENDPOINTS.FILTER_TEMPLATE}/${id}`,
    payload,
    { withCredentials: true },
  );
  return response.data;
};

/**
 * Share a template with specific users or change visibility
 */
export const shareFilterTemplate = async (
  id: number,
  payload: ShareFilterTemplatePayload,
): Promise<FilterTemplate> => {
  const response = await axiosInstance.post<FilterTemplate>(
    `${API_ENDPOINTS.FILTER_TEMPLATE}/${id}/share`,
    payload,
    { withCredentials: true },
  );
  return response.data;
};

/**
 * Delete a filter template
 */
export const deleteFilterTemplate = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${API_ENDPOINTS.FILTER_TEMPLATE}/${id}`, {
    withCredentials: true,
  });
};
