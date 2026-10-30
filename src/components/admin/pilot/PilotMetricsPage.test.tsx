import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatPercent } from "./format";
import { PilotMetricsPage } from "./PilotMetricsPage";
import { PilotTurmaTable } from "./PilotTurmaTable";
import { EMPTY_COUNTS, groupByTurma } from "./pilot-metrics";

const state = vi.hoisted(() => ({ isAdmin: true, isLoaded: true }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-PT",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useAdmin", () => ({
  useAdmin: () => ({ isAdmin: state.isAdmin, isLoaded: state.isLoaded }),
}));
vi.mock("@/services/api/admin-pilot-metrics.service", () => ({
  adminPilotMetricsService: { getPilotMetrics: vi.fn() },
}));

beforeEach(() => {
  state.isAdmin = true;
  state.isLoaded = true;
});

describe("PilotMetricsPage admin guard", () => {
  it("shows no pilot content to a non-admin while the redirect runs", () => {
    state.isAdmin = false;
    const markup = renderToStaticMarkup(createElement(PilotMetricsPage));
    expect(markup).not.toContain("exportCsv");
    expect(markup).toContain("animate-spin");
  });

  it("shows no pilot content while the user is still loading", () => {
    state.isLoaded = false;
    const markup = renderToStaticMarkup(createElement(PilotMetricsPage));
    expect(markup).not.toContain("exportCsv");
    expect(markup).toContain("animate-spin");
  });

  it("renders the page with its loading state for an admin", () => {
    const markup = renderToStaticMarkup(createElement(PilotMetricsPage));
    expect(markup).toContain("title");
    expect(markup).toContain("exportCsv");
    expect(markup).toContain("range.from");
    expect(markup).toContain('data-slot="skeleton"');
  });
});

describe("PilotTurmaTable", () => {
  const weeks = ["2026-W41", "2026-W42"];
  const rows = [
    {
      ...structuredClone(EMPTY_COUNTS),
      userId: "u-ana", teacherEmail: "ana@escola.pt", timetableId: "t-1", turmaTitle: "9.º A", week: "2026-W41",
      active: true, lessonsDue: 4, answered: 4,
    },
    {
      ...structuredClone(EMPTY_COUNTS),
      userId: "u-bruno", teacherEmail: "bruno@escola.pt", timetableId: "t-2", turmaTitle: "9.º B", week: "2026-W41",
      active: false, lessonsDue: 4, answered: 1,
    },
  ];

  it("renders one row per teacher and turma, lowest answer rate first", () => {
    const markup = renderToStaticMarkup(
      createElement(PilotTurmaTable, { groups: groupByTurma(rows), weeks }),
    );
    expect(markup.indexOf("bruno@escola.pt")).toBeLessThan(markup.indexOf("ana@escola.pt"));
    expect(markup.match(/<tr/g)).toHaveLength(3);
    expect(markup).toContain(formatPercent(0.25));
    expect(markup).toContain(formatPercent(1));
  });

  it("renders a week column per week of the range", () => {
    const markup = renderToStaticMarkup(
      createElement(PilotTurmaTable, { groups: groupByTurma(rows), weeks }),
    );
    expect(markup).toContain(">W41<");
    expect(markup).toContain(">W42<");
  });
});
