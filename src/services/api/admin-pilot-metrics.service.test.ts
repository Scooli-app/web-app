import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./client", () => ({ default: http }));

import { adminPilotMetricsService } from "./admin-pilot-metrics.service";

beforeEach(() => {
  http.get.mockReset();
});

describe("adminPilotMetricsService.getPilotMetrics", () => {
  it("loads the report for the given range", async () => {
    const report = { weeks: ["2026-W41"], rows: [], totals: {} };
    http.get.mockResolvedValue({ data: report });

    await expect(
      adminPilotMetricsService.getPilotMetrics({ from: "2026-09-14", to: "2026-10-25" }),
    ).resolves.toEqual(report);
    expect(http.get).toHaveBeenCalledWith("/admin/pilot-metrics?from=2026-09-14&to=2026-10-25");
  });
});
