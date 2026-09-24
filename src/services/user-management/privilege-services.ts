import axiosInstance from "@/lib/interceptors/axiosInstance";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createPrivilege = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/privilege/createPrivilege`,
      data,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating privilege:", error);
    throw error;
  }
};

export const getAllPrivilege = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/privilege/getAllPrivilege`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const getAllPrivilegeByRole = async (roleId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/privilege/getAllPrivilegeByRole/${roleId}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

export const getAllPrivilegeByUser = async (userId: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_URL}/privilege/getAllPrivilegeByUser/${userId}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error fetching user privileges:", error);
    throw error;
  }
};

// export const getAllPrivilegeByUserWithRoles = async (userId: number): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(`${API_URL}/privilege/getAllPrivilegeByUserWithRoles/${userId}`, {
//       withCredentials: true,
//     });
//     return response;
//   } catch (error) {
//     console.error("Error fetching user privileges with roles:", error);
//     throw error;
//   }
// };