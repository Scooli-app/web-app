import { Routes } from "@/shared/types";

/** Base routes whose `/<id>` page opens one document. */
const DOCUMENT_ROUTES = [
  Routes.LESSON_PLAN,
  Routes.TEST,
  Routes.QUIZ,
  Routes.WORKSHEET,
  Routes.PRESENTATION,
  Routes.CURRICULUM_PLAN,
];

/**
 * Where a completed full onboarding goes next. On a document page the teacher stays:
 * they followed a link to that document. Every other route goes to the dashboard.
 */
export function routeAfterOnboarding(pathname: string): Routes | null {
  const onDocument = DOCUMENT_ROUTES.some((route) => pathname.startsWith(`${route}/`));
  return onDocument ? null : Routes.DASHBOARD;
}
