export const APP_FEEDBACK_SURVEY_PROMPT_KEY = "app_feedback_v1" as const;

export enum FeedbackSurveyStatus {
  PENDING = "PENDING",
  SNOOZED = "SNOOZED",
  COMPLETED = "COMPLETED",
}

export enum FeedbackSurveySentiment {
  VERY_USEFUL = "VERY_USEFUL",
  USEFUL_BUT_CAN_IMPROVE = "USEFUL_BUT_CAN_IMPROVE",
  NOT_SURE_YET = "NOT_SURE_YET",
  FRUSTRATING = "FRUSTRATING",
}

export type FeedbackSurveyTag =
  | "saves_time"
  | "good_content_quality"
  | "easy_to_use"
  | "easy_to_edit"
  | "has_needed_document_types"
  | "quality_not_good_enough"
  | "platform_confusing"
  | "too_slow"
  | "found_bugs"
  | "missing_features";

export interface FeedbackSurveyStatusResponse {
  promptKey: string;
  shouldShow: boolean;
  status: FeedbackSurveyStatus;
  nextPromptAt: string;
  shownCount: number;
}

export interface FeedbackSurveyPromptRequest {
  promptKey: string;
}

export interface FeedbackSurveySubmitRequest {
  promptKey: string;
  sentiment: FeedbackSurveySentiment;
  selectedTags: FeedbackSurveyTag[];
  comment?: string;
}
