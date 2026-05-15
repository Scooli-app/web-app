export const ONBOARDING_PROMPT_KEY = "user_onboarding_v1" as const;

export type AcquisitionSource =
  | "SEARCH_ENGINE"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "LINKEDIN"
  | "COLLEAGUE_FRIEND"
  | "EDUCATION_SUMMIT"
  | "AI_ASSISTANT"
  | "OTHER";

export type SubjectArea =
  | "MATH"
  | "PORTUGUESE"
  | "NATURAL_SCIENCES"
  | "PHYSICS_CHEMISTRY"
  | "HISTORY"
  | "GEOGRAPHY"
  | "ENGLISH"
  | "FRENCH"
  | "SPANISH"
  | "PHYSICAL_EDUCATION"
  | "VISUAL_ARTS"
  | "MUSIC"
  | "ICT"
  | "PHILOSOPHY"
  | "OTHER";

export type TeachingLevel =
  | "1ST_CYCLE"
  | "2ND_CYCLE"
  | "3RD_CYCLE"
  | "SECONDARY";

export const ACQUISITION_SOURCE_LABELS: Record<AcquisitionSource, string> = {
  SEARCH_ENGINE: "Google, Bing ou outro motor de busca",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  COLLEAGUE_FRIEND: "Colega, familiar ou amigo",
  EDUCATION_SUMMIT: "Education Summit",
  AI_ASSISTANT: "ChatGPT, Gemini, ou outro assistente de IA",
  OTHER: "Outro",
};

export const SUBJECT_AREA_LABELS: Record<SubjectArea, string> = {
  MATH: "Matemática",
  PORTUGUESE: "Português",
  NATURAL_SCIENCES: "Ciências Naturais",
  PHYSICS_CHEMISTRY: "Físico-Química",
  HISTORY: "História",
  GEOGRAPHY: "Geografia",
  ENGLISH: "Inglês",
  FRENCH: "Francês",
  SPANISH: "Espanhol",
  PHYSICAL_EDUCATION: "Educação Física",
  VISUAL_ARTS: "Artes Visuais",
  MUSIC: "Música",
  ICT: "TIC / Informática",
  PHILOSOPHY: "Filosofia",
  OTHER: "Outro",
};

export const TEACHING_LEVEL_LABELS: Record<TeachingLevel, string> = {
  "1ST_CYCLE": "1.º ciclo",
  "2ND_CYCLE": "2.º ciclo",
  "3RD_CYCLE": "3.º ciclo",
  SECONDARY: "Secundário",
};

export interface OnboardingStatusResponse {
  promptKey: string;
  shouldShow: boolean;
  status: string;
  nextPromptAt: string;
  shownCount: number;
}

export interface OnboardingPromptRequest {
  promptKey: string;
}

export interface OnboardingSubmitRequest {
  promptKey: string;
  acquisitionSource: AcquisitionSource;
  subjectArea?: SubjectArea[] | null;
  teachingLevel?: TeachingLevel[] | null;
}
