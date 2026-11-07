/**
 * School direction views: the class is judged, never the teacher. Contract: chalkboard `SchoolDirectionResource`,
 * `GET /organizations/current/direction/*`. Dates are ISO `YYYY-MM-DD` strings.
 */

export type TurmaState = "on_track" | "watch" | "behind" | "no_records" | "not_started";

export type Department = "languages" | "maths_science" | "humanities" | "arts_pe" | "primary" | "other";

export interface Teacher {
  userId: string;
  name: string | null;
  email: string | null;
}

export interface DirectionTurma {
  id: string;
  title: string;
  grade: number;
  /** Normalized key ("B"), or the raw label / turma title when the label does not normalize. */
  classLabel: string;
  subjectKey: string;
  subjectLabel: string;
  /** The turma's own department: filter by this, never by the overview `subjects[].department` column hint. */
  department: Department;
  state: TurmaState;
  executionPercent: number | null;
  lessonsPast: number;
  lessonsBehind: number;
  /** Label of the first behind item. */
  behindTopic: string | null;
  teacher: Teacher;
}

export interface DirectionOverview {
  asOf: string;
  schoolYearLabel: string | null;
  executionPercent: number | null;
  counts: { onTrack: number; watch: number; behind: number; noRecords: number };
  /** Ascending. */
  years: number[];
  /** Column order. */
  subjects: { key: string; label: string; department: Department }[];
  turmas: DirectionTurma[];
}

export interface DirectionTurmaDetail {
  turma: DirectionTurma;
  /** Newest first, max 10. */
  missedLessons: {
    slotId: string;
    date: string;
    sequenceNumber: number;
    topicTitle: string | null;
    teachingStatus: "not_held" | "partially_taught";
    note: string | null;
  }[];
  behindTopics: { label: string; plannedDate: string; lessonsBehind: number }[];
  difficulties: { outcomeId: string; text: string; difficultyCount: number; lastSignalDate: string }[];
  teacherPlan: {
    status: "pending" | "accepted" | "partially_accepted";
    summary: string | null;
    createdAt: string;
    decidedAt: string | null;
  } | null;
  nextAssessment: { date: string; topicTitle: string | null } | null;
}

export interface DirectionLearning {
  since: string;
  items: {
    outcomeId: string;
    text: string;
    subjectKey: string;
    subjectLabel: string;
    grade: number;
    turmasFlagged: number;
    turmasTotal: number;
    hasReinforcement: boolean;
    turmas: Pick<DirectionTurma, "id" | "title" | "grade" | "classLabel" | "teacher">[];
  }[];
}

export interface DirectionAssessment {
  slotId: string;
  turmaId: string;
  date: string;
  subjectLabel: string;
  topicTitle: string | null;
  teacher: Teacher;
}

export interface DirectionAssessmentClass {
  grade: number;
  classLabel: string;
  assessments: DirectionAssessment[];
}

export interface DirectionAssessmentWeek {
  /** Monday. */
  weekStart: string;
  /** Friday. */
  weekEnd: string;
  /** Only classes with at least one assessment. */
  classes: DirectionAssessmentClass[];
  /** Classes with 3 or more assessments in the week. */
  clashes: DirectionAssessmentClass[];
}

export interface DirectionHandover {
  teacher: Teacher;
  date: string;
  lessons: {
    slotId: string;
    turmaId: string;
    grade: number;
    classLabel: string;
    subjectLabel: string;
    sequenceNumber: number;
    topicTitle: string | null;
    lastLesson: {
      date: string;
      topicTitle: string | null;
      teachingStatus: string;
      note: string | null;
    } | null;
    documents: { title: string; documentType: string }[];
  }[];
}
