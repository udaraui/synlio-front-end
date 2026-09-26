import { API_URL } from "@/services/api";
import { safeParse } from "@/services/auth/auth-service";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 50000, // 50 seconds timeout for all requests
});

// A private variable inside this module to hold the token
let authToken: string | null = null;
// A private variable to hold the function that updates the token in React state
let tokenUpdater: ((token: string | null) => void) | null = null;

// --- State for Refresh Logic ---
let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * This is our "bridge" function.
 * The AuthProvider will call this function to pass the token to this module.
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

/**
 * This is the other side of the bridge.
 * The AuthProvider will pass its `login` or `logout` function here, so the interceptor
 * can update the React state if the token is refreshed or fails to refresh.
 */
export const setTokenUpdater = (updater: (token: string | null) => void) => {
  tokenUpdater = updater;
};

// 1. REQUEST Interceptor: Injects the token into every outgoing request
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const activeCompany =
      typeof window !== "undefined"
        ? safeParse(localStorage.getItem("active_company"))
        : null;

    const companyId =
      activeCompany?.companyId != null
        ? String(activeCompany.companyId)
        : activeCompany === 0
          ? "0"
          : null;

    config.headers["x-selected-company"] = companyId;
    // console.log("authToken.........................", authToken);
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. RESPONSE Interceptor: Handles token expiration, refresh, and request queuing
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 403 Forbidden - user attempted action without permission
    if (error.response?.status === 403) {
      console.error(
        "Access forbidden. User does not have permission for this action.",
      );

      // toast.error("Access denied. You don't have permission for this action");
      // if (tokenUpdater) {
      //   tokenUpdater(null); // Trigger logout
      // }

      // Only show toast if not a refresh request (which is handled by the catch block)
      if (!originalRequest?.url?.includes("/auth/refresh")) {
        let parsedPath = originalRequest?.url || '';
        try {
          if (parsedPath.startsWith('http')) {
            parsedPath = new URL(parsedPath).pathname;
          }
        } catch (e) {
          // ignore parsing errors
        }

        const segments = parsedPath.split('/').filter(s => s && s !== 'api' && s !== 'v1');
        const entity = segments.length > 0 ? segments[0].replace(/-/g, ' ') : 'resource';

        toast.error(`Access denied, You don't have permission: ${entity}`);
      }

      return Promise.reject(error);
    }

    // Don't retry if this is the refresh endpoint itself or if already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("Access token expired. Refreshing");

        const { data } = await axiosInstance.post("/auth/refresh");
        const newAccessToken = data.access_token;
        // Update the token globally
        setAuthToken(newAccessToken);
        if (tokenUpdater) {
          tokenUpdater(newAccessToken);
        }

        // Update the header of the original request
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        // Process the queue with the new token
        processQueue(null, newAccessToken);
        // console.log("processQueue.........................", processQueue);
        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError: any) {
        // Use 'any' to access response properties
        console.error(
          "Failed to refresh token. The API call threw an error:",
          refreshError,
        );

        // Log specific details if available
        if (refreshError.response) {
          console.error("Response data:", refreshError.response.data);
          console.error("Response status:", refreshError.response.status);
        }

        // On refresh failure, logout the user...
        toast.error("Your session has expired, Please login again");
        if (tokenUpdater) {
          tokenUpdater(null); // Trigger logout
        }
        processQueue(refreshError as AxiosError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If it's a 401 on the refresh endpoint itself, logout immediately
    if (
      error.response?.status === 401 &&
      originalRequest?.url?.includes("/auth/refresh")
    ) {
      console.error("Refresh token is invalid or expired. Logging out");
      toast.error("Your session has expired, Please login again");
      if (tokenUpdater) {
        tokenUpdater(null); // Trigger logout
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;