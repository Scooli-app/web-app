import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS_COMPONENTS_SUBJECTS,
  GRADE_GROUPS,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
} from "@/components/document-creation/constants";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  getCountryCatalog,
  isCountryCode,
  subjectIdsForYear,
} from "./countryCatalog";

describe("countryCatalog", () => {
  describe("Portugal", () => {
    it("keeps the original school years, 1 to 12, in the original groups", () => {
      const catalog = getCountryCatalog("PT");
      expect(catalog.schoolYears.map((y) => y.value)).toEqual(
        Array.from({ length: 12 }, (_, i) => i + 1),
      );
      expect(catalog.yearGroups.map((g) => g.groupId)).toEqual(
        GRADE_GROUPS.map((g) => g.groupId),
      );
      expect(catalog.schoolYears[0]).toEqual({ value: 1, label: "1º ano" });
      expect(catalog.schoolYears[11]).toEqual({ value: 12, label: "12º ano" });
    });

    it("exposes the same subject data as the document-creation constants", () => {
      const catalog = getCountryCatalog("PT");
      expect(catalog.subjects).toBe(SUBJECTS);
      expect(catalog.subjectIdsByYear).toBe(SUBJECTS_BY_GRADE);
      expect(catalog.ambiguousSubjectIds).toEqual(AMBIGUOUS_COMPONENTS_SUBJECTS);
    });

    it("offers Portuguese subject ids per year", () => {
      expect(subjectIdsForYear(getCountryCatalog("PT"), 5)).toContain("portugues");
      expect(subjectIdsForYear(getCountryCatalog("PT"), "10")).toContain("filosofia");
    });
  });

  describe("Brazil", () => {
    const catalog = getCountryCatalog("BR");

    it("labels years 1 to 9 as ano and 10 to 12 as série of Ensino Médio", () => {
      expect(catalog.schoolYears).toEqual([
        { value: 1, label: "1º ano" },
        { value: 2, label: "2º ano" },
        { value: 3, label: "3º ano" },
        { value: 4, label: "4º ano" },
        { value: 5, label: "5º ano" },
        { value: 6, label: "6º ano" },
        { value: 7, label: "7º ano" },
        { value: 8, label: "8º ano" },
        { value: 9, label: "9º ano" },
        { value: 10, label: "1ª série (Ensino Médio)" },
        { value: 11, label: "2ª série (Ensino Médio)" },
        { value: 12, label: "3ª série (Ensino Médio)" },
      ]);
    });

    it("has Ensino Fundamental and Ensino Médio groups", () => {
      expect(catalog.yearGroups.map((g) => [g.label, g.years.map((y) => y.value)])).toEqual([
        ["Ensino Fundamental", [1, 2, 3, 4, 5, 6, 7, 8, 9]],
        ["Ensino Médio", [10, 11, 12]],
      ]);
    });

    it("offers the Fundamental subjects in years 1 to 9", () => {
      const expected = [
        "Língua Portuguesa",
        "Matemática",
        "Ciências",
        "Geografia",
        "História",
        "Arte",
        "Educação Física",
        "Ensino Religioso",
        "Língua Inglesa",
        "Computação",
      ];
      for (let year = 1; year <= 9; year++) {
        expect(subjectIdsForYear(catalog, year)).toEqual(expected);
      }
    });

    it("offers the Médio subjects in years 10 to 12", () => {
      const expected = [
        "Linguagens",
        "Matemática",
        "Ciências da Natureza",
        "Ciências Humanas e Sociais Aplicadas",
        "Língua Portuguesa",
        "Computação",
      ];
      for (const year of [10, 11, 12]) {
        expect(subjectIdsForYear(catalog, year)).toEqual(expected);
      }
    });

    it("uses the exact display string as both id and backend value", () => {
      for (const subject of catalog.subjects) {
        expect(subject.id).toBe(subject.label);
        expect(subject.value).toBe(subject.label);
      }
    });

    it("lists each subject once across both bands", () => {
      const ids = catalog.subjects.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(13);
    });

    it("has no ambiguous component subjects and a single category", () => {
      expect(catalog.ambiguousSubjectIds).toEqual([]);
      expect(new Set(catalog.subjects.map((s) => s.category))).toEqual(
        new Set(catalog.categoryOrder),
      );
    });

    it("does not share subject ids with the Portuguese catalog", () => {
      const ptIds = new Set(SUBJECTS.map((s) => s.id));
      for (const subject of catalog.subjects) {
        expect(ptIds.has(subject.id)).toBe(false);
      }
    });
  });

  describe("subjectIdsForYear", () => {
    it("returns every subject of the country when no year is chosen", () => {
      const catalog = getCountryCatalog("BR");
      expect(subjectIdsForYear(catalog, undefined)).toEqual(catalog.subjects.map((s) => s.id));
      expect(subjectIdsForYear(catalog, "")).toEqual(catalog.subjects.map((s) => s.id));
    });

    it("returns an empty list for a year the country does not have", () => {
      expect(subjectIdsForYear(getCountryCatalog("BR"), 13)).toEqual([]);
    });
  });

  describe("country codes", () => {
    it("defaults to Portugal and supports PT and BR", () => {
      expect(DEFAULT_COUNTRY_CODE).toBe("PT");
      expect(COUNTRY_CODES).toEqual(["PT", "BR"]);
    });

    it("recognises only supported codes", () => {
      expect(isCountryCode("BR")).toBe(true);
      expect(isCountryCode("PT")).toBe(true);
      expect(isCountryCode("US")).toBe(false);
      expect(isCountryCode("br")).toBe(false);
      expect(isCountryCode(undefined)).toBe(false);
    });

    it("falls back to the Portuguese catalog for unknown countries", () => {
      expect(getCountryCatalog(undefined).countryCode).toBe("PT");
      expect(getCountryCatalog("US").countryCode).toBe("PT");
      expect(getCountryCatalog("BR").countryCode).toBe("BR");
    });
  });
});
