import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from './API/api';

export interface SpaceAlertRule {
  id: number;
  name: string;
  spaceType: string;
  spaceId: number;
  events: string[];
  channel: 'in_app' | 'email' | 'both';
  toAssignee: boolean;
  toCoAssignees: boolean;
  toParticipants: boolean;
  toCreator: boolean;
  toActor: boolean;
  toAdditionalUserIds: number[];
  ccAssignee: boolean;
  ccCoAssignees: boolean;
  ccParticipants: boolean;
  ccCreator: boolean;
  ccActor: boolean;
  ccAdditionalUserIds: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateAlertRulePayload = Omit<SpaceAlertRule, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAlertRulePayload = Partial<CreateAlertRulePayload>;

export const getAlertRulesBySpace = async (
  spaceType: string,
  spaceId: number,
): Promise<SpaceAlertRule[]> => {
  const res = await axiosInstance.get(
    `${API_ENDPOINTS.ALERT_RULE}/space/${spaceType}/${spaceId}`,
    { withCredentials: true },
  );
  return res.data;
};

export const getAlertRuleById = async (id: number): Promise<SpaceAlertRule> => {
  const res = await axiosInstance.get(`${API_ENDPOINTS.ALERT_RULE}/${id}`, {
    withCredentials: true,
  });
  return res.data;
};

export const createAlertRule = async (
  payload: CreateAlertRulePayload,
): Promise<SpaceAlertRule> => {
  const res = await axiosInstance.post(API_ENDPOINTS.ALERT_RULE, payload, {
    withCredentials: true,
  });
  return res.data;
};

export const updateAlertRule = async (
  id: number,
  payload: UpdateAlertRulePayload,
): Promise<SpaceAlertRule> => {
  const res = await axiosInstance.patch(
    `${API_ENDPOINTS.ALERT_RULE}/${id}`,
    payload,
    { withCredentials: true },
  );
  return res.data;
};

export const toggleAlertRule = async (id: number): Promise<SpaceAlertRule> => {
  const res = await axiosInstance.patch(
    `${API_ENDPOINTS.ALERT_RULE}/${id}/toggle`,
    {},
    { withCredentials: true },
  );
  return res.data;
};

export const deleteAlertRule = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${API_ENDPOINTS.ALERT_RULE}/${id}`, {
    withCredentials: true,
  });
};

export const searchAlertRuleUsers = async (
  q: string,
  companyId?: number,
): Promise<{ id: number; email: string; first_name: string; last_name: string }[]> => {
  const res = await axiosInstance.get(`${API_ENDPOINTS.ALERT_RULE}/users/search`, {
    params: { q, ...(companyId ? { companyId } : {}) },
    withCredentials: true,
  });
  return res.data;
};

export const getUsersByIds = async (
  ids: number[],
): Promise<{ id: number; email: string; first_name: string; last_name: string }[]> => {
  if (!ids.length) return [];
  const res = await axiosInstance.get(`${API_ENDPOINTS.ALERT_RULE}/users/by-ids`, {
    params: { ids: ids.join(',') },
    withCredentials: true,
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return res.data;
};

