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
