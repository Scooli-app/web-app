import { todayIso } from "./support/api";
import { expect, test } from "./support/fixtures";

test("o formulário aberto a partir de uma aula fica ligado a essa aula", async ({ page, api }) => {
  const { timetable, lessons } = await api.createTurma("criar", [
    { date: todayIso(), slotType: "LESSON", topicTitle: "Dezenas e unidades" },
  ]);
  const lesson = lessons[0];

  await page.goto(`/quiz?lesson=${lesson.id}`);

  // "Para que aula?" has the lesson selected, and its turma filled the rest.
  await expect(page.getByRole("combobox", { name: "Para que aula?" })).toContainText("2.º Matemática · Dezenas e unidades");
  await expect(page.getByRole("textbox", { name: "Tema" })).toHaveValue("Dezenas e unidades");
  await expect(page.getByText("2.º ano · Matemática", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Criar quiz" }).click();
  await page.waitForURL(/\/quiz\/[0-9a-f-]{36}/, { timeout: 30_000 });
  const documentId = page.url().split("/quiz/")[1].split(/[?#]/)[0];

  // The editor says which turma and lesson the document is for (the link's name starts with its "Faz parte de uma
  // aula" caption).
  await expect(
    page.getByRole("link", { name: new RegExp(`^Faz parte de uma aula 2\\.º Matemática · Aula ${lesson.sequenceNumber} · `) }),
  ).toBeVisible();

  const docs = await api.listLessonDocuments(timetable.id, lesson.id);
  expect(docs).toEqual(expect.arrayContaining([expect.objectContaining({ documentId, documentRole: "quiz" })]));
});
