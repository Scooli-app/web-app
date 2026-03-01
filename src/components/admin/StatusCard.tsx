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
    } catch (err: unknown) {
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
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium uppercase tracking-wider">System Health</span>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-24 mb-2"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
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
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
      {/* Header - matching other admin cards */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className={`w-4 h-4 rounded-full ${healthData ? getStatusColorClass(healthData.status) : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium uppercase tracking-wider">System Health</span>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          ⚠️ {error}
        </div>
      )}

      {healthData ? (
        <>
          {/* Main Status Display */}
          <p className="text-3xl font-bold mb-1">{getStatusText(healthData.status)}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {Object.keys(healthData.services || {}).length} services monitored
          </p>

          {/* Service Details - Compact for card format */}
          <div className="space-y-2">
            {Object.entries(healthData.services || {}).slice(0, 3).map(([key, service]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColorClass(service.status)}`} />
                  <span className="font-medium capitalize">
                    {serviceName(key)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {service.responseTime ? `${service.responseTime}ms` : service.memoryUsage || 'OK'}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : loading ? (
        <>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-20 mb-2"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
        </>
      ) : (
        <>
          <p className="text-3xl font-bold text-destructive">Error</p>
          <p className="text-xs text-muted-foreground">Health check failed</p>
        </>
      )}
    </div>
  );
}