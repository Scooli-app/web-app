/** Which version of the sheet the editor shows: the student's ("Enunciado") or with solutions ("Soluções"). */
export type SheetTab = "student" | "answers";

const KEY = "scooli.assessmentSheetTab";

/** The teacher's last tab, except that answers still to check ("Por verificar") always open with the solutions. */
export function initialSheetTab(remembered: SheetTab | null, pendingChecks: number): SheetTab {
  return pendingChecks > 0 ? "answers" : (remembered ?? "answers");
}

export function readSheetTab(): SheetTab | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "student" || value === "answers" ? value : null;
  } catch {
    return null;
  }
}

export function rememberSheetTab(tab: SheetTab): void {
  try {
    window.localStorage.setItem(KEY, tab);
  } catch {
    // No storage: the next document opens on the default tab.
  }
}
