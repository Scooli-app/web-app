import { addDays, todayIso } from "./support/api";
import { expect, test } from "./support/fixtures";

test("o pop-up da aula prepara plano + ficha, com o plano primeiro", async ({ page, api }) => {
  const today = todayIso();
  const { timetable, lessons } = await api.createTurma("popup", [
    { date: today, slotType: "EXERCISE", topicTitle: "Contar de 2 em 2" },
    { date: addDays(today, 2), slotType: "LESSON", topicTitle: "Números pares e ímpares" },
  ]);
  const lesson = lessons[1];

  // Every generation request for this lesson, in the order the browser sent them.
  const calls: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() !== "POST" || !path.includes(`/lessons/${lesson.id}/`)) return;
    if (path.endsWith("/documents/generate")) calls.push(`document:${request.postDataJSON()?.documentType}`);
    else if (path.endsWith("/generate")) calls.push("lessonPlan");
  });
  let planFinished = false;
  let documentStartedBeforePlanFinished = false;
  page.on("requestfinished", (request) => {
    if (new URL(request.url()).pathname.endsWith(`/lessons/${lesson.id}/generate`)) planFinished = true;
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith(`/lessons/${lesson.id}/documents/generate`) && !planFinished) {
      documentStartedBeforePlanFinished = true;
    }
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: /Números pares e ímpares/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Números pares e ímpares");
  await dialog.getByRole("button", { name: /^Preparar plano \+ ficha/ }).click();

  // The plan streams first; the pop-up closes when it's written, then the worksheet starts.
  await expect.poll(() => calls, { timeout: 45_000 }).toEqual(["lessonPlan", "document:worksheet"]);
  expect(documentStartedBeforePlanFinished).toBe(false);

  await expect
    .poll(async () => (await api.listLessonDocuments(timetable.id, lesson.id)).map((d) => d.documentRole).sort(), {
      timeout: 30_000,
    })
    .toEqual(["lessonPlan", "worksheet"]);
});
