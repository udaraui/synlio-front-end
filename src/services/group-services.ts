import axiosInstance from "@/lib/interceptors/axiosInstance";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createGroup = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/group/createGroup`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const getAllGroups = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/group/getAllGroups`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};
