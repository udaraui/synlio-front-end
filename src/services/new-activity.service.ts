import axiosInstance from '@/lib/interceptors/axiosInstance';

export interface NewActivity {
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

export const createNewActivity = async (data: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  durationMinutes?: number;
  taskId?: number;
}): Promise<NewActivity> => {
  const response = await axiosInstance.post('/pulse/new-activity', data, {
    withCredentials: true,
  });
  return response.data;
};

export const getNewActivities = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<NewActivity[]> => {
  const response = await axiosInstance.get('/pulse/new-activity', {
    params,
    withCredentials: true,
  });
  return response.data;
};

export const linkTaskToActivity = async (
  activityId: number,
  data: { taskId: number },
): Promise<NewActivity> => {
  const response = await axiosInstance.patch(
    `/pulse/new-activity/${activityId}/link-task`,
    data,
    { withCredentials: true },
  );
  return response.data;
};

export const unlinkTaskFromActivity = async (activityId: number): Promise<NewActivity> => {
  const response = await axiosInstance.patch(
    `/pulse/new-activity/${activityId}/unlink-task`,
    {},
    { withCredentials: true },
  );
  return response.data;
};

export const deleteNewActivity = async (activityId: number): Promise<void> => {
  await axiosInstance.delete(`/pulse/new-activity/${activityId}`, {
    withCredentials: true,
  });
};
