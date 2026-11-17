import { describe, expect, it } from "vitest";
import { getMissingFields } from "./missingField";

const plain = { needsTemplate: false, needsWorksheetVariant: false };

describe("getMissingFields", () => {
  it("asks for the subject when topic and year are set", () => {
    expect(getMissingFields({ topic: "x", schoolYear: 5 }, plain)).toEqual(["subject"]);
  });

  it("counts a whitespace-only topic as missing", () => {
    expect(getMissingFields({ topic: "  ", schoolYear: 5, subject: "matematica" }, plain)).toEqual(["topic"]);
  });

  it("lists every missing field in form order", () => {
    expect(getMissingFields({}, { needsTemplate: true, needsWorksheetVariant: true })).toEqual([
      "topic",
      "schoolYear",
      "subject",
      "template",
      "worksheetVariant",
    ]);
  });

  it("asks for the template only when the type needs one", () => {
    const state = { topic: "x", schoolYear: 5, subject: "matematica" };
    expect(getMissingFields(state, plain)).toEqual([]);
    expect(getMissingFields(state, { ...plain, needsTemplate: true })).toEqual(["template"]);
  });

  it("asks for the worksheet goal last", () => {
    const state = { topic: "x", schoolYear: 5, subject: "matematica" };
    expect(getMissingFields(state, { needsTemplate: true, needsWorksheetVariant: true })).toEqual([
      "template",
      "worksheetVariant",
    ]);
  });

  it("returns an empty list when everything is filled", () => {
    expect(
      getMissingFields(
        { topic: "x", schoolYear: 5, subject: "matematica", templateId: "t", worksheetVariant: "practice" },
        { needsTemplate: true, needsWorksheetVariant: true },
      ),
    ).toEqual([]);
  });
});
