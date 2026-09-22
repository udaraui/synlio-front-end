import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createNewNote = async (data:FormData): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/notes/createNote`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  };


  export const getNotesByIssueIdandType=async (data:{issue_id:number, issue_type:string})=>{
    try {
      const response = await axiosInstance.post(`${API_URL}/notes/getNotesByIssueIdAndType`,data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }


  export const downloadAttachment = async (data: { original_name: string; file_name: string }) => {
    try {
      const response = await axiosInstance.post(`${API_URL}/attachment/getfile`, data, {
        withCredentials: true,
        responseType: "blob", // Ensure response is treated as a binary blob
      });
  
      return response;
    } catch (error) {
      console.error("Error downloading attachment:", error);
      throw error;
    }
  };

  export const getAllCurrencies = async (): Promise<any> => {
    try {
      const response = await axiosInstance.get(`${API_URL}/currency`, {
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw error;
    }
  };

