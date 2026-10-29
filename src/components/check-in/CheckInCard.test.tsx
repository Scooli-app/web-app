import type { CheckInCardItem } from "@/components/check-in/CheckInCard";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CheckInCard, subjectRepeatsTurma } from "./CheckInCard";
import { CheckInOutcomeStep, CheckInResultOptions } from "./CheckInChoices";

// Each translated string renders as its key, followed by its values, so the tests can read the meta line.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? [key, ...Object.values(values)].join("|") : key,
}));

const item: CheckInCardItem = {
  slotDate: "2026-10-15",
  slotType: "LESSON",
  turmaTitle: "9.º A",
  subject: "PORTUGUESE",
  topicTitle: null,
  outcomes: [],
};

function render(props: { onSkip?: () => void; onCancel?: () => void; item?: CheckInCardItem }) {
  return renderToStaticMarkup(
    createElement(CheckInCard, {
      item: props.item ?? item,
      locale: "pt-PT",
      onSubmit: vi.fn(),
      onSkip: props.onSkip,
      onCancel: props.onCancel,
    }),
  );
}

describe("CheckInCard", () => {
  it("offers the four results", () => {
    const html = render({});
    expect(html).toContain("resultTaught");
    expect(html).toContain("resultNotHeld");
  });

  it("shows no cancel button unless the caller passes onCancel", () => {
    expect(render({})).not.toContain(">cancel</button>");
    expect(render({ onCancel: vi.fn() })).toContain(">cancel</button>");
  });

  it("shows the not-yet button for a test only when the caller passes onSkip", () => {
    const test = { ...item, slotType: "ASSESSMENT" as const };
    expect(render({ item: test })).not.toContain("assessmentNotYet");
    expect(render({ item: test, onSkip: vi.fn() })).toContain("assessmentNotYet");
  });

  it("keeps the subject in the meta line when the turma title does not name it", () => {
    const html = render({ item: { ...item, turmaTitle: "9.º A", subject: "Quimica", topicTitle: "Frações" } });
    expect(html).toContain("meta|9.º A|Quimica|Frações|");
  });

  it("drops the subject from the meta line when the turma title already names it", () => {
    const html = render({
      item: { ...item, turmaTitle: "6.º PLANO2 Química A", subject: "Quimica", topicTitle: "Frações" },
    });
    expect(html).toContain("metaNoSubject|6.º PLANO2 Química A|Frações|");
    expect(html).not.toContain("Quimica");
  });

  it("clips a long turma name so the topic and day still fit the line", () => {
    const html = render({ item: { ...item, turmaTitle: "Turma ".repeat(40), subject: "Quimica", topicTitle: "Frações" } });
    expect(html).toContain(`meta|${"Turma ".repeat(6)}Tur…|Quimica|Frações|`);
  });

  it("names the turma as the calendar does when its year and class label come with it", () => {
    const html = render({ item: { ...item, gradeLevel: 7, classLabel: "B", subject: "Quimica", topicTitle: "Frações" } });
    expect(html).toContain("metaNoSubject|gradeShort|7");
    expect(html).toContain("· B|Frações|");
  });

  it("drops the subject from the meta line without a topic too", () => {
    const html = render({ item: { ...item, turmaTitle: "6.º Química", subject: "Quimica" } });
    expect(html).toContain("metaNoSubjectNoTopic|6.º Química|");
  });
});

describe("CheckInCard in the calendar dialog", () => {
  it("drops the meta line when the lesson is already named above it", () => {
    const html = renderToStaticMarkup(
      createElement(CheckInCard, {
        item: { ...item, topicTitle: "Frações" },
        locale: "pt-PT",
        onSubmit: vi.fn(),
        showMeta: false,
      }),
    );
    expect(html).not.toContain("meta|");
    expect(html).toContain("title");
  });
});

describe("CheckInResultOptions", () => {
  it("renders the four results as cards, each with its icon and label", () => {
    const html = renderToStaticMarkup(createElement(CheckInResultOptions, { onChoose: vi.fn() }));
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).toContain("resultTaught");
    expect(html).toContain("resultDifficulties");
    expect(html).toContain("resultPartial");
    expect(html).toContain("resultNotHeld");
    // Two per row on narrow screens, four on wide ones.
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("sm:grid-cols-4");
  });
});

describe("CheckInOutcomeStep", () => {
  const outcomes = [
    { id: "o1", text: "Ler com fluência", topicPath: [], source: "ai" },
    { id: "o2", text: "Somar frações", topicPath: [], source: "ai" },
  ];
  const render = (selected: string[]) =>
    renderToStaticMarkup(
      createElement(CheckInOutcomeStep, {
        question: "difficultiesQuestion",
        result: "TAUGHT_WITH_DIFFICULTIES",
        outcomes,
        selected,
        onToggle: vi.fn(),
        onSave: vi.fn(),
        onBack: vi.fn(),
      }),
    );

  it("saves with Guardar and goes back with Voltar, with no skip and no cancel", () => {
    const html = render([]);
    expect(html).toContain(">save<");
    expect(html).toContain(">back<");
    expect(html).not.toContain("skip");
    expect(html).not.toContain("cancel");
  });

  it("lists each outcome as a checkbox row that shows the ticked ones", () => {
    const html = render(["o2"]);
    expect(html.match(/role="checkbox"/g)).toHaveLength(2);
    expect(html).toContain('title="Ler com fluência"');
    expect(html).toContain("line-clamp-2");
    const rows = html.split("<li").slice(1);
    expect(rows[0]).toContain('aria-checked="false"');
    expect(rows[1]).toContain('aria-checked="true"');
  });
});

