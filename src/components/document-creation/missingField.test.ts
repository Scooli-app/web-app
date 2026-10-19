import { describe, expect, it } from "vitest";
import { getMissingField } from "./missingField";

const plain = { needsTemplate: false, needsWorksheetVariant: false };

describe("getMissingField", () => {
  it("asks for the subject when topic and year are set", () => {
    expect(getMissingField({ topic: "x", schoolYear: 5 }, plain)).toBe("subject");
  });

  it("asks for the topic first, even when it is only whitespace", () => {
    expect(getMissingField({ topic: "  ", schoolYear: 5, subject: "matematica" }, plain)).toBe("topic");
  });

  it("asks for the year before the subject", () => {
    expect(getMissingField({ topic: "x" }, plain)).toBe("schoolYear");
  });

  it("asks for the template only when the type needs one", () => {
    const state = { topic: "x", schoolYear: 5, subject: "matematica" };
    expect(getMissingField(state, plain)).toBeNull();
    expect(getMissingField(state, { ...plain, needsTemplate: true })).toBe("template");
  });

  it("asks for the worksheet goal last", () => {
    const state = { topic: "x", schoolYear: 5, subject: "matematica", templateId: "t" };
    expect(
      getMissingField(state, { needsTemplate: true, needsWorksheetVariant: true }),
    ).toBe("worksheetVariant");
  });

  it("returns null when everything is filled", () => {
    expect(
      getMissingField(
        { topic: "x", schoolYear: 5, subject: "matematica", templateId: "t", worksheetVariant: "practice" },
        { needsTemplate: true, needsWorksheetVariant: true },
      ),
    ).toBeNull();
  });
});
