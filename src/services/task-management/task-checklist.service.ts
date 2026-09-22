import axiosInstance from '@/lib/interceptors/axiosInstance';
import type {
  CreateTaskChecklistDto,
  TaskChecklist,
  UpdateTaskChecklistDto,
} from '@/interfaces/task-checklist';

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/task-management/task-checklist`;

export const getTmChecklistByTask = async (taskId: number): Promise<TaskChecklist[]> => {
  const response = await axiosInstance.get(`${BASE}/task/${taskId}`, { withCredentials: true });
  return response.data;
};

export const createTmChecklist = async (
  data: CreateTaskChecklistDto,
): Promise<TaskChecklist> => {
  const response = await axiosInstance.post(BASE, data, { withCredentials: true });
  return response.data;
};

export const updateTmChecklist = async (
  id: number,
  data: UpdateTaskChecklistDto,
): Promise<TaskChecklist> => {
  const response = await axiosInstance.put(`${BASE}/${id}`, data, { withCredentials: true });
  return response.data;
};

export const deleteTmChecklist = async (id: number): Promise<{ message: string }> => {
  const response = await axiosInstance.delete(`${BASE}/${id}`, { withCredentials: true });
  return response.data;
};
