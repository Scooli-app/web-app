import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StatusCard from "../StatusCard";
import * as healthService from "@/services/api/health.service";

// Mock the health service
jest.mock("@/services/api/health.service");

const mockHealthService = healthService as jest.Mocked<typeof healthService>;

/**
 * Tests for StatusCard component
 * Part of BMAD methodology validation - ensures UI works correctly with TypeScript + Tailwind
 */
describe("StatusCard", () => {
  const mockHealthData: healthService.HealthStatus = {
    status: "healthy",
    timestamp: "2026-02-26T14:30:00Z",
    services: {
      database: {
        status: "healthy",
        responseTime: 45,
        details: "PostgreSQL connected"
      },
      aiServices: {
        status: "healthy", 
        responseTime: 120,
        details: "Curriculum API responding"
      },
      jvm: {
        status: "healthy",
        memoryUsage: "45%",
        details: "JVM healthy"
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state initially", () => {
    mockHealthService.getHealth.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<StatusCard />);
    
    expect(screen.getByText("Loading health status...")).toBeInTheDocument();
    expect(screen.getByText("System Status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh status/i })).toBeInTheDocument();
  });

  test("renders health data successfully", async () => {
    mockHealthService.getHealth.mockResolvedValue({
      success: true,
      data: mockHealthData
    });

    render(<StatusCard />);

    await waitFor(() => {
      expect(screen.getByText("System: Healthy")).toBeInTheDocument();
    });

    // Check service statuses are displayed
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("AI Services")).toBeInTheDocument();
    expect(screen.getByText("JVM")).toBeInTheDocument();

    // Check details are shown
    expect(screen.getByText(/PostgreSQL connected/)).toBeInTheDocument();
    expect(screen.getByText(/Curriculum API responding/)).toBeInTheDocument();
    expect(screen.getByText(/Memory: 45%/)).toBeInTheDocument();
  });

  test("handles error state correctly", async () => {
    mockHealthService.getHealth.mockResolvedValue({
      success: false,
      error: "Network error",
      data: {
        status: "error",
        timestamp: "2026-02-26T14:30:00Z",
        services: {
          database: { status: "unknown", details: "Health check failed" },
          aiServices: { status: "unknown", details: "Health check failed" },
          jvm: { status: "unknown", details: "Health check failed" }
        }
      }
    });

    render(<StatusCard />);

    await waitFor(() => {
      expect(screen.getByText("⚠️ Network error")).toBeInTheDocument();
    });

    // Should still show partial data
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("AI Services")).toBeInTheDocument();
    expect(screen.getByText("JVM")).toBeInTheDocument();
  });

  test("refresh button works correctly", async () => {
    mockHealthService.getHealth.mockResolvedValue({
      success: true,
      data: mockHealthData
    });

    render(<StatusCard />);

    await waitFor(() => {
      expect(screen.getByText("System: Healthy")).toBeInTheDocument();
    });

    // Click refresh button
    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    fireEvent.click(refreshBtn);

    // Should call getHealth again
    expect(mockHealthService.getHealth).toHaveBeenCalledTimes(2);
  });

  test("displays BMAD validation footer", async () => {
    mockHealthService.getHealth.mockResolvedValue({
      success: true,
      data: mockHealthData
    });

    render(<StatusCard />);

    await waitFor(() => {
      expect(screen.getByText("✅ Real-time monitoring (BMAD validated)")).toBeInTheDocument();
    });
  });

  test("shows unhealthy services correctly", async () => {
    const unhealthyData: healthService.HealthStatus = {
      ...mockHealthData,
      status: "unhealthy",
      services: {
        ...mockHealthData.services,
        database: {
          status: "unhealthy",
          details: "Connection failed"
        }
      }
    };

    mockHealthService.getHealth.mockResolvedValue({
      success: true,
      data: unhealthyData
    });

    render(<StatusCard />);

    await waitFor(() => {
      expect(screen.getByText("System: Unhealthy")).toBeInTheDocument();
    });

    expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
  });

  test("applies correct Tailwind classes for status colors", async () => {
    mockHealthService.getHealth.mockResolvedValue({
      success: true,
      data: mockHealthData
    });

    render(<StatusCard />);

    await waitFor(() => {
      // Check that healthy status gets green color class
      const healthyIndicators = document.querySelectorAll(".bg-green-500");
      expect(healthyIndicators.length).toBeGreaterThan(0);
    });
  });
});