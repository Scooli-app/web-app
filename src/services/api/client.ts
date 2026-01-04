/**
 * API Client Configuration
 * Base axios instance for Chalkboard backend
 */

import axios, { type AxiosError, type AxiosInstance } from "axios";

export const apiClient: AxiosInstance = axios.create({
  baseURL: "/api/proxy",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  validateStatus: (status) => status < 500,
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Validate response is JSON
    const contentType = response.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      console.error("API returned non-JSON response:", contentType);
      throw new Error(
        "Server returned an invalid response. Please check NEXT_PUBLIC_BASE_API_URL configuration."
      );
    }
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string } | string>) => {
    // Handle common errors
    if (error.response) {
      // Check if response is HTML (error page)
      const contentType = error.response.headers["content-type"];
      if (contentType && contentType.includes("text/html")) {
        const status = error.response.status;
        return Promise.reject(
          new Error(
            `API endpoint returned HTML instead of JSON (Status: ${status}). Please verify NEXT_PUBLIC_BASE_API_URL is correct and the endpoint exists.`
          )
        );
      }

      // Try to extract error message from response
      let message = "An error occurred";
      if (typeof error.response.data === "string") {
        message = error.response.data;
      } else if (
        error.response.data &&
        typeof error.response.data === "object"
      ) {
        message =
          (error.response.data as { message?: string; error?: string })
            ?.message ||
          (error.response.data as { message?: string; error?: string })
            ?.error ||
          error.message ||
          `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else {
        message = `HTTP ${error.response.status}: ${error.response.statusText}`;
      }

      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
