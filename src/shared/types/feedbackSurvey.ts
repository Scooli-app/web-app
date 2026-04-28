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

export const FEEDBACK_SURVEY_STATUS_LABELS: Record<FeedbackSurveyStatus, string> =
  {
    [FeedbackSurveyStatus.PENDING]: "Pendente",
    [FeedbackSurveyStatus.SNOOZED]: "Adiado",
    [FeedbackSurveyStatus.COMPLETED]: "Respondido",
  };

export const FEEDBACK_SURVEY_SENTIMENT_LABELS: Record<
  FeedbackSurveySentiment,
  string
> = {
  [FeedbackSurveySentiment.VERY_USEFUL]: "Muito útil",
  [FeedbackSurveySentiment.USEFUL_BUT_CAN_IMPROVE]:
    "Útil, mas pode melhorar",
  [FeedbackSurveySentiment.NOT_SURE_YET]: "Ainda não tenho a certeza",
  [FeedbackSurveySentiment.FRUSTRATING]: "Frustrante",
};

export const FEEDBACK_SURVEY_TAG_LABELS: Record<FeedbackSurveyTag, string> = {
  saves_time: "Poupa tempo",
  good_content_quality: "Boa qualidade",
  easy_to_use: "Fácil de usar",
  easy_to_edit: "Fácil de editar",
  has_needed_document_types: "Tem os tipos certos",
  quality_not_good_enough: "Qualidade insuficiente",
  platform_confusing: "Plataforma confusa",
  too_slow: "Demasiado lenta",
  found_bugs: "Encontrei bugs",
  missing_features: "Faltam funcionalidades",
};

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
