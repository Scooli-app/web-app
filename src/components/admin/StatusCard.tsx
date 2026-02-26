"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { 
  getHealth, 
  getStatusColorClass, 
  getStatusText, 
  formatServiceDetails,
  type HealthStatus 
} from "@/services/api/health.service";

/**
 * Real-time System Health Status Card
 * 
 * Replaces hardcoded admin status with live service monitoring
 * Part of BMAD methodology validation - demonstrates AI agent development
 * 
 * Features:
 * - Auto-refresh every 30 seconds
 * - Visual status indicators with Tailwind classes
 * - Detailed service breakdown
 * - Error handling and loading states
 * - Next.js 13+ compatible with TypeScript
 */
export default function StatusCard() {
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch health data
  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      const result = await getHealth();
      
      if (result.success) {
        setHealthData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || "Unknown error");
        // Still show partial data if available
        if (result.data) {
          setHealthData(result.data);
        }
      }
    } catch (err: any) {
      setError("Failed to fetch health status");
      console.error("Health fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    fetchHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Manual refresh handler
  const handleRefresh = () => {
    setLoading(true);
    fetchHealth();
  };

  if (loading && !healthData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
        <p className="text-gray-600">Loading health status...</p>
      </div>
    );
  }

  const serviceName = (key: string): string => {
    switch (key) {
      case "aiServices":
        return "AI Services";
      case "database":
        return "Database";
      case "jvm":
        return "JVM";
      default:
        return key;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <span className="text-red-600 text-sm">⚠️ {error}</span>
          </div>
        </div>
      )}

      {healthData && (
        <>
          {/* Overall Status */}
          <div className="mb-6 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${getStatusColorClass(healthData.status)}`}></div>
              <span className="font-medium text-gray-900">
                System: {getStatusText(healthData.status)}
              </span>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-3 mb-4">
            {Object.entries(healthData.services || {}).map(([key, service]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColorClass(service.status)}`}></div>
                  <span className="font-medium text-gray-700 capitalize">
                    {serviceName(key)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {getStatusText(service.status)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatServiceDetails(service)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timestamp */}
          {healthData.timestamp && (
            <div className="text-center py-2 px-3 bg-gray-50 rounded text-xs text-gray-500">
              Health check: {new Date(healthData.timestamp).toLocaleString()}
            </div>
          )}
        </>
      )}

      {/* BMAD Validation Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-center">
        <span className="text-xs font-medium text-green-600">
          ✅ Real-time monitoring (BMAD validated)
        </span>
      </div>
    </div>
  );
}