describe("CheckInOutcomeStep with one outcome (ENG-253)", () => {
  const only = [{ id: "o1", text: "Somar frações", topicPath: [], source: "ai" }];
  const render = (result: "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL", outcomes = only) =>
    renderToStaticMarkup(
      createElement(CheckInOutcomeStep, {
        question: "difficultiesQuestion",
        result,
        outcomes,
        selected: ["o1"],
        onToggle: vi.fn(),
        onSave: vi.fn(),
        onBack: vi.fn(),
      }),
    );

  it("shows the outcome as one ticked checkbox row, like a list of one", () => {
    const html = render("TAUGHT_WITH_DIFFICULTIES");
    expect(html.match(/role="checkbox"/g)).toHaveLength(1);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('role="group"');
    expect(html).toContain("Somar frações");
  });

  it("with no outcomes, drops the outcome question and list and keeps only the note label", () => {
    const html = renderToStaticMarkup(
      createElement(CheckInOutcomeStep, {
        question: "difficultiesQuestion",
        result: "TAUGHT_WITH_DIFFICULTIES",
        outcomes: [],
        selected: [],
        onToggle: vi.fn(),
        onSave: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(html).not.toContain("difficultiesQuestion");
    expect(html).not.toContain('role="group"');
    expect(html).not.toContain('role="checkbox"');
    expect(html).toContain("noteLabel");
    expect(html).not.toContain("missingAmountQuestion");
  });

  it("keeps the checklist when there are several outcomes", () => {
    const two = [...only, { id: "o2", text: "Ler com fluência", topicPath: [], source: "ai" }];
    const html = render("TAUGHT_WITH_DIFFICULTIES", two);
    expect(html.match(/role="checkbox"/g)).toHaveLength(2);
  });
});

describe("CheckInOutcomeStep amount and note (ENG-253)", () => {
  const outcomes = [
    { id: "o1", text: "Ler com fluência", topicPath: [], source: "ai" },
    { id: "o2", text: "Somar frações", topicPath: [], source: "ai" },
  ];
  const render = (result: "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL") =>
    renderToStaticMarkup(
      createElement(CheckInOutcomeStep, {
        question: "uncoveredQuestion",
        result,
        outcomes,
        selected: [],
        onToggle: vi.fn(),
        onSave: vi.fn(),
        onBack: vi.fn(),
      }),
    );

  it("asks how much was left only for 'ficou a meio', as three choices", () => {
    const partial = render("PARTIAL");
    expect(partial).toContain("missingAmountQuestion");
    expect(partial).toContain("missingLittle");
    expect(partial).toContain("missingHalf");
    expect(partial).toContain("missingMost");
    expect(render("TAUGHT_WITH_DIFFICULTIES")).not.toContain("missingAmountQuestion");
  });

  it("has a labelled note field for both results, with the placeholder and no counter when short", () => {
    for (const result of ["TAUGHT_WITH_DIFFICULTIES", "PARTIAL"] as const) {
      const html = render(result);
      expect(html).toContain("noteLabel");
      expect(html).toContain('placeholder="notePlaceholder"');
      expect(html).toContain("<textarea");
      expect(html).not.toMatch(/\/500/);
    }
  });
});

describe("subjectRepeatsTurma", () => {
  it("matches the subject inside the turma title", () => {
    expect(
      subjectRepeatsTurma("6.º PLANO2 História e Geografia de Portugal", "História e Geografia de Portugal"),
    ).toBe(true);
  });

  it("ignores case and accents", () => {
    expect(
      subjectRepeatsTurma("6.º PLANO2 HISTORIA E GEOGRAFIA DE PORTUGAL", "história e geografia de portugal"),
    ).toBe(true);
  });

  it("does not match a different subject, a longer subject, or an empty one", () => {
    expect(subjectRepeatsTurma("9.º A", "Português")).toBe(false);
    expect(subjectRepeatsTurma("9.º História", "História e Geografia")).toBe(false);
    expect(subjectRepeatsTurma("9.º A", "")).toBe(false);
  });
});

describe("CheckInResultOptions styling (ENG-246)", () => {
  it("gives each card a tinted fill and a coloured border, with a dark-mode fill of its own", () => {
    const html = renderToStaticMarkup(createElement(CheckInResultOptions, { onChoose: vi.fn() }));
    expect(html).toContain("bg-emerald-500/[0.08]");
    expect(html).toContain("dark:bg-emerald-500/10");
    expect(html).toContain("border-emerald-500/35");
    expect(html).toContain("dark:border-emerald-500/40");
    expect(html).toContain("border-amber-500/35");
    expect(html).toContain("border-sky-500/35");
    expect(html).toContain("border-rose-500/35");
  });

  it("keeps the cards equal in height and the accessible names as the visible labels", () => {
    const html = renderToStaticMarkup(createElement(CheckInResultOptions, { onChoose: vi.fn() }));
    expect(html.match(/h-full/g)).toHaveLength(4);
    expect(html).toContain("resultNotHeld");
  });
});
