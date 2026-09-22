import axios from 'axios';
import { CreateServiceRequestParticipantDTO } from './dtos/service_request_participant_create.dto';
import axiosInstance from '@/lib/interceptors/axiosInstance';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const createServiceRequest = async (data:any): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/service-request/createServiceRequest`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };


  export const getServiceRequests = async (data:{searchtext:string}): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/service-request/getServiceRequests`,data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };


  export const getServiceRequestById=async (id:number):Promise<any>=>{
    try {
      const response = await axiosInstance.get(`${API_URL}/service-request/getServiceRequestById/`+ id,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }


  export const updateProperty = async (data:{requestId:number,property:string,value:any}): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/service-request/updateProperty`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  export const createServiceRequestParticipant = async (data:CreateServiceRequestParticipantDTO): Promise<any> => {
    try {
      const response = await axiosInstance.post(`${API_URL}/service-request/createServiceRequestParticipant`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };


  export const removeServiceRequestParticipant = async (data:{requestId:number,email:string}): Promise<any> => {
    try {
 
      const response = await axiosInstance.post(`${API_URL}/service-request/removeServiceRequestParticipant`, data,{
        withCredentials: true,
      });
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };


  
  
  