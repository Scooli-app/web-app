/**
 * Health API Service
 * Handles communication with Scooli health endpoint
 * 
 * Part of BMAD methodology validation - replaces hardcoded status
 * with real-time service health monitoring
 */

import { apiClient } from "./client";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy" | "error";
  timestamp: string;
  services: {
    database: ServiceStatus;
    aiServices: ServiceStatus;
    jvm: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number;
  memoryUsage?: string;
  details: string;
}

export interface HealthResponse {
  success: boolean;
  data: HealthStatus;
  error?: string;
}

/**
 * Fetches current system health status
 */
export const getHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await apiClient.get<HealthStatus>("/api/health");
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("Health API Error:", error);
    
    // Return fallback data for graceful degradation
    return {
      success: false,
      error: error.message || "Health check failed",
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
        services: {
          database: { status: "unknown", details: "Health check failed" },
          aiServices: { status: "unknown", details: "Health check failed" },
          jvm: { status: "unknown", details: "Health check failed" }
        }
      }
    };
  }
};

/**
 * Maps service status to Scooli design system color classes (light/dark compatible)
 */
export const getStatusColorClass = (status: string): string => {
  switch (status) {
    case "healthy":
      return "bg-green-500"; // Green stays consistent in both modes
    case "unhealthy":
      return "bg-destructive"; // Uses Scooli destructive color
    case "degraded":
      return "bg-yellow-500"; // Yellow warning color
    case "unknown":
    case "error":
    default:
      return "bg-muted-foreground"; // Uses Scooli muted system color
  }
};

/**
 * Gets human-readable status text
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "unhealthy":
      return "Unhealthy";
    case "degraded":
      return "Degraded";
    case "unknown":
      return "Unknown";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
};

/**
 * Formats service details for display
 */
export const formatServiceDetails = (service: ServiceStatus): string => {
  const parts: string[] = [];
  
  if (service.details) {
    parts.push(service.details);
  }
  
  if (service.responseTime) {
    parts.push(`${service.responseTime}ms`);
  }
  
  if (service.memoryUsage) {
    parts.push(`Memory: ${service.memoryUsage}`);
  }
  
  return parts.length > 0 ? parts.join(" • ") : "No details available";
};