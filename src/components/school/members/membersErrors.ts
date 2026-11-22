import { ApiRequestError } from "@/services/api/client";

const KNOWN = [
  "seat_limit_reached",
  "member_limit_reached",
  "already_member",
  "last_admin",
  "self",
  "invalid_emails",
] as const;
type KnownCode = (typeof KNOWN)[number];

/** The translated message for a members-management failure: by the backend's error code, else a generic one. */
export function membersErrorMessage(
  error: unknown,
  t: (key: `errors.${KnownCode | "generic"}`) => string,
): string {
  const code = error instanceof ApiRequestError ? error.code : null;
  return KNOWN.includes(code as KnownCode) ? t(`errors.${code as KnownCode}`) : t("errors.generic");
}
