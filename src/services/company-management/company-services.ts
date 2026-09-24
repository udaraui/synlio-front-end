import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_ENDPOINTS } from "../api";

const API_URL = API_ENDPOINTS.COMPANY;

export async function load(params: Record<string, any>): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/search`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading companies:", error);
    throw error;
  }
}
export async function loadCompanyById(params: Record<string, any>): Promise<{ total: number; data: any[] }> {
  const url = `${API_URL}/searchById`;

  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading companies:", error);
    throw error;
  }
}

export const getCompanyById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching company:", error);
    throw error;
  }
}

export const createCompany = async (data: {
  company: string;
  company_code: string;
  logo?: File | null;
  users?: number[];
}): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append("company", data.company);
    formData.append("company_code", data.company_code);
    if (data.logo) {
      formData.append("logo", data.logo);
    }
    if (data.users && Array.isArray(data.users)) {
      formData.append("users", JSON.stringify(data.users));
    }

    const response = await axiosInstance.post(
      `${API_URL}`, // make sure this matches the backend route
      formData,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error creating company:", error);
    throw error;
  }
};

export const updateCompany = async (data: {
  id: number;
  company: string;
  company_code: string;
  logo?: File | null;
}): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append("company", data.company);
    formData.append("company_code", data.company_code);
    if (data.logo) {
      formData.append("logo", data.logo);
    }

    const response = await axiosInstance.put(
      `${API_URL}/` + data.id,
      formData,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error creating company:", error);
    throw error;
  }
};

export const getAllCompany = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}`,
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

export const deleteCompany = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_URL}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting company:", error);
    throw error;
  }
};

export const getCompanyNotificationEmailConfig = async (
  id: number,
): Promise<{ notificationEmail: string; emailProvider: string; notificationEmailPassword: string }> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/${id}/notification-email`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching company notification email config:", error);
    throw error;
  }
};

export const updateCompanyNotificationEmail = async (data: {
  id: number;
  notificationEmail: string;
  emailProvider: string;
  notificationEmailPassword: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/${data.id}/notification-email`,
      {
        notificationEmail: data.notificationEmail,
        emailProvider: data.emailProvider,
        notificationEmailPassword: data.notificationEmailPassword,
      },
      {
        withCredentials: true,
      },
    );
    return response;
  } catch (error) {
    console.error("Error updating company notification email:", error);
    throw error;
  }
};

export const updateCompanyMeetingProviders = async (data: {
  id: number;
  allowedMeetingProviders: string[];
}): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/${data.id}/meeting-providers`,
      {
        allowedMeetingProviders: data.allowedMeetingProviders,
      },
      {
        withCredentials: true,
      },
    );
    return response;
  } catch (error) {
    console.error("Error updating company meeting providers:", error);
    throw error;
  }
};

export const getCompanyMeetingProviders = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/${id}/meeting-providers`,
      {
        withCredentials: true,
      },
    );
    return response;
  } catch (error) {
    console.error("Error fetching company meeting providers:", error);
    throw error;
  }
};

export const updateCompanyWeekEndDay = async (data: {
  id: number;
  weekEndDay: number;
}): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/${data.id}/weekend-day`,
      { weekEndDay: data.weekEndDay },
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error updating week end day:", error);
    throw error;
  }
};

