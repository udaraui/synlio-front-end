import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "./API/api";

export const downloadUserTemplate = async (): Promise<Blob> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.EXPORT_EXCEL}/template/user`,
      {
        withCredentials: true,
        responseType: "blob",
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error downloading user template:", error);
    throw error;
  }
};

export const downloadResourceTemplate = async (): Promise<Blob> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.EXPORT_EXCEL}/template/resource`,
    { responseType: "blob", withCredentials: true },
  );
  return response.data;
};

export const downloadTicketTemplate = async (): Promise<Blob> => {
  const response = await axiosInstance.get(
    `${API_ENDPOINTS.EXPORT_EXCEL}/template/ticket`,
    { responseType: "blob", withCredentials: true },
  );
  return response.data;
};
