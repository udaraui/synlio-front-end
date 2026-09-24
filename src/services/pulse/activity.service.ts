import axiosInstance from '@/lib/interceptors/axiosInstance';

export interface Activity {
  id: number;
  postType: 'Activity';
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  durationMinutes: number | null;
  taskId: number | null;
  linkedTaskCode: string | null;
  linkedTaskName: string | null;
  createdAt: string;
}

export const createActivity = async (data: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  durationMinutes?: number;
  taskId?: number;
}): Promise<Activity> => {
  const response = await axiosInstance.post('/pulse/activity', data, {
    withCredentials: true,
  });
  return response.data;
};

export const getActivities = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<Activity[]> => {
  const response = await axiosInstance.get('/pulse/activity', {
    params,
    withCredentials: true,
  });
  return response.data;
};

export const linkTaskToActivity = async (
  activityId: number,
  data: { taskId: number },
): Promise<Activity> => {
  const response = await axiosInstance.patch(
    `/pulse/activity/${activityId}/link-task`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

export const unlinkTaskFromActivity = async (activityId: number): Promise<Activity> => {
  const response = await axiosInstance.patch(
    `/pulse/activity/${activityId}/unlink-task`,
    {},
    { withCredentials: true },
  );
  return response.data;
};

export const deleteActivity = async (activityId: number): Promise<void> => {
  await axiosInstance.delete(`/pulse/activity/${activityId}`, {
    withCredentials: true,
  });
};
