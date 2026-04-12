/**
 * API Client Configuration
 * Base axios instance for Chalkboard backend
 */

import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import type { UnknownAction } from "@reduxjs/toolkit";
import axios, { type AxiosError, type AxiosInstance } from "axios";

let storeDispatch: ((action: UnknownAction) => void) | null = null;

export const injectStore = (dispatch: (action: UnknownAction) => void) => {
  storeDispatch = dispatch;
};

type GetTokenFn = () => Promise<string | null>;

let getTokenFn: GetTokenFn | null = null;

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
  validateStatus: (status) => status < 400,
});

/**
 * Set the token getter function for all API requests
 * This allows fetching a fresh token for each request
 */
export function setApiTokenGetter(getter: GetTokenFn | null): void {
  getTokenFn = getter;
}

// Request interceptor to add auth token (fetches fresh token for each request)
apiClient.interceptors.request.use(
  async (config) => {
    if (getTokenFn) {
      const token = await getTokenFn();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Retry interceptor: on 401, wait briefly for Clerk to finish loading,
// then retry once with a fresh token. This handles the race condition
// during page refresh / hot-reload where the first request fires before
// the auth session is fully restored.
apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const originalRequest = error.config as typeof error.config & {
    _retried?: boolean;
  };

  if (
    error.response?.status === 401 &&
    originalRequest &&
    !originalRequest._retried &&
    getTokenFn
  ) {
    originalRequest._retried = true;

    // Wait a short moment for Clerk to finish restoring the session
    await new Promise((resolve) => setTimeout(resolve, 500));

    const token = await getTokenFn();
    if (token) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    }
  }
  return Promise.reject(error);
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Validate response is JSON
    const contentType = response.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      console.error("A API devolveu resposta não JSON:", contentType);
      throw new Error(
        "O servidor devolveu uma resposta inválida. Verifique a configuração de NEXT_PUBLIC_BASE_API_URL."
      );
    }
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string } | string>) => {
    // Trata 402 para abrir o modal de upgrade quando o limite de gerações é atingido
    if (error.response?.status === 402) {
      if (storeDispatch) {
        storeDispatch(setUpgradeModalOpen(true));
      }
    }

    // Handle common errors
    if (error.response) {
      // Check if response is HTML (error page)
      const contentType = error.response.headers["content-type"];
      if (contentType && contentType.includes("text/html")) {
        const status = error.response.status;
        return Promise.reject(
          new Error(
            `O endpoint da API devolveu HTML em vez de JSON (Estado: ${status}). Verifique se NEXT_PUBLIC_BASE_API_URL está correto e se o endpoint existe.`
          )
        );
      }

      // Try to extract error message from response
      let message = "Ocorreu um erro";
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
          `Erro HTTP ${error.response.status}`;
      } else {
        message = `Erro HTTP ${error.response.status}`;
      }

      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(
        new Error("Erro de rede. Verifique a sua ligação.")
      );
    }
    return Promise.reject(error);
  }
);

export default apiClient;
