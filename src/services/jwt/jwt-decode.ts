import { jwtDecode } from "jwt-decode";

interface MyJwtPayload {
    userId: number;
    username: string;
    email: string;
    companyId: number;
    iat: number;
    exp: number;
  }

export const getUserDataFromToken = (): any | null => {
  const token = localStorage.getItem("access_token");
    if (!token) return null;

  try {
    const decoded = jwtDecode<MyJwtPayload>(token);
    return decoded;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};
