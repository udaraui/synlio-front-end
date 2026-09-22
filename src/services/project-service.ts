import axiosInstance from "@/lib/interceptors/axiosInstance";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createProposal = async (data: any): Promise<any> => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/project-proposal/createProposal`,
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

export const findAllProposals = async () => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/project-proposal/findAllProposals`
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const findProposalDetails = async (id: number) => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/project-proposal/findProposalDetails/` + id
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const findAllApprovalRequests = async () => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/project-proposal/findAllApprovalRequests`
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const findAllProjects = async () => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/project-proposal/findAllProjects`
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const findAllProjectsTasks = async () => {
  try {
    const response = await axiosInstance.get(
      `${API_URL}/project-proposal/findAllProjectsTasks`
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const createProjectTask = async (data: any) => {
  try {
    const response = await axiosInstance.post(
      `${API_URL}/project-proposal/createProjectTask`,
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

export const updateTaskOrder = async (data: {
  project_id: number;
  items: any[];
}) => {
  try {
    const response = await axiosInstance.patch(
      `${API_URL}/project-proposal/updateTaskOrder`,
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

export const updateTaskProperty = async (data: {
  task_id: string;
  property: string;
  value: any;
}) => {
  try {
    const response = await axiosInstance.put(
      `${API_URL}/project-proposal/updateTaskProperty`,
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

export const changeStatus = async (data: {
  proposal_id: number;
  status: number;
  comment?: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.put(
      `${API_URL}/project-proposal/changeStatus`,
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
