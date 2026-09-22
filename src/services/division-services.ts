import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS, API_URL } from "./API/api";

export const loadDivisions = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.DIVISION}/search`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching divisions:", error);
    throw error;
  }
};

export const createDivision = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.DIVISION}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating division:", error);
    throw error;
  }
};

export const updateDivision = async (id: number, data: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_ENDPOINTS.DIVISION}/${id}`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  }
  catch (error) {
    console.error("Error updating division:", error);
    throw error;
  }
};
export const getAllDivision = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/division/getAlldivisions`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const getAllDivisionsByCompanyId = async (
  companyId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.DIVISION}/company/${companyId}`,
      { withCredentials: true }
    );
    return response;
  } catch (error) {
    console.error("Error fetching divisions:", error);
    throw error;
  }
};

export const disableDivision = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_ENDPOINTS.DIVISION}/${id}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error deleting division:", error);
    throw error;
  }
};

export const deleteDivision = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `${API_ENDPOINTS.DIVISION}/${id}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error deleting division:", error);
    throw error;
  }
};
