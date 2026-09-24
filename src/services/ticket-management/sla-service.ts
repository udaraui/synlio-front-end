import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

  export const findAllSLAs=async ():Promise<any>=>{
    try {
      const response = await axiosInstance.get(`${API_URL}/sla/findAllSLAs`,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error reading SLAs:', error);
      throw error;
    }
  }
  



  
  
  