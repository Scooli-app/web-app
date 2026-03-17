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
    const response = await apiClient.get<HealthStatus>("/health");
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    console.error("Health API Error:", error);
    
    // Return fallback data for graceful degradation
    return {
      success: false,
      error: "Falha na verificação de saúde",
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
        services: {
          database: { status: "unknown", details: "Falha na verificação de saúde" },
          jvm: { status: "unknown", details: "Falha na verificação de saúde" }
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
      return "Saudável";
    case "unhealthy":
      return "Instável";
    case "degraded":
      return "Degradado";
    case "unknown":
      return "Desconhecido";
    case "error":
      return "Erro";
    default:
      return "Desconhecido";
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
    parts.push(`Memória: ${service.memoryUsage}`);
  }
  
  return parts.length > 0 ? parts.join(" • ") : "Sem detalhes disponíveis";
};
