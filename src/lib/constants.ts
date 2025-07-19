/**
 * Application constants and configuration
 */

export const RAG_CONFIG = {
  EMBEDDING_MODEL: "text-embedding-3-small",
  MATCH_THRESHOLD: 0.5,
  MATCH_COUNT: 5,
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
} as const;

export const UI_CONFIG = {
  MIN_QUESTION_LENGTH: 10,
  MAX_QUESTION_LENGTH: 500,
} as const;

export const ERROR_MESSAGES = {
  MISSING_ENV_VARS: "Missing environment variables",
  QUESTION_REQUIRED: "Question is required",
  QUESTION_TOO_SHORT: "A pergunta deve ter pelo menos 10 caracteres",
  QUESTION_TOO_LONG: "A pergunta deve ter no máximo 500 caracteres",
  NO_RELEVANT_INFO: "No relevant information found",
  STREAM_ERROR: "Não foi possível iniciar o stream",
  UNKNOWN_ERROR: "Erro desconhecido",
  PROCESSING_ERROR: "Erro ao processar pergunta",
} as const;

export const SUCCESS_MESSAGES = {
  PROCESSING: "A processar...",
  ASK_QUESTION: "Perguntar",
} as const;
