import { describe, expect, it } from "vitest";
import { addDaysIso, localIsoDate, slotStatusKey } from "./week";

describe("slotStatusKey", () => {
  it("a past lesson with nothing prepared is not \"Por preparar\" (audit 2026-10-24)", () => {
    const yesterday = addDaysIso(localIsoDate(), -1);
    const tomorrow = addDaysIso(localIsoDate(), 1);
    expect(slotStatusKey("pending", yesterday)).toBe("pendingPast");
    expect(slotStatusKey("pending", tomorrow)).toBe("pending");
    expect(slotStatusKey("completed", yesterday)).toBe("completed");
  });
});
