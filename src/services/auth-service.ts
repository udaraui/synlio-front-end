"use client";
import axiosInstance from "@/lib/interceptors/axiosInstance";
import axios from "axios";
import { API_URL } from "./API/api";
import Cookies from "js-cookie";
import { decodeJwt, getPrivilegesForCompany } from "@/lib/jwt-utils";


export const safeParse = (data: string | null) => {
  if (!data || data === "undefined") return null;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Error parsing JSON from localStorage:", error);
    return null;
  }
};

export const login = async (credentials: {
  email: string;
  password: string;
}) => {
  const response = await axios.post(API_URL + "/auth/login", credentials, {
    withCredentials: true, // Send cookies across domains
  });
  return response;
};

export const logout = async () => {
  try {
    const response = await axiosInstance.post(API_URL + "/auth/logout", {}, {
      withCredentials: true
    });
    return response;
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Even if API fails, we should still clear local data
    throw error;
  }
};

export const refreshAccessToken = async () => {
  await axios.post(
    API_URL + "/auth/refresh-token",
    {},
    { withCredentials: true }
  );
};

export const getUserCompanyPrivileges = async (userId: number) => {
  const response = await axiosInstance.get(API_URL + "/authorization/get-user-company-privileges", {
    params: { userId },
  });
  return response;
};

export const getUserCompanyIdByUserId = async (userId: number) => {
  const response = await axiosInstance.get(API_URL + "/authorization/getCompanyByUserId/" + userId);
  return response;
};


export const getLocalUser = async () => {
  const raw = localStorage.getItem("user");
  return safeParse(raw);
}

export const getLocalActiveCompany = async () => {
  const raw = localStorage.getItem("active_company");
  return safeParse(raw);
}

export const getLocalCompanies = async () => {
  const raw = localStorage.getItem("companies");
  return safeParse(raw) || [];
}

export const getLocalUserPrivileges = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const token = Cookies.get("accessToken");
    const payload = token ? decodeJwt(token) : null;
    const raw = localStorage.getItem("active_company");
    const company = safeParse(raw);
    const companyId = company?.companyId ?? (company === 0 ? 0 : null);
    return getPrivilegesForCompany(payload, companyId);
  } catch {
    return [];
  }
};

