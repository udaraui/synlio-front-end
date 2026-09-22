
import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const findProjectTaskStatusforDivision=async (divisionid:number)=>{
    try {
      const response=await axiosInstance.post(`${API_URL}/project-task-status/findProjectTaskStatusforDivision`,{divisionid} )
      return response
    } catch (error) {
      throw error
    }
  }
  


  export const deleteTask=async (taskid:number)=>{
    try {
      const response=await axiosInstance.delete(`${API_URL}/project-proposal/deleteTask/` + taskid )
      return response
    } catch (error) {
      throw error
    }
  }