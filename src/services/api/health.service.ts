/**
 * Health API Service
 * Handles communication with Scooli health endpoint
 * 
 * Part of BMAD methodology validation - replaces hardcoded status
 * with real-time service health monitoring
 */

import { translate } from "@/i18n/translate";
import apiClient from "./client";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy" | "error";
  timestamp: string;
  services: {
    database: ServiceStatus;
    jvm: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number;
  memoryUsage?: string;
  details: string;
}

interface HealthResponse {
  success: boolean;
  data: HealthStatus;
  error?: string;
}

/**
 * Fetches current system health status
 */
export const getHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await apiClient.get<HealthStatus>("/health");
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    console.error("Health API Error:", error);
    
    // Return fallback data for graceful degradation
    const checkFailedMessage = translate("errors.health.checkFailed");
    return {
      success: false,
      error: checkFailedMessage,
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
        services: {
          database: { status: "unknown", details: checkFailedMessage },
          jvm: { status: "unknown", details: checkFailedMessage }
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
      return translate("errors.health.status.healthy");
    case "unhealthy":
      return translate("errors.health.status.unhealthy");
    case "degraded":
      return translate("errors.health.status.degraded");
    case "unknown":
      return translate("errors.health.status.unknown");
    case "error":
      return translate("errors.health.status.error");
    default:
      return translate("errors.health.status.unknown");
  }
};

/**
 * Formats service details for display
 */

