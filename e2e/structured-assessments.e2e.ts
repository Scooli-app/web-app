import type { Download, Locator, Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Api } from "./support/api";
import { expect, test } from "./support/fixtures";

/**
 * Structured tests / worksheets / quizzes end to end, against a REAL-AI LOCAL stack only. Skipped unless
 * SA_E2E=1 (CI runs the e2e suite with fake AI, which cannot generate these documents).
 *
 * Prerequisites (see README → "Testes e2e"):
 * - scooli-db (Docker) on localhost:5432 with the AE curriculum loaded; the flag, plan, membership and content
 *   language are toggled with psql in that container (or E2E_DATABASE_URL), like global.setup's grantPro. Never
 *   point this at a shared database.
 * - chalkboard with real AI keys and a local S3 stand-in for R2 (exports are uploaded and downloaded through
 *   presigned URLs), the web-app dev server (E2E_BASE_URL), the Clerk e2e user from .env.e2e.local.
 * - Python 3 with pypdf (`SA_E2E_PYTHON`, default `python`): support/exported_text.py reads the exported files.
 *
 * Side effects it leaves behind on that local DB: the generated documents, a shared + approved community
 * resource, the user's `structured_assessments` override (on) and a Pro subscription with a large credit limit.
 *
 * Artifacts go to test-results/structured-assessments unless SA_E2E_ARTIFACTS_DIR is set (screenshots: also
 * SA_E2E_SHOTS_DIR, name prefix SA_E2E_SHOT_PREFIX; downloaded files: SA_E2E_SAMPLES_DIR). Generation takes
 * minutes: SA_REUSE=1 reuses the documents from the previous run.
 */

const ARTIFACTS =
  process.env.SA_E2E_ARTIFACTS_DIR ??
  path.resolve(__dirname, "../test-results/structured-assessments");
const SHOTS = process.env.SA_E2E_SHOTS_DIR ?? path.join(ARTIFACTS, "screenshots");
const SHOT_PREFIX = process.env.SA_E2E_SHOT_PREFIX ?? "sa-";
const SAMPLES = process.env.SA_E2E_SAMPLES_DIR ?? path.join(ARTIFACTS, "export-samples");
const IDS_FILE = path.join(ARTIFACTS, "documents.json");
const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";

type Family = "test" | "worksheet" | "quiz";
type Ids = Partial<Record<Family | "markdown" | "english" | "kinds" | "maths", string>>;

interface StoredDoc {
  id: string;
  title: string;
  content: string;
  contentFormat?: string;
  status: string;
  metadata?: { contentLanguage?: string } | null;
}

interface Option {
  id: string;
  text: string;
  side: "left" | "right" | null;
}

interface Media {
  imageRef: string | null;
  placeholder: { query: string; alt: string } | null;
}

interface Exercise {
  kind: "exercise";
  id: string;
  type: string;
  prompt: string;
  points: number | null;
  options: Option[] | null;
  answer: { optionIds: string[] | null; text: string | null } & Record<string, unknown>;
  explanation: string | null;
  media: Media | null;
  aeOutcomeIds: string[];
  [key: string]: unknown;
}

interface Assessment {
  title: string | null;
  targetTotal: number | null;
  header: { school: string | null; gradeClass: string | null } & Record<string, unknown>;
  sections: {
    id: string;
    title: string;
    instructions: string | null;
    items: (Exercise | { kind: "reading"; id: string; media: Media | null })[];
  }[];
}

const KINDS = [
  "multiple_choice",
  "true_false",
  "fill_gaps",
  "matching",
  "ordering",
  "short_answer",
  "long_answer",
  "calculation",
  "table_completion",
  "classify",
  "wordsearch",
  "label_image",
] as const;

/** Server file name prefixes (DocumentExportService.PREFIXES), mirrored by the export dialog. */
const PREFIXES: Record<"pt" | "en", Record<Family, { student: string; teacher: string }>> = {
  pt: {
    test: { student: "Teste", teacher: "Critérios de correção" },
    worksheet: { student: "Ficha", teacher: "Soluções" },
    quiz: { student: "Quiz", teacher: "Respostas" },
  },
  en: {
    test: { student: "Test", teacher: "Marking guide" },
    worksheet: { student: "Worksheet", teacher: "Answer key" },
    quiz: { student: "Quiz", teacher: "Answers" },
  },
};

// Serial: later tests use the generated documents. SA_E2E_KEEP_GOING=1 runs the rest after a failure.
test.describe.configure({ mode: process.env.SA_E2E_KEEP_GOING === "1" ? "default" : "serial" });
test.skip(
  process.env.SA_E2E !== "1",
  "real-AI local stack only: set SA_E2E=1 (see the header)",
);

