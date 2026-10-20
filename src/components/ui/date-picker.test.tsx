import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  // The app configures no time zone, so the formatter runs in UTC like on the server.
  const formatter = actual.createFormatter({ locale: "pt-PT", timeZone: "UTC" });
  return {
    useTranslations: () => (key: string) => key,
    useFormatter: () => formatter,
  };
});
vi.mock("@/i18n/dateFns", () => ({ useDateFnsLocale: () => undefined }));

import { DatePicker } from "./date-picker";

describe("DatePicker", () => {
  it("shows the chosen day even when the formatter runs in UTC", () => {
    // Local midnight of 16 September: east of UTC (Lisbon in summer) this instant is still 15 September in UTC.
    const html = renderToStaticMarkup(createElement(DatePicker, { value: new Date(2026, 8, 16) }));

    expect(html).toContain("16 de setembro de 2026");
  });
});
