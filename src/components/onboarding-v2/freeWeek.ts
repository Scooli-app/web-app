function toLocalIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The week whose lessons are free during onboarding: this week's Monday when
 * today is Mon–Thu, otherwise next Monday. Same rule as the server
 * (`FreePlanRules.onboardingFreeWeek`). Returns YYYY-MM-DD in local time.
 */
export function onboardingFreeWeek(today: Date): string {
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const offset = daysSinceMonday <= 3 ? -daysSinceMonday : 7 - daysSinceMonday;
  return toLocalIso(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset),
  );
}

export { toLocalIso };
