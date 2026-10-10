import type { RootState } from "@/store/store";

export const selectPlanGeneration = (state: RootState) => state.planGeneration;

/** True while topics or lessons are being generated in the background. */
export const selectPlanGenerationActive = (state: RootState) =>
  state.planGeneration.status === "topics" || state.planGeneration.status === "lessons";

/** Banner is shown while running and when it ended in an error (to retry). */
export const selectPlanGenerationVisible = (state: RootState) =>
  state.planGeneration.status === "topics" ||
  state.planGeneration.status === "lessons" ||
  state.planGeneration.status === "error";
