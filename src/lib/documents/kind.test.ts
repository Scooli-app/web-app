import { describe, expect, it } from "vitest";
import { isAssessmentDoc, isJsonDoc, isPresentationDoc } from "./kind";

describe("document kind", () => {
  it("kindDistinguishesPresentationFromTestJson", () => {
    const pres = { documentType: "presentation", contentFormat: "json" } as const;
    const test = { documentType: "test", contentFormat: "json" } as const;
    expect(isPresentationDoc(pres)).toBe(true);
    expect(isAssessmentDoc(pres)).toBe(false);
    expect(isPresentationDoc(test)).toBe(false);
    expect(isAssessmentDoc(test)).toBe(true);
    expect(isAssessmentDoc({ documentType: "quiz", contentFormat: "json" })).toBe(true);
    expect(isAssessmentDoc({ documentType: "worksheet", contentFormat: "json" })).toBe(true);
    expect(isJsonDoc(pres) && isJsonDoc(test)).toBe(true);
  });

  it("markdown and missing docs are neither", () => {
    const md = { documentType: "test", contentFormat: "markdown" } as const;
    expect(isAssessmentDoc(md)).toBe(false);
    expect(isAssessmentDoc({ documentType: "test" })).toBe(false);
    expect(isPresentationDoc(null)).toBe(false);
    expect(isJsonDoc(undefined)).toBe(false);
  });
});
