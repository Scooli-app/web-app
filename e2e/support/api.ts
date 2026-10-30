import type { APIRequestContext, Page } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8080";

/** Prefix on every turma the tests create, so cleanup never touches anything else. */
const E2E_PREFIX = "[e2e]";

type SlotType = "LESSON" | "EXERCISE" | "REVIEW" | "ASSESSMENT";

interface Slot {
  id: string;
  slotDate: string;
  slotType: string;
  sequenceNumber: number;
  topicTitle: string | null;
  status: string;
}

interface Timetable {
  id: string;
  title: string;
}

interface LessonDocument {
  documentId: string;
  documentRole: string;
  status: string;
}

/** Today's date in Lisbon (what the browser, set to Europe/Lisbon, calls "today"). */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** ISO weekday, 1 = Monday … 7 = Sunday. */
function isoDayOfWeek(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

/**
 * The chalkboard API as the signed-in test user. Tokens are the browser's own Clerk session
 * tokens (they last a minute), fetched fresh for every call.
 */
export class Api {
  constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
  ) {}

  private async token(): Promise<string> {
    // The page is signed in on an app page (see the fixtures), so Clerk is loaded.
    await this.page.waitForFunction(() => window.Clerk?.loaded);
    const token = await this.page.evaluate(() => window.Clerk.session?.getToken() ?? null);
    if (!token) throw new Error("No Clerk session on this page: was it signed in (support/auth.ts)?");
    return token;
  }

  async call<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
    const response = await this.request.fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await this.token()}`, "Content-Type": "application/json" },
      data: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok()) {
      throw new Error(`${method} ${path} → ${response.status()} ${await response.text()}`);
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  listTimetables(): Promise<Timetable[]> {
    return this.call<Timetable[]>("GET", "/timetable");
  }

  listLessons(timetableId: string): Promise<Slot[]> {
    return this.call<Slot[]>("GET", `/timetable/${timetableId}/lessons`);
  }

  listLessonDocuments(timetableId: string, lessonId: string): Promise<LessonDocument[]> {
    return this.call<LessonDocument[]>("GET", `/timetable/${timetableId}/lessons/${lessonId}/documents`);
  }

  /** Starts a one-click lesson document (fake AI on the e2e backend: done in a second or two). */
  generateLessonDocument(timetableId: string, lessonId: string, documentType: "worksheet" | "quiz" | "test") {
    return this.call("POST", `/timetable/${timetableId}/lessons/${lessonId}/documents/generate`, { documentType });
  }

  /** Deletes every turma the tests made (and their documents). */
  async cleanup(): Promise<void> {
    for (const timetable of await this.listTimetables()) {
      if (timetable.title.startsWith(E2E_PREFIX)) {
        await this.call("DELETE", `/timetable/${timetable.id}?deleteDocuments=true`);
      }
    }
  }

  /**
   * A "2.º Matemática" turma with exactly the given lessons (one per date), each with its type and
   * topic. Other days in the period have no lessons, so the week card shows only these.
   */
  async createTurma(
    name: string,
    lessons: { date: string; slotType: SlotType; topicTitle: string }[],
  ): Promise<{ timetable: Timetable; lessons: Slot[] }> {
    const dates = lessons.map((l) => l.date).sort();
    const timetable = await this.call<Timetable>("POST", "/timetable", {
      title: `${E2E_PREFIX} ${name}`,
      subject: "Mathematics",
      gradeLevel: 2,
      periodStart: dates[0],
      periodEnd: dates[dates.length - 1],
      recurringSlots: [...new Set(dates.map(isoDayOfWeek))].map((dayOfWeek) => ({
        dayOfWeek,
        position: 1,
        durationMinutes: 50,
        slotType: "LESSON",
      })),
      // Teacher-placed days stay lessons even on a public holiday or school break (else they become HOLIDAY).
      exerciseDates: dates,
      source: "e2e",
    });

    const wanted = new Map(lessons.map((l) => [l.date, l]));
    const created: Slot[] = [];
    for (const slot of await this.listLessons(timetable.id)) {
      const lesson = wanted.get(slot.slotDate);
      if (!lesson) {
        // Same weekday in another week of the period: not part of this scenario.
        await this.call("POST", `/timetable/${timetable.id}/lessons/${slot.id}/skip`);
        continue;
      }
      created.push(
        await this.call<Slot>("PATCH", `/timetable/${timetable.id}/lessons/${slot.id}`, {
          slotType: lesson.slotType,
          topicTitle: lesson.topicTitle,
        }),
      );
    }
    created.sort((a, b) => a.slotDate.localeCompare(b.slotDate));
    return { timetable, lessons: created };
  }
}
