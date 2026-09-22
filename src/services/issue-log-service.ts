import axios from 'axios';
import { CreateIssueLogDTO } from './dtos/issue_log_create.dto';
import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createIssueLog = async (data:CreateIssueLogDTO): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/issue-log/createIssueLog`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };


  export const getIssueLogByIssueTypeAndId = async (data:{issue_type:string,issue_id:number}): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/issue-log/getIssueLogByIssueTypeAndId`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };


  

 