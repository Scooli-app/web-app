import { beforeEach, describe, expect, it, vi } from "vitest";

const saveDraft = vi.fn();
const saveDraftKeepalive = vi.fn();
vi.mock("@/services/api/onboarding-v2.service", () => ({
  onboardingV2Service: {
    saveDraft: (...args: unknown[]) => saveDraft(...args),
    saveDraftKeepalive: (...args: unknown[]) => saveDraftKeepalive(...args),
  },
}));

import {
  finalizeDrafts,
  flushDraft,
  flushDraftKeepalive,
  isDraftLocked,
  queueDraft,
  refreshDraftToken,
  resetDraft,
  unlockDrafts,
} from "@/components/onboarding-v2/onboardingDraft";

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  vi.clearAllMocks();
  saveDraft.mockResolvedValue(undefined);
  saveDraftKeepalive.mockResolvedValue(undefined);
  resetDraft(async () => "tok", null, null);
  refreshDraftToken();
  await flushMicrotasks();
});

describe("finalizeDrafts (F2, F3)", () => {
  it("flushes the pending draft instead of dropping it (F2)", async () => {
    queueDraft({ step: 5, goals: [] });
    await finalizeDrafts();
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ goals: [] }));
  });

  it("waits for an in-flight keepalive request before resolving (F3)", async () => {
    let releaseKeepalive: () => void = () => undefined;
    saveDraftKeepalive.mockReturnValue(new Promise<void>((r) => (releaseKeepalive = r)));
    queueDraft({ step: 5, planningDay: 3 });
    flushDraftKeepalive();
    expect(saveDraftKeepalive).toHaveBeenCalledTimes(1);

    let finalized = false;
    const done = finalizeDrafts().then(() => (finalized = true));
    await flushMicrotasks();
    expect(finalized).toBe(false);
    releaseKeepalive();
    await done;
    expect(finalized).toBe(true);
  });

  it("waits for an in-flight regular draft request", async () => {
    let release: () => void = () => undefined;
    saveDraft.mockReturnValueOnce(new Promise<void>((r) => (release = r)));
    queueDraft({ step: 5, planningDay: 2 }, { immediate: true });
    let finalized = false;
    const done = finalizeDrafts().then(() => (finalized = true));
    await flushMicrotasks();
    expect(finalized).toBe(false);
    release();
    await done;
  });

  it("blocks every later draft, including pagehide flushes", async () => {
    await finalizeDrafts();
    expect(isDraftLocked()).toBe(true);
    queueDraft({ step: 5, planningDay: 4 }, { immediate: true });
    queueDraft({ step: 5, planningDay: 5 });
    flushDraftKeepalive();
    await flushDraft();
    expect(saveDraft).not.toHaveBeenCalled();
    expect(saveDraftKeepalive).not.toHaveBeenCalled();
  });

  it("blocks a pagehide flush that fires while finalizing", async () => {
    let release: () => void = () => undefined;
    saveDraft.mockReturnValueOnce(new Promise<void>((r) => (release = r)));
    queueDraft({ step: 5, planningDay: 2 });
    const done = finalizeDrafts();
    queueDraft({ step: 5, planningDay: 6 });
    flushDraftKeepalive();
    release();
    await done;
    expect(saveDraftKeepalive).not.toHaveBeenCalled();
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it("can be unlocked after a failed complete", async () => {
    await finalizeDrafts();
    unlockDrafts();
    queueDraft({ step: 5, planningDay: 4 }, { immediate: true });
    await flushDraft();
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });
});

describe("baseline answers", () => {
  it("sends only the changed baseline fields, and [] to clear the tools", async () => {
    queueDraft({ step: 5, prepHoursPerWeek: "H2_5", currentTools: ["AI_CHAT"] }, { immediate: true });
    await flushDraft();
    expect(saveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ prepHoursPerWeek: "H2_5", currentTools: ["AI_CHAT"] }),
    );

    queueDraft({ step: 5, prepHoursPerWeek: "H2_5", currentTools: [], classCount: "C1_2" }, { immediate: true });
    await flushDraft();
    const sent = saveDraft.mock.calls.at(-1)?.[0];
    expect(sent).toMatchObject({ currentTools: [], classCount: "C1_2" });
    expect("prepHoursPerWeek" in sent).toBe(false);
  });

  it("does not resend the answers restored from the server draft", async () => {
    resetDraft(async () => "tok", { prepHoursPerWeek: "LT2", currentTools: ["PUBLISHER"], classCount: "C3_4" }, 5);
    queueDraft(
      { step: 5, prepHoursPerWeek: "LT2", currentTools: ["PUBLISHER"], classCount: "C3_4" },
      { immediate: true },
    );
    await flushDraft();
    expect(saveDraft).not.toHaveBeenCalled();
  });
});
