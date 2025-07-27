import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

// API Client Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client-side Supabase client for auth operations
export const createAuthClient = () => createClientComponentClient();

// API Response Handler
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Request/Response Interceptors
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData.code
    );
  }

  return response.json();
};

// Helper to get auth headers for Supabase requests
const getSupabaseHeaders = async () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
  };

  // Add auth token if we're in a browser environment
  if (typeof window !== "undefined") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else {
      // If no session, use the anon key as the Bearer token as well
      headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
    }
  } else {
    // For server-side requests, use the anon key as the Bearer token
    headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
  }

  return headers;
};

// Generic API methods
export const apiClient = {
  async get<T>(
    url: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const searchParams = params
      ? new URLSearchParams(params as Record<string, string>)
      : "";
    const fullUrl = searchParams ? `${url}?${searchParams}` : url;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: await getSupabaseHeaders(),
    });

    return handleApiResponse<T>(response);
  },

  async post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: await getSupabaseHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleApiResponse<T>(response);
  },

  async put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
      method: "PUT",
      headers: await getSupabaseHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleApiResponse<T>(response);
  },

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: await getSupabaseHeaders(),
    });

    return handleApiResponse<T>(response);
  },
};
