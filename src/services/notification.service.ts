import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "./API/api";

export interface NotificationItem {
  id: number;
  title: string;
  description: string;
  isRead: boolean;
  isSent: boolean;
  referenceId?: number;
  referenceType?: string;
  referenceSpaceId?: number;
  userId: number;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
}

/** Fetch paginated notifications for the currently logged-in user */
export const getMyNotifications = async (
  limit = 5,
  offset = 0,
): Promise<PaginatedNotifications> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.NOTIFICATION}/user`,
    { params: { limit, offset }, withCredentials: true },
  );
  return response.data as PaginatedNotifications;
};

/** Lightweight badge poll — fetches only the unread count */
export const getUnreadCount = async (): Promise<number> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.NOTIFICATION}/unread-count`,
    { withCredentials: true },
  );
  return (response.data as { unreadCount: number }).unreadCount;
};

/** Mark a single notification as read */
export const markNotificationAsRead = async (
  id: number,
): Promise<NotificationItem> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.NOTIFICATION}/${id}/mark-read`,
    {},
    { withCredentials: true },
  );
  return response.data as NotificationItem;
};

/** Mark ALL notifications as read for the current user */
export const markAllNotificationsAsRead = async (): Promise<{
  updated: number;
}> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.NOTIFICATION}/mark-all-read`,
    {},
    { withCredentials: true },
  );
  return response.data as { updated: number };
};
