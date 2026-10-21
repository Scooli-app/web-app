import en from "../../messages/en.json";
import pt from "../../messages/pt-PT.json";
import { describe, expect, it } from "vitest";

/**
 * The agreed vocabulary of the ENG-313 pass (one word per state, "Previstas" for future lessons, "Tema novo",
 * "Mover aulas seguintes" for the non-Pro move). Pins the copy so a later edit cannot quietly bring back the old names.
 */
describe("ENG-313 vocabulary", () => {
  it("names future lessons in the progress panel 'Previstas', and past unanswered ones 'Por confirmar'", () => {
    expect(pt.calendar.progress.pending).toBe("Previstas");
    expect(pt.calendar.progress.unconfirmedLessons).toBe("Por confirmar");
    expect(pt.calendar.progress.unconfirmedLegend).toBe("+{count} por confirmar");
    expect(en.calendar.progress.pending).toBe("Planned");
    expect(en.calendar.progress.unconfirmedLessons).toBe("To confirm");
  });

  it("uses 'Mover aulas seguintes' for the non-Pro next step, and keeps 'Reajustar' for Pro", () => {
    expect(pt.nextSteps.actionShift).toBe("Mover aulas seguintes");
    expect(pt.nextSteps.actionReschedule).toBe("Reajustar");
    expect(pt.nextSteps.replanNotHeldShift).toBe("Não houve aula: mover as aulas seguintes");
    expect(pt.nextSteps.replanNotHeldShift).not.toContain("Reajust");
    expect(en.nextSteps.actionShift).toBe("Move following lessons");
  });

  it("names a topic change 'Tema novo', and keeps 'Proposta' for the replan", () => {
    expect(pt.calendar.slotDialog.proposal.badge).toBe("Tema novo");
    expect(pt.calendar.slotDialog.proposal.title).toBe("Tema novo para esta aula");
    expect(pt.replan.sheetTitle).toBe("Proposta de reajuste");
    expect(en.calendar.slotDialog.proposal.badge).toBe("New topic");
    expect(en.calendar.slotDialog.proposal.title).toBe("New topic for this lesson");
  });

  it("uses 'Lecionada' for the taught state, with no 'Dada' or 'Dadas' left for it", () => {
    expect(pt.checkIns.mark.taught).toBe("Lecionada");
    expect(pt.checkIns.mark.taughtWithDifficulties).toBe("Lecionada · com dificuldades");
    expect(pt.checkIns.mark.assumedTaught).toBe("Assumida como lecionada");
    expect(pt.checkIns.taughtToast).toBe("Aula marcada como lecionada");
    expect(pt.calendar.progress.given).toBe("Lecionadas");
    expect(pt.checkIns.resultTaught).toBe("Correu bem");
    expect(en.calendar.progress.given).toBe("Taught");
    expect(en.checkIns.mark.taught).toBe("Taught");
  });

  it("asks the previous lesson in the same words in the strip and in the lesson dialog", () => {
    expect(pt.previousCheckIn.question).toBe(pt.checkIns.title);
    expect(pt.checkIns.title).toBe("Como correu a aula?");
    expect(en.previousCheckIn.question).toBe(en.checkIns.title);
  });
});
