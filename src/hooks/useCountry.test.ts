import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/services/api/user.service", () => ({
  userService: { getCurrentUser: () => getCurrentUser() },
}));

import { hydrateCountryFromProfile, resetCountryStoreForTests } from "./useCountry";

describe("hydrateCountryFromProfile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetCountryStoreForTests();
    getCurrentUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a failed profile load so a Brazilian teacher still ends up on BR", async () => {
    getCurrentUser
      .mockRejectedValueOnce(new Error("401: session not ready"))
      .mockResolvedValueOnce({ countryCode: "BR" });

    await hydrateCountryFromProfile();
    expect(getCurrentUser).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(getCurrentUser).toHaveBeenCalledTimes(2);

    // A further call is a no-op once the profile has loaded.
    await hydrateCountryFromProfile();
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after five failures", async () => {
    getCurrentUser.mockRejectedValue(new Error("down"));

    await hydrateCountryFromProfile();
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000 + 16000 + 60000);

    expect(getCurrentUser).toHaveBeenCalledTimes(6);
  });
});
