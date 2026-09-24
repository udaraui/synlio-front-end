import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";

export interface NoteDto {
  content?: string;
  color?: string;
}

export interface NoteItem {
  id: number;
  content: string;
  color?: string;
  ownerId: number;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerProfilePicture?: string;
}

export interface SharedUser {
  userId: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

export const getMyNotes = async (): Promise<NoteItem[]> => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.NOTES}/my`, {
    withCredentials: true,
  });
  return response.data as NoteItem[];
};

export const getSharedWithMe = async (): Promise<NoteItem[]> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.NOTES}/shared-with-me`,
    { withCredentials: true }
  );
  return response.data as NoteItem[];
};

export const createNote = async (dto: NoteDto): Promise<NoteItem> => {
  const response = await axiosInstance.post(API_ENDPOINTS.NOTES, dto, {
    withCredentials: true,
  });
  return response.data as NoteItem;
};

export const updateNote = async (
  id: number,
  dto: Partial<NoteDto>
): Promise<NoteItem> => {
  const response = await axiosInstance.patch(
    `${API_ENDPOINTS.NOTES}/${id}`,
    dto,
    { withCredentials: true }
  );
  return response.data as NoteItem;
};

export const deleteNote = async (id: number): Promise<void> => {
  await axiosInstance.delete(`${API_ENDPOINTS.NOTES}/${id}`, {
    withCredentials: true,
  });
};

export const shareNote = async (
  id: number,
  userIds: number[]
): Promise<{ sharedWith: SharedUser[] }> => {
  const response = await axiosInstance.post(
    `${API_ENDPOINTS.NOTES}/${id}/share`,
    { userIds },
    { withCredentials: true }
  );
  return response.data as { sharedWith: SharedUser[] };
};

export const getNoteShareList = async (
  id: number
): Promise<{ sharedWith: SharedUser[] }> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.NOTES}/${id}/share`,
    { withCredentials: true }
  );
  return response.data as { sharedWith: SharedUser[] };
};


