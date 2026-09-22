import axiosInstance from "@/lib/interceptors/axiosInstance";


import { API_ENDPOINTS } from "./API/api";
import { User } from "@/interfaces/user";
import { post } from "./API/http";
 
 
export async function load(params: Record<string, any>): Promise<{ total: number; data: any[] }> {
  const url = `${API_ENDPOINTS.USER}/search`;
 
  try {
    const response = await axiosInstance.post(url, params, {
      responseType: "json",
    });
    return response.data;
  } catch (error) {
    console.error("Error loading users:", error);
    throw error;
  }
}

export const getLoginUser = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.USER}/me`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.USER}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

export const searchUserByEmail = async (email: string): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.USER}/search-by-email/${email}`,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error searching user by email:", error);
    throw error;
  }
};


 

export const createUser = async (data: any): Promise<any> => {
  try {
    const formData = new FormData();
    
    // Append all fields to FormData
    Object.keys(data).forEach(key => {
      if (key === 'profile_picture' && data[key] instanceof File) {
        formData.append(key, data[key]);
      } else if (key === 'companyIds' || key === 'divisionIds' || key === 'userCompanyRoles') {
        formData.append(key, JSON.stringify(data[key]));
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    });

    const response = await axiosInstance.post(
        `${API_ENDPOINTS.USER}`,
      formData,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (data: any): Promise<any> => {
  try {
    const formData = new FormData();
    
    // Append all fields to FormData
    Object.keys(data).forEach(key => {
      if (key === 'profile_picture' && data[key] instanceof File) {
        formData.append(key, data[key]);
      } else if (key === 'companyIds' || key === 'divisionIds' || key === 'userCompanyRoles') {
        formData.append(key, JSON.stringify(data[key]));
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key]);
      }
    }); 
    const response = await axiosInstance.put(`${API_ENDPOINTS.USER}/${data.id}`, formData, {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const disableUser = async (id: number): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_ENDPOINTS.USER}/${id}`, {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error disable user:", error);
    throw error;
  }
};

export const checkDeleteUser = async (id: number, companyId?: number): Promise<any> => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.USER}/${id}/delete-check`, {
      params: companyId ? { companyId } : undefined,
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error checking user deletion:", error);
    throw error;
  }
};

export const deleteUser = async (
  id: number,
  deleteLinkedResources = false,
  deleteResource = false,
  companyId?: number
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`${API_ENDPOINTS.USER}/${id}`, {
      data: {
        deleteLinkedResources,
        deleteResource,
        companyId,
      },
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const passwordReset = async (id: number, data:any): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`${API_ENDPOINTS.USER}/password-reset/${id}`, data , {
      withCredentials: true,
    });
    return response;
  } catch (error) {
    console.error("Error disable user:", error);
    throw error;
  }
};


export const findAllUsers = async (): Promise<any> => {
  // try {
  //   const response = await axiosInstance.get(`${API_URL}/user/findAllUsers`, {
  //     withCredentials: true,
  //   });
  //   return response;
  // } catch (error) {
  //   console.error("Error getting user:", error);
  //   throw error;
  // }
};

// export const findAllUsersByCompany= async (): Promise<any> => {
//   try {

//     const response = await axiosInstance.get(`${API_URL}/user/company`, {
//       withCredentials: true,
//     });
//     console.log("response", response)
//     return response;
//   } catch (error) {
//     console.error("Error getting user:", error);
//     throw error;
//   }
// };

export const findAllUsersByCompanyAndDivision = async (
  companyId: number,
  divisionId: number
): Promise<any> => {
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.USER}/company/` + companyId + "/division/" + divisionId,
      {
        withCredentials: true,
      }
    );
    return response;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

/** Fetch all active users in the current company for attendee selection.
 *  Uses the same POST /user/search approach as the User Management page,
 *  pulling the active company from localStorage. */
export const getCompanyUsers = async (): Promise<any[]> => {
  try {
    const selectedCompany = (() => {
      try { return JSON.parse(localStorage.getItem("active_company") || "null"); } catch { return null; }
    })();
    const companyId = selectedCompany?.companyId;

    const params: Record<string, any> = {
      first: 0,
      rows: 500,
      filters: [
        { field: "isActive", value: true, matchMode: "equals" },
        ...(companyId ? [{ field: "companyId", value: companyId, matchMode: "equals" }] : []),
      ],
      multiSorts: [{ field: "first_name", order: "1" }],
    };

    const response = await axiosInstance.post(`${API_ENDPOINTS.USER}/search`, params, {
      withCredentials: true,
    });
    return response.data?.data ?? [];
  } catch (error) {
    console.error("Error fetching company users:", error);
    throw error;
  }
};

// export const getUserDivisionsByCompany = async (
//   companyId: number
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/user/divisions/company/${companyId}`,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error getting user divisions by company:", error);
//     throw error;
//   }
// };

// export const getAllUserDivisions = async (): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/user/divisions`,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error getting all user divisions:", error);
//     throw error;
//   }
// };

// export const getSpecificUserDivisionsByCompany = async (
//   userId: number,
//   companyId: number
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/user/${userId}/divisions/company/${companyId}`,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error getting specific user divisions by company:", error);
//     throw error;
//   }
// };

// export const getSpecificUserDivisions = async (
//   userId: number
// ): Promise<any> => {
//   try {
//     const response = await axiosInstance.get(
//       `${API_URL}/user/${userId}/divisions`,
//       {
//         withCredentials: true,
//       }
//     );
//     return response;
//   } catch (error) {
//     console.error("Error getting specific user divisions:", error);
//     throw error;
//   }
// };
