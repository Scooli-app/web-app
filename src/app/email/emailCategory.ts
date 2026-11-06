/**
 * The opt-out category of an emailed unsubscribe link (`?category=` from the backend's
 * EmailUnsubscribeResource). The weekly digest link carries none; the Pro trial emails
 * (ENG-318/319) share `pro_trial`. Anything else keeps the weekly-digest wording, as before.
 */
export type EmailCategory = "weekly_digest" | "pro_trial";

export function emailCategory(raw: string | null | undefined): EmailCategory {
  return raw === "pro_trial" ? "pro_trial" : "weekly_digest";
}
