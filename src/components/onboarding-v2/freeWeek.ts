/** YYYY-MM-DD in local time. Onboarding prepares the 7 days from today's date (see planGenerationRunner). */
function toLocalIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export { toLocalIso };
