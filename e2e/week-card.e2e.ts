import { addDays, todayIso } from "./support/api";
import { expect, test } from "./support/fixtures";

/** The dashboard's "your week" card (the one with "Preparar planos de aula"). */
function weekCard(page: import("@playwright/test").Page) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: /^Hoje ·/ }) });
}

test.describe("Dashboard: a tua semana", () => {
  test("o botão principal da aula prepara ficha + quiz e os chips passam a ✓", async ({ page, api }) => {
    const today = todayIso();
    const { timetable, lessons } = await api.createTurma("semana", [
      { date: today, slotType: "EXERCISE", topicTitle: "Adição com transporte" },
      { date: addDays(today, 2), slotType: "LESSON", topicTitle: "Números até 100" },
    ]);
    const exercise = lessons[0];

    await page.goto("/dashboard");
    const card = weekCard(page);
    await expect(card.getByText("Adição com transporte")).toBeVisible();

    // A practice lesson in a practical subject: worksheet + quiz, no plan.
    await card.getByRole("button", { name: /^Preparar ficha \+ quiz/ }).click();

    // Both chips end up as ready documents (the card polls while they're being written).
    await expect(card.getByRole("link", { name: "Ficha", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(card.getByRole("link", { name: "Quiz", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(card.getByRole("button", { name: /^Preparar ficha/ })).toBeHidden();

    const docs = await api.listLessonDocuments(timetable.id, exercise.id);
    expect(docs.map((d) => d.documentRole).sort()).toEqual(["quiz", "worksheet"]);
  });

  test("“Preparar planos de aula (N)” pede confirmação e lista as aulas", async ({ page, api }) => {
    const today = todayIso();
    await api.createTurma("planos", [
      { date: today, slotType: "LESSON", topicTitle: "Figuras geométricas" },
      { date: addDays(today, 1), slotType: "LESSON", topicTitle: "Medir comprimentos" },
      { date: addDays(today, 3), slotType: "EXERCISE", topicTitle: "Problemas de subtração" },
    ]);

    await page.goto("/dashboard");
    const card = weekCard(page);
    await card.getByRole("button", { name: "Preparar planos de aula (3)" }).click();

    const dialog = page.getByRole("dialog", { name: "Preparar planos de aula" });
    await expect(dialog).toBeVisible();
    const items = dialog.getByRole("listitem");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText("2.º Matemática · Figuras geométricas");
    await expect(items.nth(1)).toContainText("2.º Matemática · Medir comprimentos");
    await expect(items.nth(2)).toContainText("2.º Matemática · Problemas de subtração");
    await expect(dialog.getByRole("button", { name: "Preparar 3 planos" })).toBeVisible();

    // Cancelling writes nothing.
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(card.getByRole("button", { name: "Preparar planos de aula (3)" })).toBeVisible();
  });
});