function psql(sql: string): string {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  const cmd = databaseUrl
    ? ["psql", databaseUrl]
    : [
        "docker",
        "exec",
        process.env.E2E_DB_CONTAINER ?? "scooli-db",
        "psql",
        "-U",
        "scooli",
        "-d",
        "scooli",
      ];
  return execFileSync(
    cmd[0],
    [...cmd.slice(1), "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

async function clerkUserId(page: Page): Promise<string> {
  const id = await page.evaluate(() => window.Clerk.user?.id ?? "");
  if (!/^user_[A-Za-z0-9]+$/.test(id))
    throw new Error(`Unexpected Clerk user id: ${id}`);
  return id;
}

/** Turns a feature flag on (or off) for the test user only. */
async function setFlag(page: Page, enabled: boolean, key = "structured_assessments") {
  const uid = await clerkUserId(page);
  psql(`INSERT INTO feature_flag_overrides (feature_flag_id, user_id, enabled)
        SELECT f.id, u.id, ${enabled} FROM feature_flags f, users u
        WHERE f.key = '${key}' AND u.clerk_user_id = '${uid}'
        ON CONFLICT (feature_flag_id, user_id) DO UPDATE SET enabled = EXCLUDED.enabled;`);
}

/**
 * Moves the test user between the free plan and Pro (database only, no Stripe). The e2e user's school
 * membership also grants Pro, so "free" suspends it and "pro" brings it back. Tests always end on "pro",
 * which is not necessarily the plan the user had before the run.
 */
async function setPlan(page: Page, plan: "free" | "pro") {
  const uid = await clerkUserId(page);
  psql(`UPDATE organization_memberships m SET status = '${plan === "free" ? "suspended" : "active"}' FROM users u
        WHERE u.clerk_user_id = '${uid}' AND m.user_id = u.id AND m.deleted_at IS NULL
          AND m.status = '${plan === "free" ? "active" : "suspended"}';`);
  const code = plan === "free" ? "free" : "pro_monthly_promo";
  // A generous credit limit on both plans: the free-plan checks here are about export, not AI quota.
  psql(`UPDATE user_subscriptions s SET plan_id = p.id, interactions_limit = 100000,
          current_period_end = GREATEST(s.current_period_end, now() + interval '30 days') FROM subscription_plans p, users u
        WHERE p.plan_code = '${code}' AND u.clerk_user_id = '${uid}' AND s.user_id = u.id
          AND s.status IN ('active', 'trialing', 'past_due');`);
}

async function shot(target: Page | Locator, name: string) {
  await target.screenshot({ path: path.join(SHOTS, `${SHOT_PREFIX}${name}.png`) });
}

function readIds(): Ids {
  if (process.env.SA_REUSE !== "1" || !fs.existsSync(IDS_FILE)) return {};
  return JSON.parse(fs.readFileSync(IDS_FILE, "utf8")) as Ids;
}

function saveIds(update: Ids) {
  const current = fs.existsSync(IDS_FILE)
    ? (JSON.parse(fs.readFileSync(IDS_FILE, "utf8")) as Ids)
    : {};
  fs.writeFileSync(IDS_FILE, JSON.stringify({ ...current, ...update }));
}

async function getDoc(api: Api, id: string): Promise<StoredDoc> {
  return api.call<StoredDoc>("GET", `/documents/${id}`);
}

async function assessment(api: Api, id: string): Promise<Assessment> {
  return JSON.parse((await getDoc(api, id)).content) as Assessment;
}

function exercises(a: Assessment): Exercise[] {
  return a.sections.flatMap((s) =>
    s.items.filter((i): i is Exercise => i.kind === "exercise"),
  );
}

function total(a: Assessment): number {
  return exercises(a).reduce((sum, e) => sum + (e.points ?? 0), 0);
}

/** Saves a document's content the way the editor's autosave does. */
async function putContent(api: Api, id: string, content: Assessment) {
  const doc = await getDoc(api, id);
  await api.call("PUT", `/documents/${id}`, {
    title: doc.title,
    content: JSON.stringify(content),
  });
}

/** Fills the normal create form and clicks Criar; returns the new document's id once the editor URL is open. */
async function startCreate(
  page: Page,
  family: Family,
  theme: string,
  year: string,
  subject: string,
): Promise<string> {
  await page.goto(`/${family}`);
  await page.getByRole("textbox", { name: "Tema" }).fill(theme);
  if (family === "worksheet")
    await page.getByRole("radio", { name: "Treinar", exact: true }).click();
  await page.getByRole("button", { name: "Ver outros anos" }).click();
  await page
    .getByRole("button", { name: `Selecionar ${year}`, exact: true })
    .click();
  const subjectButton = page.getByRole("button", {
    name: subject,
    exact: true,
  });
  if (await subjectButton.isVisible()) await subjectButton.click();
  else {
    await page.getByRole("button", { name: "Ver todas" }).click();
    await page.getByRole("combobox", { name: "Selecionar disciplina" }).click();
    await page.getByRole("option", { name: subject, exact: true }).click();
  }
  const createButton = page
    .locator("main")
    .getByRole("button", { name: /^Criar / });
  await expect(createButton).toBeEnabled({ timeout: 30_000 }); // the template loads after the subject
  await shot(page, `${family}-01-form`);
  await createButton.click();
  await page.waitForURL(new RegExp(`/${family}/[0-9a-f-]{36}`), {
    timeout: 60_000,
  });
  return page.url().split(`/${family}/`)[1].split(/[?#]/)[0];
}

async function waitGenerated(api: Api, id: string) {
  await expect
    .poll(async () => (await getDoc(api, id)).status, {
      timeout: 600_000,
      intervals: [5_000],
    })
    .not.toMatch(/^(generating|processing|pending|queued|draft)$/);
}

async function create(
  page: Page,
  api: Api,
  family: Family,
  theme: string,
  year: string,
  subject: string,
): Promise<string> {
  const id = await startCreate(page, family, theme, year, subject);
  await waitGenerated(api, id);
  return id;
}

const questionCount = (page: Page) => page.getByText(/^\d+ perguntas?$/).first();

async function openEditor(page: Page, family: Family, id: string) {
  await page.goto(`/${family}/${id}`);
  await expect(questionCount(page)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1000); // KaTeX + AE labels
}

function ids(): Required<Pick<Ids, Family>> & Ids {
  const all = JSON.parse(fs.readFileSync(IDS_FILE, "utf8")) as Ids;
  if (!all.test || !all.worksheet || !all.quiz)
    throw new Error("Run the generation test first");
  return all as Required<Pick<Ids, Family>> & Ids;
}

/** Whatever the editor shows as maths must be typeset, never `$…$`. */
async function expectNoRawMaths(page: Page) {
  const text = await page.getByRole("main").innerText();
  expect(text, "no raw $…$ maths").not.toMatch(/\$[^$\n]+\$/);
}

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

interface PdfText {
  file: string;
  pages: string[];
}
interface DocxText {
  file: string;
  text: string;
  paragraphs: number;
  omml: number;
  images: number;
  footers: string[];
}

/** Text of exported files, through support/exported_text.py (pypdf for PDFs, the XML for Word). */
function readExports<T extends PdfText | DocxText>(files: string[]): T[] {
  const out = execFileSync(
    process.env.SA_E2E_PYTHON ?? "python",
    [path.join(__dirname, "support", "exported_text.py"), ...files],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(out) as T[];
}

/** All text of a file on one line (PDF line breaks become spaces). */
function flat(f: PdfText | DocxText): string {
  const raw = "pages" in f ? f.pages.join("\n") : f.text;
  return raw.replace(/\s+/g, " ");
}

/** The longest run of plain words (no maths or markdown) in a string, for looking it up in exported text. */
function plainFragment(s: string | null | undefined, max = 40): string {
  if (!s) return "";
  const parts = s
    .replace(/\$[^$]*\$/g, "|")
    .replace(/[*_`]/g, "|")
    .split(/[|()\[\]"“”«»:;!?]/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .sort((a, b) => b.length - a.length);
  return (parts[0] ?? "").slice(0, max).trim();
}

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Opens Exportar, picks the format and saves both files via "Descarregar ambos". The dialog lists both files
 * (client-side names) right away and only generates them on that click. Returns [student, teacher].
 */
async function exportBoth(
  page: Page,
  family: Family,
  format: "pdf" | "docx",
  tag: string,
  lang: "pt" | "en" = "pt",
): Promise<{ student: string; teacher: string; names: string[] }> {
  const dialog = page.getByRole("dialog");
  if (!(await dialog.isVisible()))
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("radio", { name: format === "pdf" ? "PDF" : "Word" })
    .click();
  const ext = format === "pdf" ? ".pdf" : ".docx";
  await expect(dialog.getByText(new RegExp(`\\${ext}$`))).toHaveCount(2);
  await shot(page, `${tag}-${family}-${format}-dialog`);
  const saved: Record<string, string> = {};
  const names: string[] = [];
  const started = Date.now();
  const times: number[] = [];
  const both = new Promise<void>((resolve) => {
    const onDownload = async (d: Download) => {
      times.push(Date.now() - started);
      const name = d.suggestedFilename();
      names.push(name);
      const variant = name.startsWith(`${PREFIXES[lang][family].student} – `)
        ? "student"
        : "teacher";
      const target = path.join(SAMPLES, `${tag}-${family}-${variant}${ext}`);
      await d.saveAs(target);
      saved[variant] = target;
      if (Object.keys(saved).length === 2) {
        page.off("download", onDownload);
        resolve();
      }
    };
    page.on("download", onDownload);
  });
  await dialog.getByRole("button", { name: "Descarregar ambos" }).click();
  await both;
  expect(
    times[1] - times[0],
    "second download ≥ 300 ms after the first",
  ).toBeGreaterThanOrEqual(300);
  for (const n of names) {
    const { student, teacher } = PREFIXES[lang][family];
    expect(n, "file name prefix in the document's language").toMatch(
      new RegExp(`^(${student}|${teacher}) – .+\\${ext}$`),
    );
  }
  for (const f of Object.values(saved)) {
    const head = fs.readFileSync(f).subarray(0, 4).toString("latin1");
    expect(head).toBe(format === "pdf" ? "%PDF" : "PK\u0003\u0004");
  }
  expect(saved.student, "a student file").toBeTruthy();
  expect(saved.teacher, "a teacher file").toBeTruthy();
  return { student: saved.student, teacher: saved.teacher, names };
}

/** Student files never carry answers, explanations, criteria or AE; the teacher file carries the explanations. */
function expectStudentAndTeacher(
  a: Assessment,
  student: PdfText | DocxText,
  teacher: PdfText | DocxText,
  lang: "pt" | "en" = "pt",
) {
  const s = flat(student);
  const t = flat(teacher);
  const markers =
    lang === "en"
      ? ["Explanation:", "Marking criteria", "Learning objective", "Answer:"]
      : ["Explicação:", "Critérios de correção", "Objetivo:", "Solução:"];
  for (const m of markers) expect(s, `student file has no "${m}"`).not.toContain(m);
  for (const e of exercises(a)) {
    const explanation = plainFragment(e.explanation, 30);
    // an explanation that repeats the question ("… tem o maior numerador") says nothing the sheet does not
    if (explanation.length >= 20 && !e.prompt.includes(explanation)) {
      expect(s, `student file hides the explanation of ${e.id}`).not.toContain(explanation);
      expect(t, `teacher file explains ${e.id}`).toContain(explanation);
    }
  }
  if (exercises(a).some((e) => e.aeOutcomeIds.length > 0))
    expect(t, "teacher file lists the AE outcome").toContain(
      lang === "en" ? "Learning objective" : "Objetivo:",
    );
}

/**
 * The dialog's states, holding the entitlement and the export back so the transient ones can be captured:
 * plan refetching (no Word upsell), before the first download (no export call), exporting (spinner), ready.
 * A second download reuses the cached files.
 */
async function dialogStates(
  page: Page,
  family: Family,
  id: string,
  tag: string,
) {
  const exportCalls: string[] = [];
  page.on("request", (r) => {
    if (/\/documents\/[^/]+\/export$/.test(r.url())) exportCalls.push(r.url());
  });
  await page.route("**/entitlements/current", async (route) => {
    await new Promise((r) => setTimeout(r, 6_000));
    await route.continue();
  });
  await page.goto(`/${family}/${id}`);
  await expect(questionCount(page)).toBeVisible({ timeout: 60_000 });
  // AppBootstrapGate loads the entitlement before any page renders, so the editor's own refetch (held back
  // here) runs with the plan already known: a Pro user never sees Word disabled or the upsell meanwhile.
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: "Word" })).toBeEnabled();
  await expect(dialog.getByText("Exportar Word (Pro)")).toHaveCount(0);
  await page.waitForTimeout(500); // let the open animation finish
  await expect(dialog.getByText(/\.pdf$/)).toHaveCount(2);
  await shot(page, `${tag}-01-before-download`);
  expect(
    exportCalls,
    "nothing is generated before a download click",
  ).toHaveLength(0);

  await page.route("**/documents/*/export", async (route) => {
    await new Promise((r) => setTimeout(r, 2_500));
    await route.continue();
  });
  let downloads = 0;
  page.on("download", () => downloads++);
  await dialog.getByRole("button", { name: "Descarregar ambos" }).click();
  await expect(
    dialog.getByRole("button", { name: "A preparar os ficheiros…" }),
  ).toBeVisible();
  await shot(page, `${tag}-02-exporting`);
  await expect.poll(() => downloads, { timeout: 30_000 }).toBe(2);
  await page.waitForTimeout(500);
  await shot(page, `${tag}-03-ready`);
  expect(exportCalls).toHaveLength(1);

  await dialog
    .getByRole("button", { name: /^Descarregar: / })
    .first()
    .click();
  await expect.poll(() => downloads, { timeout: 30_000 }).toBe(3);
  expect(exportCalls, "the second download reuses the files").toHaveLength(1);
  await page.unrouteAll({ behavior: "ignoreErrors" });
}

/** Uploads a picture to a document's images exactly as the image picker does; returns its stable URL. */
async function uploadImage(page: Page, id: string, source: string | null): Promise<string> {
  const res = await page.evaluate(
    async ({ id, apiUrl, source }) => {
      let blob: Blob | null = null;
      if (source) blob = await fetch(source).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
      if (!blob) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 200;
        const g = canvas.getContext("2d") as CanvasRenderingContext2D;
        g.fillStyle = "#fff";
        g.fillRect(0, 0, 320, 200);
        g.strokeStyle = "#3b5bdb";
        g.lineWidth = 4;
        g.strokeRect(40, 30, 240, 140);
        g.beginPath();
        g.arc(160, 100, 45, 0, Math.PI * 2);
        g.stroke();
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      }
      const form = new FormData();
      form.append("file", new File([blob as Blob], "imagem.png", { type: (blob as Blob).type || "image/png" }));
      const token = await window.Clerk.session?.getToken();
      const r = await fetch(`${apiUrl}/documents/${id}/images/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      return { status: r.status, body: (await r.json()) as { image: { url: string } } };
    },
    { id, apiUrl: API_URL, source },
  );
  expect(res.status, "image upload").toBe(200);
  return res.body.image.url;
}

/** A copy of a generated document (same owner, type and content), so later tests never change the original. */
function copyOf(sourceId: string, title: string): string {
  return psql(`INSERT INTO documents (user_id, title, content, document_type, metadata, subject, grade_level,
        status, content_format, source, organization_id)
      SELECT user_id, $t$${title}$t$, content, document_type, metadata - 'revisionPending', subject, grade_level,
        'completed', 'json', source, organization_id
      FROM documents WHERE id = '${sourceId}' RETURNING id`).split(/\s+/)[0];
}

const answerNone = {
  optionIds: null,
  text: null,
  pairs: null,
  order: null,
  truth: null,
  gaps: null,
  labels: null,
  cells: null,
  classes: null,
};

function fixtureExercise(kind: (typeof KINDS)[number], id: string): Exercise {
  const base = {
    kind: "exercise" as const,
    id,
    type: kind,
    options: null,
    explanation: null,
    points: null,
    answerSpace: { kind: "none", count: null },
    media: null,
    aeCodes: [],
    aeOutcomeIds: [],
    criteria: null,
    labels: null,
    words: null,
    grid: null,
    table: null,
    categories: null,
  };
  const opts = (texts: string[], side: "left" | "right" | null = null) =>
    texts.map((text, i) => ({ id: `${side?.[0] ?? "o"}${i + 1}`, text, side }));
  switch (kind) {
    case "multiple_choice":
      return { ...base, prompt: "Qual é o órgão onde começa a digestão?", options: opts(["Estômago", "Boca", "Fígado"]), answer: { ...answerNone, optionIds: ["o2"] }, explanation: "A digestão começa na boca, com a mastigação e a saliva." };
    case "true_false":
      return { ...base, prompt: "Classifica as afirmações em verdadeiras (V) ou falsas (F).", options: opts(["O estômago produz suco gástrico.", "O intestino grosso absorve a maior parte dos nutrientes."]), answer: { ...answerNone, truth: [{ statementId: "o1", value: true, correction: null }, { statementId: "o2", value: false, correction: "É o intestino delgado." }] }, explanation: "O suco gástrico é produzido no estômago; os nutrientes são absorvidos no intestino delgado." };
    case "fill_gaps":
      return { ...base, prompt: "Na boca, os dentes fazem a ___ e a saliva começa a digerir o ___.", options: opts(["mastigação", "amido", "proteína"]), answer: { ...answerNone, gaps: ["mastigação", "amido"] } };
    case "matching":
      return { ...base, prompt: "Liga cada órgão à sua função.", options: [...opts(["Boca", "Estômago", "Intestino delgado"], "left"), ...opts(["Absorção dos nutrientes", "Mastigação", "Digestão das proteínas"], "right")], answer: { ...answerNone, pairs: [["l1", "r2"], ["l2", "r3"], ["l3", "r1"]] } };
    case "ordering":
      return { ...base, prompt: "Ordena os órgãos pela ordem por onde passam os alimentos.", options: opts(["Estômago", "Boca", "Intestino delgado", "Esófago"]), answer: { ...answerNone, order: ["o2", "o4", "o1", "o3"] } };
    case "short_answer":
      return { ...base, prompt: "Como se chama o tubo que liga a boca ao estômago?", answer: { ...answerNone, text: "Esófago." }, answerSpace: { kind: "lines", count: 2 } };
    case "long_answer":
      return { ...base, prompt: "Explica por que razão é importante mastigar bem os alimentos.", answer: { ...answerNone, text: "Facilita a digestão e a ação da saliva." }, answerSpace: { kind: "lines", count: 5 }, criteria: [{ level: "Completo", points: 0, descriptor: "Refere a digestão mecânica e a química." }] };
    case "calculation":
      return { ...base, prompt: "O intestino delgado mede cerca de $7$ m e o grosso $1{,}5$ m. Quantos metros medem juntos?", answer: { ...answerNone, text: "$7 + 1{,}5 = 8{,}5$ m" }, answerSpace: { kind: "box", count: 4 } };
    case "table_completion":
      return { ...base, prompt: "Completa a tabela.", table: { headers: ["Órgão", "Função"], rows: [["Boca", "___"], ["Estômago", "___"]] }, answer: { ...answerNone, cells: [{ row: 0, col: 1, text: "Mastigação" }, { row: 1, col: 1, text: "Digestão das proteínas" }] } };
    case "classify":
      return { ...base, prompt: "Escreve cada órgão na caixa certa.", options: opts(["Boca", "Fígado", "Estômago", "Pâncreas"]), categories: [{ id: "c1", label: "Tubo digestivo" }, { id: "c2", label: "Glândulas anexas" }], answer: { ...answerNone, classes: [{ optionId: "o1", categoryId: "c1" }, { optionId: "o2", categoryId: "c2" }, { optionId: "o3", categoryId: "c1" }, { optionId: "o4", categoryId: "c2" }] } };
    case "wordsearch":
      return { ...base, prompt: "Encontra na sopa de letras os órgãos da lista.", words: ["boca", "esófago", "estômago", "fígado", "pâncreas", "intestino"], answer: { ...answerNone } };
    case "label_image":
      return { ...base, prompt: "Escreve o nome de cada parte, guiando-te pelas pistas de cada número.", labels: [1, 2, 3].map((n) => ({ id: `l${n}`, n, hint: null, x: 0.2 + 0.3 * (n - 1), y: 0.5 })), answer: { ...answerNone, labels: [{ labelId: "l1", text: "boca" }, { labelId: "l2", text: "estômago" }, { labelId: "l3", text: "intestino" }] } };
  }
}

test.beforeAll(() => {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(SAMPLES, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
});

test.use({ viewport: { width: 1440, height: 900 }, actionTimeout: 20_000 });

test("gera teste, ficha e quiz estruturados, com imagens e objetivos AE", async ({ page, api }) => {
  test.setTimeout(1_800_000);
  await setFlag(page, true);
  await setPlan(page, "pro"); // Pro = images on
  const all = readIds();
  // The test is the benchmark brief; each brief asks for the kinds this run needs to see generated.
  const briefs: [Family, string, string, string][] = [
    [
      "test",
      "Teste sobre frações: frações equivalentes, comparação de frações e fração de uma quantidade, com escolha múltipla, verdadeiro/falso, um exercício de cálculo, uma pergunta de resposta curta e um problema de resposta longa em que o aluno explica o raciocínio",
      "4.º ano",
      "Matemática",
    ],
    [
      "worksheet",
      "Sistema digestivo: órgãos e funções. Inclui um exercício de completar espaços com banco de palavras, uma associação (liga com linhas), uma ordenação, uma tabela para completar, uma classificação em grupos, uma sopa de letras e um exercício para legendar os órgãos numa imagem",
      "6.º ano",
      "Ciências Naturais",
    ],
    [
      "quiz",
      "Quiz sobre a célula e os seres vivos",
      "5.º ano",
      "Ciências Naturais",
    ],
  ];
  const kinds: Record<string, string[]> = {};
  for (const [family, theme, year, subject] of briefs) {
    let id = all[family];
    const fresh = !id;
    if (!id) {
      id = all[family] = await create(page, api, family, theme, year, subject);
      saveIds({ [family]: id });
    }
    const doc = await getDoc(api, id);
    expect(doc.status, `${family} generation`).toBe("completed");
    const a = JSON.parse(doc.content) as Assessment;
    expect(exercises(a).length).toBeGreaterThan(2);
    kinds[family] = [...new Set(exercises(a).map((e) => e.type))];
    // (a reused test was edited by the later tests of the previous run)
    if (family === "test" && fresh) {
      expect(a.targetTotal).toBe(100);
      expect(total(a)).toBe(100);
    }
    // Images on: every picture the model asked for was resolved before the document completed.
    const media = a.sections.flatMap((s) => s.items).filter((i) => i.media);
    expect(
      media.filter((i) => !i.media?.imageRef),
      `${family}: no unresolved image placeholders`,
    ).toEqual([]);
    if (family === "worksheet") expect(media.length, "the worksheet has pictures").toBeGreaterThan(0);
    // The local DB has the whole AE curriculum: every exercise is tied to an outcome.
    expect(
      exercises(a).filter((e) => e.aeOutcomeIds.length === 0).map((e) => e.id),
      `${family}: every exercise has an AE outcome`,
    ).toEqual([]);

    await openEditor(page, family, id);
    await shot(page, `${family}-02-editor`);
    await expectNoRawMaths(page);
    if (a.targetTotal && fresh)
      await expect(
        page.getByText(`Total: ${a.targetTotal} / ${a.targetTotal} pts`),
      ).toBeVisible();
    await expect(page.getByText("AE ·").first()).toBeVisible();
    await expect(page.getByText("Objetivo indisponível")).toHaveCount(0);
    if (media.length > 0) {
      const img = page.locator("main img").first();
      await img.scrollIntoViewIfNeeded();
      await expect(img).toBeVisible();
      expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      await shot(page, `${family}-03-editor-image`);
    }
  }
  fs.writeFileSync(path.join(ARTIFACTS, "generated-kinds.json"), JSON.stringify(kinds, null, 2));
  test.info().annotations.push({ type: "generated kinds", description: JSON.stringify(kinds) });
  const generated = new Set(Object.values(kinds).flat());
  // Every kind but wordsearch/label_image comes from a plain brief; the worksheet brief asks for those two too.
  expect(KINDS.filter((k) => !generated.has(k)), "kinds the AI generated").toEqual([]);
});

test("dois separadores: o segundo termina logo a seguir ao primeiro", async ({ page, api, context }) => {
  test.setTimeout(900_000);
  await setPlan(page, "pro");
  const id = await startCreate(page, "quiz", "Quiz rápido sobre os estados físicos da água", "5.º ano", "Ciências Naturais");
  const second = await context.newPage();
  await second.goto(page.url());
  const done = async (p: Page) => {
    await expect(questionCount(p)).toBeVisible({ timeout: 600_000 });
    return Date.now();
  };
  const [t1, t2] = await Promise.all([done(page), done(second)]);
  await shot(second, "two-tabs-02-second-tab");
  test.info().annotations.push({ type: "second tab lag (ms)", description: String(t2 - t1) });
  expect(Math.abs(t2 - t1), "the second tab finishes within 3 s of the first").toBeLessThan(3_000);
  const doc = await getDoc(api, id);
  expect(doc.status).toBe("completed");
  // One generation: both tabs show the same stored document.
  const n = exercises(JSON.parse(doc.content) as Assessment).length;
  await expect(second.getByText(`${n} perguntas`).first()).toBeVisible();
  await second.close();
});

test("documento em inglês: geração, rótulos e nomes de ficheiro em inglês", async ({ page, api }) => {
  test.setTimeout(900_000);
  await setPlan(page, "pro");
  const uid = await clerkUserId(page);
  let id = readIds().english;
  if (!id) {
    const before = psql(`SELECT coalesce(content_language, '<null>') FROM users WHERE clerk_user_id = '${uid}'`);
    try {
      psql(`UPDATE users SET content_language = 'en' WHERE clerk_user_id = '${uid}'`);
      id = await create(page, api, "test", "Fractions: equivalent fractions and comparing fractions, with multiple choice, true/false and one word problem", "5.º ano", "Matemática");
    } finally {
      psql(`UPDATE users SET content_language = ${before === "<null>" ? "NULL" : `'${before}'`} WHERE clerk_user_id = '${uid}'`);
    }
    saveIds({ english: id });
  }
  const doc = await getDoc(api, id);
  expect(doc.status).toBe("completed");
  expect(doc.metadata?.contentLanguage).toBe("en");
  const a = JSON.parse(doc.content) as Assessment;
  // Written in English (a Portuguese generation would use these words in its prompts).
  const prompts = exercises(a).map((e) => e.prompt).join(" ");
  expect(prompts).not.toMatch(/\b(Qual|Indica|Calcula|Assinala|Escreve)\b/);
  // The AE outcomes exist only in Portuguese: none on an English document, in the editor or the files.
  expect(exercises(a).filter((e) => e.aeOutcomeIds.length > 0).map((e) => e.id)).toEqual([]);
  await openEditor(page, "test", id);
  await expect(page.getByText("AE ·")).toHaveCount(0);
  await expect(page.getByText(/objetivos? das AE/)).toHaveCount(0);
  await shot(page, "english-01-editor");
  const pdf = await exportBoth(page, "test", "pdf", "english", "en");
  const docx = await exportBoth(page, "test", "docx", "english", "en");
  await page.keyboard.press("Escape");
  const [sp, tp, sd, td] = readExports([pdf.student, pdf.teacher, docx.student, docx.teacher]);
  for (const f of [sp, tp, sd, td]) {
    const text = flat(f);
    expect(text, `${path.basename(f.file)}: no Portuguese labels`).not.toMatch(/\b(Nome|Turma|Explicação|Critérios|Objetivo|página \d)\b/);
  }
  expect(flat(sp)).toMatch(/Name/);
  expect(flat(sp)).toMatch(/page 1 of/i);
  expectStudentAndTeacher(a, sp, tp, "en");
  expectStudentAndTeacher(a, sd, td, "en");
  for (const f of [tp, td]) expect(flat(f), `${path.basename(f.file)}: no AE outcome`).not.toContain("Learning objective");
});

test("edição manual fica guardada", async ({ page, api }) => {
  test.setTimeout(240_000);
  const { test: id } = ids();
  const before = await assessment(api, id);
  const q1 = exercises(before).find((e) => e.type === "multiple_choice") ?? exercises(before)[0];
  const q1Points = q1.points ?? 0;
  await openEditor(page, "test", id);

  const item = page.locator(`[data-item-id="${q1.id}"]`);
  await item.click();
  await item
    .locator("div:has(> span:text-is('Cotação')) input")
    .fill(String(q1Points + 1));
  await item
    .locator("div:has(> span:text-is('Opções')) input")
    .nth(1)
    .fill("$\\frac{5}{6}$");
  await expect(page.getByText(`Total: ${total(before) + 1} / 100 pts`)).toBeVisible();
  await shot(page, "edit-01-points-option");

  const sectionItems = before.sections[0].items.length;
  await page
    .getByRole("button", { name: "Adicionar exercício" })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Resposta curta" }).click();
  const prompt = page
    .locator("div:has(> span:text-is('Enunciado')) textarea")
    .first();
  await expect(prompt).toBeVisible();
  await prompt.fill("Escreve uma fração equivalente a $\\frac{3}{4}$.");
  await shot(page, "edit-02-added");
  await expect(page.getByText("Guardado")).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await expect(questionCount(page)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1000);
  await shot(page, "edit-03-after-reload");
  const after = await assessment(api, id);
  const q1After = exercises(after).find((e) => e.id === q1.id);
  expect(q1After?.points).toBe(q1Points + 1);
  expect(q1After?.options?.[1].text).toBe("$\\frac{5}{6}$");
  expect(after.sections[0].items.length).toBe(sectionItems + 1);
  expect(
    exercises(after).some((e) =>
      e.prompt.includes("equivalente a $\\frac{3}{4}$"),
    ),
  ).toBe(true);
  await expect(page.getByText(`Total: ${total(before) + 1} / 100 pts`)).toBeVisible();
  await expectNoRawMaths(page);
});

/**
 * Final review: a matching written by hand is typed in answer order (1–A, 2–B, 3–C). The save shuffles the right
 * column, the editor takes that order once the exercise is closed, and the student file prints it, so the sheet is
 * not the key and the editor letters are the printed ones.
 */
test("associação escrita à mão: a ficha do aluno não sai pela ordem da chave", async ({ page, api }) => {
  test.setTimeout(240_000);
  await setPlan(page, "pro");
  const id = copyOf(ids().worksheet, `Associação à mão e2e ${Date.now() % 100000}`);
  await openEditor(page, "worksheet", id);
  await page.getByRole("button", { name: "Adicionar exercício" }).first().click();
  await page.getByRole("menuitem", { name: "Correspondência" }).click();
  const prompt = "Liga cada órgão do sistema digestivo à função que desempenha.";
  await page.locator("div:has(> span:text-is('Enunciado')) textarea").first().fill(prompt);
  const left = ["Boca", "Estômago", "Intestino delgado"];
  const right = ["Mastigação dos alimentos", "Digestão das proteínas", "Absorção dos nutrientes"];
  for (const [label, texts] of [["Coluna A", left], ["Coluna B", right]] as const) {
    const column = page.locator(`div:has(> span:text-is('${label}'))`).first();
    await column.getByRole("button", { name: "Adicionar item" }).click();
    for (let i = 0; i < texts.length; i++) await column.locator("input").nth(i).fill(texts[i]);
  }
  const pairs = page.locator("div:has(> span:text-is('Ligações corretas'))").first().getByRole("combobox");
  await pairs.nth(2).click();
  await page.getByRole("option", { name: "C", exact: true }).click();
  await shot(page, "hand-matching-01-typed-in-key-order");
  // while the exercise is open its fields stay where the teacher typed them
  await expect(page.getByText("Guardado")).toBeVisible({ timeout: 20_000 });
  const column = page.locator("div:has(> span:text-is('Coluna B'))").first().locator("input");
  for (let i = 0; i < right.length; i++) await expect(column.nth(i)).toHaveValue(right[i]);
  await page.getByRole("button", { name: "Concluído" }).click();

  const stored = async () => exercises(await assessment(api, id)).find((e) => e.prompt === prompt);
  await expect.poll(async () => (await stored())?.options?.length, { timeout: 30_000 }).toBe(6);
  const e = (await stored()) as Exercise;
  const storedRight = (e.options ?? []).filter((o) => o.side === "right").map((o) => o.text);
  expect(storedRight, "the saved right column is not in answer order").not.toEqual(right);
  expect([...storedRight].sort()).toEqual([...right].sort());
  // the key in the editor's teacher view follows the stored order
  const key = left.map((_, i) => `${i + 1} – ${letter(storedRight.indexOf(right[i]))}`).join(" · ");
  const item = page.locator(`[data-item-id="${e.id}"]`);
  await expect(item.getByText(key, { exact: true })).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < storedRight.length; i++)
    await expect(item.locator("li", { hasText: storedRight[i] })).toContainText(`${letter(i)}.`);
  await shot(page, "hand-matching-02-editor-after-close");

  const pdf = await exportBoth(page, "worksheet", "pdf", "hand-matching");
  await page.keyboard.press("Escape");
  const [student, teacher] = readExports<PdfText>([pdf.student, pdf.teacher]);
  const text = flat(student);
  let at = text.indexOf(plainFragment(prompt, 25));
  expect(at, "the matching is in the student file").toBeGreaterThanOrEqual(0);
  storedRight.forEach((r, i) => {
    const next = text.indexOf(r, at);
    expect(next, `right item ${letter(i)} prints in stored order`).toBeGreaterThan(at);
    expect(text.slice(Math.max(0, next - 6), next), `letter ${letter(i)} before "${r}"`).toContain(`${letter(i)}.`);
    at = next;
  });
  // the teacher key reads the same letters as the editor (the PDF text gives "1 — B 2 — C 3 — A", dots after)
  expect(flat(teacher)).toContain(key.replaceAll(" – ", " — ").replaceAll(" · ", " "));
});

test("conversa: pergunta 3 mais fácil e com 10 pontos (reequilibra o total)", async ({
  page,
  api,
}) => {
  test.setTimeout(420_000);
  const { test: id } = ids();
  await openEditor(page, "test", id);
  const input = page.getByPlaceholder("Pede uma alteração…");
  await input.fill("Torna a pergunta 3 mais fácil e dá-lhe 10 pontos.");
  await input.press("Enter");
  await expect(
    page.getByText("O assistente está a rever o documento…"),
  ).toBeVisible({ timeout: 15_000 });
  await shot(page, "chat-01-running");
  await expect(
    page.getByText("O assistente está a rever o documento…"),
  ).toBeHidden({ timeout: 360_000 });
  await page.waitForTimeout(1500);
  await shot(page, "chat-02-reply");
  const a = await assessment(api, id);
  expect(exercises(a)[2].points).toBe(10);
  expect(total(a)).toBe(100);
  await expect(page.getByText("Total: 100 / 100 pts")).toBeVisible();
  const reply = (await page.locator("aside").last().innerText()).slice(-1200);
  test.info().annotations.push({ type: "chat reply", description: reply });
  fs.writeFileSync(path.join(ARTIFACTS, "chat-reply.txt"), reply);
  await expectNoRawMaths(page);
});

test("conversa: acrescenta uma imagem à pergunta 1", async ({ page, api }) => {
  test.setTimeout(420_000);
  await setPlan(page, "pro");
  const { quiz: id } = ids();
  const before = await assessment(api, id);
  const first = exercises(before)[0];
  await openEditor(page, "quiz", id);
  const input = page.getByPlaceholder("Pede uma alteração…");
  await input.fill("Acrescenta uma imagem à pergunta 1.");
  await input.press("Enter");
  await expect(
    page.getByText("O assistente está a rever o documento…"),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText("O assistente está a rever o documento…"),
  ).toBeHidden({ timeout: 360_000 });
  const after = await assessment(api, id);
  const changed = exercises(after).find((e) => e.id === first.id);
  expect(changed?.media?.imageRef, "the new picture is resolved, not a placeholder").toBeTruthy();
  const img = page.locator(`[data-item-id="${first.id}"] img`);
  await expect(img).toBeVisible({ timeout: 30_000 });
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await page.waitForTimeout(800);
  await shot(page, "chat-03-image-added");
});

test("conversa que falha mantém o texto, também à segunda vez", async ({ page }) => {
  const { quiz: id } = ids();
  await openEditor(page, "quiz", id);
  await page.route("**/documents/*/chat", (route) => route.fulfill({ status: 500, body: "{}" }));
  const input = page.getByPlaceholder("Pede uma alteração…");
  await input.fill("Torna a pergunta 1 mais difícil.");
  // twice: the second failure shows the same error, and the text must still stay
  for (let i = 0; i < 2; i++) {
    const failed = page.waitForResponse((r) => /\/documents\/[^/]+\/chat$/.test(r.url()));
    await input.press("Enter");
    await failed;
    await expect(page.getByText("O assistente não conseguiu responder. Tenta outra vez.").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500);
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue("Torna a pergunta 1 mais difícil.");
  }
  await shot(page, "chat-04-failed-keeps-text");
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("versão do aluno", async ({ page }) => {
  const { test: id } = ids();
  await openEditor(page, "test", id);
  await page.getByRole("button", { name: "Versão do aluno" }).click();
  await page.waitForTimeout(500);
  await shot(page, "student-view");
  const text = await page.getByRole("main").innerText();
  expect(text).not.toMatch(/Explicação|Solução|Critérios|AE ·/);
});

test("exportar como Pro: PDF e Word, ordem das opções igual no editor, no aluno e nos critérios", async ({ page, api }) => {
  test.setTimeout(400_000);
  await setPlan(page, "pro");
  const all = ids();
  for (const family of ["test", "worksheet", "quiz"] as Family[]) {
    const a = await assessment(api, all[family]);
    await openEditor(page, family, all[family]);
    const pdf = await exportBoth(page, family, "pdf", "pro");
    const docx = await exportBoth(page, family, "docx", "pro");
    await page.keyboard.press("Escape");
    const [sp, tp, sd, td] = readExports([pdf.student, pdf.teacher, docx.student, docx.teacher]);
    expectStudentAndTeacher(a, sp, tp);
    expectStudentAndTeacher(a, sd, td);
    for (const f of [sp, tp])
      expect(flat(f), "Pro files carry no free-plan footer").not.toContain("Gerado em scooli.app");

    // Option order is stored at write time: the editor letter, the student file and the key agree.
    let checked = 0;
    for (const e of exercises(a).filter((x) => x.type === "multiple_choice")) {
      const opts = e.options ?? [];
      const correct = opts.findIndex((o) => e.answer.optionIds?.includes(o.id));
      expect(correct, `${e.id} has a correct option`).toBeGreaterThanOrEqual(0);
      const marked = page.locator(`[data-item-id="${e.id}"] span:has(> svg.lucide-check)`);
      await expect(marked, `${e.id}: the editor marks one option`).toHaveCount(1);
      expect((await marked.innerText()).trim(), `${e.id}: editor letter`).toMatch(
        new RegExp(`^\\(${letter(correct)}\\)`),
      );
      // The key line ("B – …") follows the prompt in the teacher files, maths options or not.
      for (const f of [tp, td]) {
        const text = flat(f);
        const at = text.indexOf(plainFragment(e.prompt, 25));
        expect(at, `${e.id} in ${path.basename(f.file)}`).toBeGreaterThanOrEqual(0);
        expect(text.slice(at).match(/(?:^| )([A-H]) – /)?.[1], `${e.id}: key letter in ${path.basename(f.file)}`).toBe(
          letter(correct),
        );
      }
      checked++;
      // Maths prints as pictures, so only plain options can be followed through the student files' text.
      if (opts.some((o) => /[$*]/.test(o.text) || o.text.length < 3)) continue;
      for (const f of [sp, sd]) {
        const text = flat(f);
        let at = text.indexOf(plainFragment(e.prompt, 25));
        expect(at, `${e.id} in ${path.basename(f.file)}`).toBeGreaterThanOrEqual(0);
        opts.forEach((o, i) => {
          const next = text.indexOf(o.text.slice(0, 30), at);
          expect(next, `${e.id}: option ${letter(i)} prints in stored order (${path.basename(f.file)})`).toBeGreaterThan(at);
          expect(text.slice(Math.max(0, next - 6), next), `${e.id}: letter ${letter(i)} before the option`).toContain(letter(i));
          at = next;
        });
      }
      for (const f of [tp, td])
        expect(flat(f), `${e.id}: key line in ${path.basename(f.file)}`).toContain(
          `${letter(correct)} – ${opts[correct].text.slice(0, 30)}`,
        );
    }
    if (family !== "worksheet")
      expect(checked, `${family}: multiple-choice exercises checked`).toBeGreaterThan(0);
  }
});

test("todos os tipos de exercício: editor, versão do aluno e exportação", async ({ page, api }) => {
  test.setTimeout(600_000);
  await setPlan(page, "pro");
  const all = ids();
  let id = readIds().kinds;
  if (!id) {
    // One document with every kind: the generated ones first (the worksheet's own, then the test's and the
    // quiz's), then a fixture for any kind the AI did not produce in this run.
    id = copyOf(all.worksheet, `Todos os tipos e2e ${Date.now() % 100000}`);
    const ws = await assessment(api, all.worksheet);
    const others = [...exercises(await assessment(api, all.test)), ...exercises(await assessment(api, all.quiz))];
    const have = new Set(exercises(ws).map((e) => e.type));
    const added: Exercise[] = [];
    for (const kind of KINDS) {
      if (have.has(kind)) continue;
      const found = others.find((e) => e.type === kind);
      added.push(found ? { ...found, id: `k${added.length + 1}`, aeOutcomeIds: [] } : fixtureExercise(kind, `k${added.length + 1}`));
    }
    // Pictures belong to their document: give the copy its own (the export only embeds the document's images).
    for (const item of [...ws.sections.flatMap((s) => s.items), ...added]) {
      if (!item.media?.imageRef && !(item.kind === "exercise" && item.type === "label_image")) continue;
      item.media = {
        imageRef: await uploadImage(page, id, item.media?.imageRef ?? null),
        placeholder: item.media?.placeholder ?? { query: "Diagrama simples do sistema digestivo", alt: "Sistema digestivo" },
      };
    }
    if (added.length) ws.sections.push({ id: "gk", title: "Outros tipos", instructions: null, items: added });
    ws.targetTotal = null;
    for (const e of exercises(ws)) e.points = null;
    await putContent(api, id, ws);
    saveIds({ kinds: id });
  }
  const a = await assessment(api, id);
  const found = KINDS.map((k) => [k, exercises(a).find((e) => e.type === k)] as const);
  expect(found.filter(([, e]) => !e).map(([k]) => k), "every kind is in the document").toEqual([]);
  const byKind = new Map(found.filter((f): f is readonly [(typeof KINDS)[number], Exercise] => !!f[1]));
  const ws = exercises(a).find((e) => e.type === "wordsearch");
  expect((ws?.grid as { rows: string[] } | null)?.rows.length, "the server built the word grid").toBeGreaterThan(5);

  await openEditor(page, "worksheet", id);
  await shot(page, "kinds-01-editor");
  for (const [kind, e] of byKind) {
    const item = page.locator(`[data-item-id="${e.id}"]`);
    await item.scrollIntoViewIfNeeded();
    await shot(item, `kinds-1440-${kind}-teacher`);
    await item.click();
    await expect(item.getByRole("button", { name: "Concluído" })).toBeVisible();
    await page.waitForTimeout(300);
    await shot(item, `kinds-1440-${kind}-edit`);
    await item.getByRole("button", { name: "Concluído" }).click();
  }
  await page.getByRole("button", { name: "Versão do aluno" }).click();
  await page.waitForTimeout(500);
  const studentText = await page.getByRole("main").innerText();
  expect(studentText).not.toMatch(/Explicação|Solução|Critérios|AE ·|Banco de palavras.*✓/);
  for (const [kind, e] of byKind) {
    const item = page.locator(`[data-item-id="${e.id}"]`);
    await item.scrollIntoViewIfNeeded();
    await shot(item, `kinds-1440-${kind}-student`);
  }
  await page.getByRole("button", { name: "Versão do aluno" }).click();

  const pdf = await exportBoth(page, "worksheet", "pdf", "kinds");
  const docx = await exportBoth(page, "worksheet", "docx", "kinds");
  await page.keyboard.press("Escape");
  const [sp, tp, sd, td] = readExports<PdfText & DocxText>([pdf.student, pdf.teacher, docx.student, docx.teacher]);
  expectStudentAndTeacher(a, sp, tp);
  expectStudentAndTeacher(a, sd, td);
  for (const [kind, e] of byKind) {
    const fragment = plainFragment(e.prompt, 25);
    for (const f of [sp, sd]) expect(flat(f), `${kind} prints in ${path.basename(f.file)}`).toContain(fragment);
  }
  for (const w of (ws?.words as string[] | null) ?? [])
    expect(flat(sp).toUpperCase(), `word list has ${w}`).toContain(w.toUpperCase());
  expect(sd.images + td.images, "pictures embedded in Word").toBeGreaterThan(0);
  const labelAnswer = ((byKind.get("label_image")?.answer.labels as { text: string }[] | null) ?? [])[0]?.text;
  if (labelAnswer) expect(flat(tp), "label_image key").toContain(`1 — ${labelAnswer}`);
});

test("matemática: o corpus escolar aparece formatado no editor, PDF e Word", async ({ page, api }) => {
  test.setTimeout(300_000);
  await setPlan(page, "pro");
  const corpus = fs
    .readFileSync(path.resolve(__dirname, "../src/components/blocks/__fixtures__/school-latex-corpus.txt"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  let id = readIds().maths;
  if (!id) {
    id = copyOf(ids().test, `Matemática corpus e2e ${Date.now() % 100000}`);
    const a = await assessment(api, id);
    a.targetTotal = null;
    // At most 30 items per group (schema): groups of 20.
    a.sections = Array.from({ length: Math.ceil(corpus.length / 20) }, (_, g) => ({
      id: `g${g + 1}`,
      title: `Corpus ${g + 1}`,
      instructions: null,
      items: corpus
        .slice(g * 20, g * 20 + 20)
        .map((tex, i) => ({ ...fixtureExercise("short_answer", `m${g * 20 + i + 1}`), prompt: `Fórmula ${g * 20 + i + 1}: $${tex}$` })),
    }));
    await putContent(api, id, a);
    saveIds({ maths: id });
  }
  await openEditor(page, "test", id);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  expect(await page.locator("main .katex").count()).toBeGreaterThanOrEqual(corpus.length);
  await shot(page, "maths-01-editor");
  const pdf = await exportBoth(page, "test", "pdf", "maths");
  const docx = await exportBoth(page, "test", "docx", "maths");
  await page.keyboard.press("Escape");
  const [sp, tp, sd] = readExports<PdfText & DocxText>([pdf.student, pdf.teacher, docx.student]);
  for (const f of [sp, tp, sd]) {
    const text = flat(f);
    expect(text, `${path.basename(f.file)}: no raw LaTeX`).not.toMatch(/\\(frac|sqrt|begin|left|right|cdot|times)\b/);
    expect(text, `${path.basename(f.file)}: no "#" for a missing glyph`).not.toContain("#");
  }
  expect(sd.omml, "Word keeps most formulas as editable equations").toBeGreaterThan(corpus.length / 2);
});

test("diálogo de exportação: estados (desktop)", async ({ page }) => {
  test.setTimeout(180_000);
  await setPlan(page, "pro");
  await dialogStates(page, "test", ids().test, "dialog-1440");
});

test("exportar como grátis: Word com upsell, PDFs com rodapé em todas as páginas", async ({
  page,
  api,
}) => {
  test.setTimeout(300_000);
  const all = ids();
  try {
    // The e2e user's school membership is re-activated on every full page load (AppBootstrapGate picks an
    // organisation), so the free plan is set after loading and the other documents are opened client-side.
    await setPlan(page, "pro");
    await openEditor(page, "test", all.test);
    await setPlan(page, "free");
    // Client side, the free entitlement must reach the editor even though the membership sync can flip the
    // server back to Pro between requests: answer /entitlements/current as the free plan does.
    await page.route("**/entitlements/current", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), isPro: false },
      });
    });
    // Any request can re-sync the membership from the session's organisation claim; suspend it again right
    // before each export goes out, so the export itself always runs as a free user.
    const uid = await clerkUserId(page);
    await page.route("**/documents/*/export", async (route) => {
      psql(`UPDATE organization_memberships m SET status = 'suspended' FROM users u
            WHERE u.clerk_user_id = '${uid}' AND m.user_id = u.id AND m.status = 'active';`);
      await route.continue();
    });
    for (const [i, family] of (
      ["test", "worksheet", "quiz"] as Family[]
    ).entries()) {
      if (i > 0) {
        await page.evaluate(
          (url) =>
            (
              window as unknown as {
                next: { router: { push: (u: string) => void } };
              }
            ).next.router.push(url),
          `/${family}/${all[family]}`,
        );
        await expect(questionCount(page)).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(1000);
      }
      await page.getByRole("button", { name: "Exportar", exact: true }).click();
      const dialog = page.getByRole("dialog");
      if (i === 0) {
        // The page still thinks Pro, the server says free: the Word download comes back 403 and the dialog
        // shows the upsell instead of the files.
        await dialog.getByRole("radio", { name: "Word" }).click();
        await dialog.getByRole("button", { name: "Descarregar ambos" }).click();
        await expect(dialog.getByText("Exportar Word (Pro)")).toBeVisible({
          timeout: 30_000,
        });
        await page.waitForTimeout(500);
        await shot(page, "free-01-word-403-upsell");
      } else {
        // Remounted editor fetched the free entitlement: Word is disabled next to the upsell.
        await expect(
          dialog.getByRole("radio", { name: "Word" }),
        ).toBeDisabled();
        await expect(dialog.getByText("Exportar Word (Pro)")).toBeVisible();
      }
      const files = await exportBoth(page, family, "pdf", "free");
      await page.keyboard.press("Escape");
      const a = await assessment(api, all[family]);
      const [s, t] = readExports<PdfText>([files.student, files.teacher]);
      expectStudentAndTeacher(a, s, t);
      for (const f of [s, t])
        f.pages.forEach((p, n) =>
          expect(p, `${path.basename(f.file)} page ${n + 1} has the free-plan footer`).toContain("Gerado em scooli.app"),
        );
    }
  } finally {
    await setPlan(page, "pro");
  }
});

test("exportar durante a conversa mostra a espera", async ({ page }) => {
  test.setTimeout(420_000);
  const { quiz: id } = ids();
  await openEditor(page, "quiz", id);
  const input = page.getByPlaceholder("Pede uma alteração…");
  await input.fill("Acrescenta uma pergunta de verdadeiro ou falso no fim.");
  await input.press("Enter");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Descarregar ambos" }).click();
  await expect(
    dialog.getByText("Espera que a conversa termine de editar o quiz."),
  ).toBeVisible();
  await page.waitForTimeout(500); // let the open animation finish
  await shot(page, "busy-01-during-chat");
  // Once the chat is over the message goes away and the same click downloads both files.
  await expect(
    dialog.getByText("Espera que a conversa termine de editar o quiz."),
  ).toBeHidden({ timeout: 360_000 });
  await shot(page, "busy-02-after-chat");
  const files = await exportBoth(page, "quiz", "pdf", "busy");
  expect(files.student && files.teacher).toBeTruthy();
});

test("documento markdown continua no editor antigo", async ({ page, api }) => {
  test.setTimeout(600_000);
  const all = ids();
  try {
    await setFlag(page, false);
    let markdownId = all.markdown;
    if (!markdownId) {
      await page.goto("/quiz");
      await page
        .getByRole("textbox", { name: "Tema" })
        .fill("Quiz rápido sobre frações equivalentes");
      await page
        .getByRole("button", { name: "Matemática", exact: true })
        .click();
      const createButton = page
        .locator("main")
        .getByRole("button", { name: /^Criar / });
      await expect(createButton).toBeEnabled({ timeout: 30_000 });
      await createButton.click();
      await page.waitForURL(/\/quiz\/[0-9a-f-]{36}/, { timeout: 60_000 });
      const created = page.url().split("/quiz/")[1].split(/[?#]/)[0];
      markdownId = created;
      saveIds({ markdown: created });
      await waitGenerated(api, created);
    }
    const doc = await getDoc(api, markdownId);
    expect(doc.contentFormat ?? "markdown").not.toBe("json");
    await page.goto(`/quiz/${markdownId}`);
    await page.waitForTimeout(4000);
    await expect(page.getByText(/^\d+ perguntas?$/)).toHaveCount(0);
    await page.getByRole("button", { name: "Exportar" }).click();
    await expect(
      page.getByRole("menuitem", { name: "Exportar como PDF" }),
    ).toBeVisible();
    await shot(page, "markdown-old-download");
    await page.keyboard.press("Escape");
  } finally {
    await setFlag(page, true);
  }
});

test("imagem do exercício entra na exportação; URL alheio fica de fora", async ({
  page,
  api,
}) => {
  test.setTimeout(180_000);
  await setPlan(page, "pro");
  const id = copyOf(ids().worksheet, `Ficha (imagens e2e) ${Date.now() % 100000}`);
  await openEditor(page, "worksheet", id);
  const own = await uploadImage(page, id, null);
  const content = await assessment(api, id);
  const items = content.sections.flatMap((s) => s.items);
  for (const item of items) item.media = null;
  items[0].media = { imageRef: own, placeholder: null };
  // Not Scooli's own image of this document: the manual save drops it, the export never fetches it.
  items[1].media = { imageRef: "http://127.0.0.1:9/foreign.png", placeholder: null };
  await putContent(api, id, content);
  const saved = (await assessment(api, id)).sections.flatMap((s) => s.items);
  expect(saved[0].media?.imageRef).toBe(own);
  expect(saved[1].media?.imageRef ?? null).toBeNull();

  await openEditor(page, "worksheet", id);
  await expect(
    page.getByRole("img", { name: "Imagem do exercício" }).first(),
  ).toBeVisible();
  await shot(page, "image-01-editor");
  const files = await exportBoth(page, "worksheet", "pdf", "image");
  const docx = await exportBoth(page, "worksheet", "docx", "image");
  await page.keyboard.press("Escape");
  const [sd] = readExports<DocxText>([docx.student]);
  expect(sd.images, "exactly the document's own picture").toBe(1);
  expect(files.student).toBeTruthy();
});

test("sugestão de revisão: aceitar um exercício", async ({ page, api }) => {
  test.setTimeout(600_000);
  await setPlan(page, "pro");
  const id = copyOf(ids().worksheet, "Ficha (sugestão e2e)");
  // What a replan stores for a lazy revision; opening the document starts it.
  const ctx = {
    slotId: null,
    trigger: "replan",
    summary: "A aula ficou a meio: a ficha passa a ter mais um exercício.",
    newTopicTitle: null,
    newDescription: null,
    outcomeTexts: [],
    addition:
      "Acrescenta um exercício de verdadeiro ou falso sobre o tema e ajusta o enunciado de um exercício existente.",
    brokenLesson: null,
  };
  psql(`UPDATE documents SET metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object('revisionPending', $j$${JSON.stringify(ctx)}$j$::jsonb) WHERE id = '${id}'`);
  const before = await assessment(api, id);

  await openEditor(page, "worksheet", id);
  await expect(
    page.getByRole("button", { name: "Rever alterações" }),
  ).toBeVisible({ timeout: 480_000 });
  await shot(page, "suggestion-01-bar");
  await page.getByRole("button", { name: "Rever alterações" }).click();
  const sheet = page.getByRole("dialog");
  const exerciseRows = sheet
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: /^Exercício \d+$/ }) });
  await expect(exerciseRows.first()).toBeVisible({ timeout: 30_000 });
  // An added exercise when there is one (badge "Nova"), otherwise the first changed one.
  const added = exerciseRows.filter({ hasText: "Nova" });
  const target =
    (await added.count()) > 0 ? added.first() : exerciseRows.first();
  const label = await target.getByRole("checkbox").getAttribute("aria-label");
  await page.waitForTimeout(500);
  await shot(page, "suggestion-02-review");
  await sheet.getByRole("button", { name: "Nenhuma" }).click();
  await sheet.getByRole("checkbox", { name: label ?? "", exact: true }).click();
  await sheet.getByRole("button", { name: "Aplicar 1 alteração" }).click();
  await expect(page.getByText("Alterações aplicadas")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: "Rever alterações" }),
  ).toBeHidden();
  await shot(page, "suggestion-03-applied");

  // Exactly one exercise differs from the document before the suggestion.
  const after = await assessment(api, id);
  const key = (e: Exercise) => JSON.stringify(e, Object.keys(e).sort());
  const old = new Map(exercises(before).map((e) => [e.id, key(e)]));
  const differing = exercises(after).filter((e) => old.get(e.id) !== key(e));
  expect(differing).toHaveLength(1);
  await expect(
    page.getByText(`${exercises(after).length} perguntas`).first(),
  ).toBeVisible();
});

test("partilhar, moderar e reutilizar: sem escola nem turma, com imagens e língua", async ({
  page,
  api,
}) => {
  test.setTimeout(400_000);
  await setPlan(page, "pro");
  await setFlag(page, true, "document_review");
  // The English test, with a picture of its own and the author's school and class filled in.
  const english = readIds().english ?? ids().english;
  if (!english) throw new Error("Run the English document test first");
  const title = `Shared test e2e ${Date.now() % 100000}`;
  const id = copyOf(english, title);
  const picture = await uploadImage(page, id, null);
  const content = await assessment(api, id);
  const firstExercise = exercises(content)[0];
  firstExercise.media = { imageRef: picture, placeholder: { query: "Shapes split into equal parts", alt: "Shapes in equal parts" } };
  content.header = { ...content.header, school: "Escola Básica e2e", gradeClass: "5.º B" };
  await putContent(api, id, content);

  await openEditor(page, "test", id);
  await page.getByRole("button", { name: "Partilhar" }).click();
  const modal = page.getByRole("dialog");
  const community = modal.getByRole("button", {
    name: /Biblioteca comunitária/,
  });
  if (await community.isVisible().catch(() => false)) await community.click();
  await page.waitForTimeout(400);
  await shot(page, "share-01-modal");
  await modal.getByRole("button", { name: "Partilhar recurso" }).click();
  await expect(page.getByText(/enviado para revisão/)).toBeVisible({
    timeout: 30_000,
  });

  const mine = await api.call<
    {
      id: string;
      title: string;
      status: string;
      contentFormat: string;
      content: string;
    }[]
  >("GET", "/community/resources/mine");
  const resource = mine.find((r) => r.title === title);
  if (!resource) throw new Error("the shared resource is not listed");
  expect(resource.status).toBe("PENDING");
  expect(resource.contentFormat).toBe("json");
  // The stored JSON is shared, without the author's school and class.
  expect(resource.content).not.toContain("Escola Básica e2e");
  expect(resource.content).not.toContain("5.º B");
  const sharedJson = JSON.parse(resource.content) as Assessment;
  expect(sharedJson.header.school).toBeNull();
  expect(sharedJson.header.gradeClass).toBeNull();
  expect(sharedJson.sections).toEqual((await assessment(api, id)).sections);
  expect(psql(`SELECT content_language FROM shared_resources WHERE id = '${resource.id}'`)).toBe("en");
  // /admin is gated by the Clerk role claim: approve as processModerationAction does.
  expect(
    psql(
      `SELECT count(*) FROM moderation_queue WHERE resource_id = '${resource.id}'`,
    ),
  ).toBe("1");
  psql(`UPDATE moderation_queue SET action = 'APPROVE', reviewed_at = now() WHERE resource_id = '${resource.id}';
        UPDATE shared_resources SET status = 'APPROVED', approved_at = now(), moderated_at = now()
        WHERE id = '${resource.id}'`);

  await page.goto("/community");
  const card = page
    .locator("div")
    .filter({ hasText: title })
    .filter({ has: page.getByRole("button", { name: "Usar" }) })
    .last();
  await card.getByRole("button", { name: "Pré-visualizar" }).click();
  const preview = page.getByRole("dialog").locator("[data-assessment-preview]");
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText("schemaVersion");
  await expect(preview).not.toContainText("Escola Básica e2e");
  await page.waitForTimeout(500);
  await shot(page, "share-02-community-preview");
  await page.keyboard.press("Escape");
  await card.getByRole("button", { name: "Usar" }).click();
  await expect(page.getByText("Adicionado aos teus documentos")).toBeVisible({
    timeout: 30_000,
  });

  const copy = psql(
    `SELECT id FROM documents WHERE shared_resource_id = '${resource.id}' AND id <> '${id}'`,
  );
  expect(
    psql(
      `SELECT document_type || '|' || content_format || '|' || coalesce(metadata->>'contentLanguage', '') FROM documents WHERE id = '${copy}'`,
    ),
  ).toBe("test|json|en");
  const reused = await assessment(api, copy);
  expect(reused.header.school).toBeNull();
  expect(reused.header.gradeClass).toBeNull();
  const ref = exercises(reused)[0].media?.imageRef ?? "";
  expect(ref, "the picture was copied to the reused document").toContain(copy);
  await openEditor(page, "test", copy);
  await expect(page.locator(`[data-item-id="${exercises(reused)[0].id}"] img`)).toBeVisible();
  // the reused copy is the teacher's own document, not the published one
  await expect(page.getByRole("button", { name: /Publicado|Em revisão/ })).toHaveCount(0);
  await shot(page, "share-03-reused-editor");
  const files = await exportBoth(page, "test", "docx", "reused", "en");
  await page.keyboard.press("Escape");
  const [sd] = readExports<DocxText>([files.student]);
  expect(sd.images, "the reused copy exports its picture").toBeGreaterThan(0);
  expect(sd.text).not.toContain("Escola Básica e2e");
});

/** Final review: without the flag, a structured resource would open in no editor: not listed, not reusable. */
test("comunidade sem a flag: os recursos estruturados não aparecem nem se reutilizam", async ({ page, api }) => {
  await setPlan(page, "pro");
  const row = psql(`SELECT id || '|' || title FROM shared_resources WHERE status = 'APPROVED' AND content_format = 'json'
      AND library_scope = 'community' AND title LIKE 'Shared test e2e %' ORDER BY created_at DESC LIMIT 1`);
  if (!row) throw new Error("Run the share test first");
  const [resourceId, title] = row.split("|");
  const listed = async () => {
    const res = await api.call<unknown>("GET", `/community/resources?search=${encodeURIComponent(title)}`);
    return JSON.stringify(res).includes(resourceId);
  };
  try {
    await setFlag(page, false);
    expect(await listed(), "hidden from discovery without the flag").toBe(false);
    await expect(api.call("POST", `/community/resources/${resourceId}/reuse`)).rejects.toThrow(/→ 404/);
  } finally {
    await setFlag(page, true);
  }
  expect(await listed(), "listed again with the flag").toBe(true);
});

for (const [width, height] of [
  [390, 844],
  [360, 780],
]) {
  test.describe(`telemóvel ${width}×${height}`, () => {
    test.use({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    test("lista, exercício, conversa e exportar", async ({ page, api }) => {
      test.setTimeout(240_000);
      const { test: id } = ids();
      const a = await assessment(api, id);
      await openEditor(page, "test", id);
      await shot(page, `phone-${width}-01-list`);
      expect(await noOverflow(page)).toBe(true);

      await page.locator(`[data-item-id="${exercises(a)[0].id}"]`).tap();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(500); // let the open animation finish
      await shot(page, `phone-${width}-02-exercise-sheet`);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Concluído" })
        .tap();
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.getByRole("button", { name: "Conversa" }).tap();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(500); // let the open animation finish
      await shot(page, `phone-${width}-03-chat-sheet`);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.getByRole("button", { name: "Exportar", exact: true }).tap();
      const sheet = page.getByRole("dialog");
      await expect(sheet.getByText(/\.pdf$/)).toHaveCount(2, {
        timeout: 60_000,
      });
      await page.waitForTimeout(500); // let the open animation finish
      await shot(page, `phone-${width}-04-export-sheet`);
      expect(await noOverflow(page)).toBe(true);
      const download = page.waitForEvent("download");
      await sheet.getByRole("button", { name: /^Descarregar: Teste/ }).tap();
      expect((await download).suggestedFilename()).toMatch(/^Teste – .*\.pdf$/);
    });

    test("cada tipo de exercício: vista e folha de edição", async ({ page, api }) => {
      test.setTimeout(300_000);
      const id = ids().kinds;
      if (!id) throw new Error("Run the every-kind test first");
      const a = await assessment(api, id);
      await openEditor(page, "worksheet", id);
      for (const kind of KINDS) {
        const e = exercises(a).find((x) => x.type === kind);
        if (!e) throw new Error(`no ${kind} in the every-kind document`);
        const item = page.locator(`[data-item-id="${e.id}"]`);
        await item.scrollIntoViewIfNeeded();
        await shot(item, `kinds-${width}-${kind}-view`);
        expect(await noOverflow(page), `${kind} view fits ${width} px`).toBe(true);
        await item.tap();
        const sheet = page.getByRole("dialog");
        await expect(sheet).toBeVisible();
        await page.waitForTimeout(500);
        await shot(page, `kinds-${width}-${kind}-sheet`);
        await sheet.evaluate((el) => {
          // the sheet's own scrolling body (the tallest scroller), never a textarea inside it
          const scroller = [el, ...el.querySelectorAll("*")]
            .filter((n) => n.tagName !== "TEXTAREA" && n.scrollHeight > n.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(n).overflowY))
            .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
          scroller?.scrollTo(0, scroller.scrollHeight);
        });
        await page.waitForTimeout(300);
        await shot(page, `kinds-${width}-${kind}-sheet-end`);
        expect(await noOverflow(page), `${kind} sheet fits ${width} px`).toBe(true);
        await sheet.getByRole("button", { name: "Concluído" }).tap();
        await expect(sheet).toBeHidden();
      }
    });

    test("diálogo de exportação: estados", async ({ page }) => {
      test.setTimeout(180_000);
      await dialogStates(page, "test", ids().test, `dialog-${width}`);
    });
  });
}

test("limite de exportações: a 21.ª num minuto recebe 429 e o diálogo explica", async ({ page, api }) => {
  test.setTimeout(240_000);
  await setPlan(page, "pro");
  const { quiz: id } = ids();
  await openEditor(page, "quiz", id);
  // Spend the minute's allowance through the API (each attempt counts), then try once from the dialog.
  let limited = false;
  for (let i = 0; i < 25 && !limited; i++) {
    try {
      await api.call("POST", `/documents/${id}/export`, { format: "pdf" });
    } catch (err) {
      expect(String(err)).toContain("429");
      limited = true;
    }
  }
  expect(limited, "the API answers 429 within 21 attempts").toBe(true);
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Descarregar ambos" }).click();
  await expect(
    dialog.getByText("Fizeste muitas exportações seguidas. Espera um minuto e tenta outra vez."),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(400);
  await shot(page, "rate-limit-01-dialog");
  // Leave the allowance free again for whatever runs next.
  await page.waitForTimeout(61_000);
});
