import { describe, expect, it } from "vitest";
import { SOURCE_NAME_MAX, clipName, nameLength } from "./sources";

describe("source name limits", () => {
  it("counts code points like the server, so an emoji counts once", () => {
    expect(nameLength("Fichas 📚")).toBe(8);
    expect("Fichas 📚".length).toBe(9);
  });

  it("cuts at the limit without splitting an emoji", () => {
    const name = `${"a".repeat(SOURCE_NAME_MAX - 1)}📚📚`;
    const clipped = clipName(name);
    expect(nameLength(clipped)).toBe(SOURCE_NAME_MAX);
    expect(clipped.endsWith("📚")).toBe(true);
    expect(/[\uD800-\uDBFF]$/.test(clipped)).toBe(false); // no lone high surrogate at the end
  });

  it("leaves a name within the limit as it is", () => {
    expect(clipName("Regulamento interno")).toBe("Regulamento interno");
  });
});
