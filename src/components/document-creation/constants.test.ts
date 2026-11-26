import { afterEach, describe, expect, it } from "vitest";
import { registerTranslator } from "@/i18n/translate";
import { translateSubjectLabel } from "./constants";

describe("translateSubjectLabel", () => {
  afterEach(() => registerTranslator((key) => key));

  it("translates a Portuguese subject id", () => {
    registerTranslator((key) => (key === "documentCreation.options.subjects.matematica" ? "Matemática" : key));
    expect(translateSubjectLabel("matematica")).toBe("Matemática");
  });

  it("shows a Brazilian subject id as it is, never a raw catalogue key", () => {
    registerTranslator((key) => key);
    expect(translateSubjectLabel("Língua Portuguesa")).toBe("Língua Portuguesa");
  });
});
