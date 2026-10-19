import { addDays, todayIso } from "./support/api";
import { expect, test } from "./support/fixtures";

test("“Os meus documentos” agrupa por turma e “Ver todos” abre uma turma", async ({ page, api }) => {
  const today = todayIso();
  const { timetable, lessons } = await api.createTurma("documentos", [
    { date: today, slotType: "EXERCISE", topicTitle: "Tabuada do 2" },
    { date: addDays(today, 1), slotType: "EXERCISE", topicTitle: "Tabuada do 5" },
    { date: addDays(today, 2), slotType: "EXERCISE", topicTitle: "Tabuada do 10" },
  ]);
  // Six documents: more than a turma section shows (four), so it offers "Ver todos".
  for (const lesson of lessons) {
    await api.generateLessonDocument(timetable.id, lesson.id, "worksheet");
    await api.generateLessonDocument(timetable.id, lesson.id, "quiz");
  }
  const documentIds = (
    await Promise.all(lessons.map((lesson) => api.listLessonDocuments(timetable.id, lesson.id)))
  ).flatMap((docs) => docs.map((d) => d.documentId));
  expect(documentIds).toHaveLength(6);

  await page.goto("/documents");

  const section = page.getByRole("region", { name: /^2\.º Matemática/ });
  // The section's own heading (each card has a heading too).
  await expect(section.locator("h3[id^='class-section-']")).toHaveText(/2\.º Matemática\s*· 6 documentos/);
  await expect(section.locator("a[href]")).toHaveCount(4);
  const shownInSection = await section.locator("a[href]").evaluateAll((links) =>
    links.map((a) => a.getAttribute("href") ?? ""),
  );
  expect(shownInSection.every((href) => documentIds.some((id) => href.endsWith(`/${id}`)))).toBe(true);

  await section.getByRole("button", { name: "Ver todos" }).click();

  // One turma, all of its documents, no more sections.
  await expect(page.getByRole("region", { name: /^2\.º Matemática/ })).toBeHidden();
  for (const id of documentIds) {
    await expect(page.locator(`a[href$="/${id}"]`)).toBeVisible();
  }
});
