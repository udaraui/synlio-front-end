import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../API/api";

export const patchTicketAttachment = async (
  file: File,
  ticketId: number,
): Promise<{ id: number; link: string; ticketId: number }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.TICKET_ATTACHMENT}/upload/${ticketId}`,
      formData,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error patching attachment:', error);
    throw error;
  }
};

export const uploadTicketAttachment = async (file: File): Promise<{ url: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.TICKET_ATTACHMENT}/upload-attachment`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    throw error;
  }
};

export const createTicketAttachment = async (data: {
  ticketId: number;
  link: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.TICKET_ATTACHMENT,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating ticket attachment:", error);
    throw error;
  }
};

export const getTicketAttachments = async (ticketId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.TICKET_ATTACHMENT}/ticket/${ticketId}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket attachments:", error);
    throw error;
  }
};

export const deleteTicketAttachment = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.TICKET_ATTACHMENT}/${id}`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting ticket attachment:", error);
    throw error;
  }
};

