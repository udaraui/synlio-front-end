import axiosInstance from '@/lib/interceptors/axiosInstance';
import { API_ENDPOINTS } from '../api';

const BASE = API_ENDPOINTS.TASK_MANAGEMENT_TASK_LABEL;

export interface CreateTmTaskLabelDto {
  name: string;
  taskSpaceId: number;
}

export interface UpdateTmTaskLabelDto {
  name: string;
}

export interface AssignTmTaskLabelsDto {
  taskId: number;
  existingLabelIds?: number[];
  newLabelNames?: string[];
}

export const searchTmTaskLabels = async (
  params: Record<string, any>,
): Promise<{ total: number; data: any[] }> => {
  const response = await axiosInstance.post(`${BASE}/search`, params, {
    withCredentials: true,
  });
  return response.data;
};

export const getLabelsByTaskSpace = async (taskSpaceId: number): Promise<any[]> => {
  const response = await axiosInstance.get(`${BASE}/by-task-space/${taskSpaceId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const createTmTaskLabel = async (data: CreateTmTaskLabelDto): Promise<any> => {
  const response = await axiosInstance.post(`${BASE}/create`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const assignTmTaskLabels = async (data: AssignTmTaskLabelsDto): Promise<any> => {
  const response = await axiosInstance.post(`${BASE}/assign-labels`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const updateTmTaskLabel = async (id: number, data: UpdateTmTaskLabelDto): Promise<any> => {
  const response = await axiosInstance.put(`${BASE}/update/${id}`, data, {
    withCredentials: true,
  });
  return response.data;
};

export const deleteTmTaskLabel = async (id: number): Promise<any> => {
  const response = await axiosInstance.delete(`${BASE}/delete/${id}`, {
    withCredentials: true,
  });
  return response.data;
};


