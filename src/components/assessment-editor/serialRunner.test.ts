import { describe, expect, it } from "vitest";
import { createSerialRunner } from "./serialRunner";

describe("createSerialRunner", () => {
  it("runs one at a time and collapses calls made meanwhile into one follow-up", async () => {
    let running = 0;
    let maxRunning = 0;
    const resolvers: ((v: boolean) => void)[] = [];
    const run = () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      return new Promise<boolean>((resolve) => resolvers.push((v) => { running--; resolve(v); }));
    };
    const save = createSerialRunner(run);

    const first = save();
    const second = save();
    const third = save();
    expect(resolvers).toHaveLength(1);
    expect(second).toBe(third);

    resolvers[0](true);
    expect(await first).toBe(true);
    await Promise.resolve();
    expect(resolvers).toHaveLength(2);
    resolvers[1](false);
    expect(await second).toBe(false);
    expect(maxRunning).toBe(1);

    expect(await save.settled()).toBe(true); // nothing pending
    const fourth = save();
    const pending = save.settled();
    expect(resolvers).toHaveLength(3);
    resolvers[2](false);
    expect(await fourth).toBe(false);
    expect(await pending).toBe(false);
  });
});
