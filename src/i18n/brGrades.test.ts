import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import br from "../../messages/pt-BR.json";

// Brazil: 1º–9º ano (Ensino Fundamental), then 1ª–3ª série (Ensino Médio) for the internal years 10–12.
const t = createTranslator({ locale: "pt-PT", messages: br as never });

describe("pt-BR school year labels", () => {
  it("says série for the Ensino Médio years and º ano before", () => {
    expect(t("timetable.gradeYear" as never, { grade: 9 } as never)).toBe("9º ano");
    expect(t("timetable.gradeYear" as never, { grade: 10 } as never)).toBe("1ª série");
    expect(t("timetable.gradeShort" as never, { grade: 12 } as never)).toBe("3ª série");
    expect(t("onboardingV2.teaching.yearChip" as never, { year: 5 } as never)).toBe("5º");
    expect(t("onboardingV2.class.yearLetter" as never, { year: 11, label: "B" } as never)).toBe("2ª série B");
  });

  it("shortens a range that ends in the Ensino Médio", () => {
    expect(t("schoolSources.years.range" as never, { from: 10, to: 12 } as never)).toBe("1ª–3ª série");
    expect(t("schoolSources.years.range" as never, { from: 7, to: 9 } as never)).toBe("7º–9º");
  });
});
