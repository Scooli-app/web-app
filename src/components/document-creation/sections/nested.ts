/**
 * Strips a section's own Card chrome so it can be composed inside a shared card
 * (the document form's subject+duration card, the planificação and turma wizards).
 * `h-auto` cancels the `h-full` DurationSection sets for standalone grid use.
 */
// `sm:p-0` is required as well as `p-0`: tailwind-merge resolves each responsive
// variant independently, so an unprefixed `p-0` never cancels the sections' `sm:p-6`.
export const NESTED_SECTION_CLASS =
  "h-auto gap-0 rounded-none border-0 bg-transparent p-0 py-0 sm:p-0 shadow-none transition-none hover:shadow-none";
