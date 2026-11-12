import type { CheckInRecord, SavedCheckIn } from "@/shared/types/check-in";

/** The saved answer's consequences, from the check-in record. An older server's record says nothing: no replan. */
export function savedCheckIn(record: Pick<CheckInRecord, "replanStarted"> | null | undefined): SavedCheckIn {
  return { replanStarted: record?.replanStarted === true };
}
