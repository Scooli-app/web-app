"use client";

import type { ChatMessage } from "@/components/document-editor/AIChatPanel";
import { documentTypes } from "@/components/document-creation/documentTypes";
import { type ChatFailure, isChatFailure } from "@/lib/chatErrors";
import { clearChatHistory, getChatHistory } from "@/services/api/document.service";
import { Routes, type ChatNewDocument, type ChatResponse, type DocumentType } from "@/shared/types";
import { useAppDispatch } from "@/store/hooks";
import { createDocument, setPendingInitialPrompt } from "@/store/documents/documentSlice";
import { linkLessonDocument } from "@/services/api/timetable.service";
import { DEFAULT_PRESENTATION_THEME } from "@/shared/types/presentation-theme";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useCallback } from "react";

/** Which editor a chat turn came from, for analytics (ENG-386). */
export type ChatEditorKind = "markdown" | "presentation" | "assessment";

/** How the message was sent (ENG-386): typed, an initial chip, a clarification option or a follow-up chip. */
export type ChatMessageSource = "typed" | "chip";

export function newChatTurnId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The assistant bubble for a server reply: text plus the change list, chips and actions it carries. */
export function assistantMessageFromResponse(
  response: ChatResponse,
  options: { hasUpdate: boolean; imageRegenOffer?: boolean },
): ChatMessage {
  return {
    role: "assistant",
    content: response.chatAnswer,
    hasUpdate: options.hasUpdate,
    imageRegenOffer: options.imageRegenOffer,
    outcome: response.outcome ?? null,
    charged: response.charged ?? null,
    changes: response.changes ?? null,
    clarifyOptions: response.clarifyOptions ?? null,
    followUps: response.followUps ?? null,
    newDocument: response.newDocument ?? null,
    isError: response.outcome === "error",
  };
}

/**
 * One event per chat reply (ENG-386), linked to `ai_chat_message_sent` by `chat_turn_id`, so the dashboard can
 * tell answers, edits, refusals, no-ops and failures apart.
 */
export function captureChatResponse(params: {
  turnId: string;
  documentId: string;
  documentType?: string | null;
  editor: ChatEditorKind;
  editorSessionId?: string | null;
  startedAt: number;
  response?: ChatResponse;
  failure?: ChatFailure | unknown;
}) {
  const { response, failure } = params;
  const failureKind = failure ? (isChatFailure(failure) ? failure.kind : "server") : null;
  try {
    posthog.capture("ai_chat_response_received", {
      chat_turn_id: params.turnId,
      document_id: params.documentId,
      document_type: params.documentType ?? null,
      editor: params.editor,
      editor_session_id: params.editorSessionId ?? null,
      latency_ms: Date.now() - params.startedAt,
      intent: response?.intent ?? null,
      outcome: response ? (response.outcome ?? (response.content ? "edit" : "answer")) : "error",
      charged: response?.charged ?? null,
      error_code: response?.errorCode ?? (failureKind ? `client_${failureKind}` : null),
      changes_count: response?.changes?.length ?? 0,
      changed_chars: response?.pendingReview || response?.content ? (response.content?.length ?? 0) : 0,
      has_follow_ups: (response?.followUps?.length ?? 0) > 0,
      has_new_document: !!response?.newDocument,
    });
  } catch {
    // Analytics must never break the chat.
  }
}

export function captureChatMessageSent(params: {
  turnId: string;
  documentId: string;
  documentType?: string | null;
  editor: ChatEditorKind;
  editorSessionId?: string | null;
  message: string;
  imageCount?: number;
  /** "selection" when the teacher asked about selected text (ENG-403). */
  source?: "selection";
}) {
  try {
    posthog.capture("ai_chat_message_sent", {
      chat_turn_id: params.turnId,
      document_id: params.documentId,
      document_type: params.documentType ?? null,
      editor: params.editor,
      message_length: params.message.trim().length,
      current_image_count: params.imageCount ?? null,
      source: params.source ?? null,
      editor_session_id: params.editorSessionId ?? null,
    });
  } catch {
    // Analytics must never break the chat.
  }
}

/** The teacher's 👍/👎 on a reply (ENG-387). */
export function captureChatFeedback(params: {
  documentId: string;
  documentType?: string | null;
  editor: ChatEditorKind;
  rating: "up" | "down";
  message: ChatMessage;
}) {
  try {
    posthog.capture("ai_chat_feedback", {
      document_id: params.documentId,
      document_type: params.documentType ?? null,
      editor: params.editor,
      rating: params.rating,
      outcome: params.message.outcome ?? null,
      reply_length: params.message.content.length,
    });
  } catch {
    // Analytics must never break the chat.
  }
}

/** The stored conversation as panel messages (ENG-396). Empty on any failure: history is a convenience. */
export async function loadChatHistory(documentId: string): Promise<ChatMessage[]> {
  try {
    const messages = await getChatHistory(documentId);
    return messages
      .filter((m) => m.text && m.text.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.text, fromHistory: true }));
  } catch {
    return [];
  }
}

export async function startNewConversation(documentId: string): Promise<boolean> {
  try {
    await clearChatHistory(documentId);
    posthog.capture("ai_chat_new_conversation", { document_id: documentId });
    return true;
  } catch {
    return false;
  }
}

/** Text for a failed request, by kind (ENG-399). */
export function useChatFailureText() {
  const t = useTranslations("editor.aiChatPanel.errors");
  return useCallback(
    (failure: unknown): string => {
      if (!isChatFailure(failure)) return t("server");
      switch (failure.kind) {
        case "timeout":
          return t("timeout");
        case "network":
          return t("network");
        case "notFound":
          return t("notFound");
        case "upgrade":
          return failure.message ?? t("upgrade");
        case "locked":
          return failure.message ?? t("locked");
        default:
          return t("server");
      }
    },
    [t],
  );
}

const SOURCE_EXCERPT_CHARS = 1500;

/** What a new document borrows from the one the chat is open on. */
export interface ChatSourceDocument {
  id: string;
  title?: string | null;
  subject?: string | null;
  gradeLevel?: string | number | null;
  duration?: number | null;
  content?: string | null;
  documentType?: string | null;
  /** The lesson the source document belongs to: the new document joins it too. */
  lesson?: { timetableId: string; lessonId: string } | null;
}

/** The lesson a document belongs to (from its classInfo), or null. */
export function lessonOf(document: {
  classInfo?: { timetableId: string; lessonId?: string | null } | null;
}): { timetableId: string; lessonId: string } | null {
  const info = document.classInfo;
  return info?.timetableId && info.lessonId ? { timetableId: info.timetableId, lessonId: info.lessonId } : null;
}

/**
 * "Cria uma ficha a partir desta aula" (ENG-409): a separate document with the same subject, year and topic,
 * told what the source document covers, instead of crammed into it.
 */
export function useCreateDocumentFromChat() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  return useCallback(
    async (request: ChatNewDocument, source: ChatSourceDocument): Promise<string | null> => {
      posthog.capture("ai_chat_new_document_clicked", {
        source_document_id: source.id,
        source_document_type: source.documentType,
        new_document_type: request.type,
      });
      if (request.type === "curriculumPlan") {
        router.push(Routes.CURRICULUM_PLAN_NEW);
        return null;
      }
      const config = documentTypes[request.type];
      const schoolYear = Number.parseInt(String(source.gradeLevel ?? ""), 10);
      if (!config || !source.subject || !Number.isFinite(schoolYear)) {
        return "missing_context";
      }
      const excerpt = (source.content ?? "").slice(0, SOURCE_EXCERPT_CHARS);
      const prompt = request.instructions?.trim() || source.title || "";
      const additionalDetails = [
        `Baseado no documento "${source.title ?? ""}".`,
        excerpt ? `Excerto do documento de origem:\n${excerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const result = await dispatch(
        createDocument({
          documentType: request.type as DocumentType,
          prompt,
          subject: source.subject,
          schoolYear,
          duration: typeof source.duration === "number" ? source.duration : undefined,
          additionalDetails,
        }),
      );
      if (!createDocument.fulfilled.match(result)) {
        return typeof result.payload === "string" ? result.payload : "create_failed";
      }
      const created = result.payload;
      posthog.capture("document_created", {
        document_type: request.type,
        subject: source.subject,
        school_year: schoolYear,
        created_from: "ai_chat",
        source_document_id: source.id,
      });
      if (source.lesson) {
        // Made from a lesson's document: it belongs to that lesson as well. If linking fails the document still opens.
        await linkLessonDocument(source.lesson.timetableId, source.lesson.lessonId, created.id).catch((err) =>
          posthog.captureException(err),
        );
      }
      dispatch(setPendingInitialPrompt({ documentId: created.id, prompt }));
      const path = config.redirectPath.replace(":id", created.id);
      // A deck made from the chat gets the default theme, like one made from the creation page.
      router.push(request.type === "presentation" ? `${path}?theme=${DEFAULT_PRESENTATION_THEME}` : path);
      return null;
    },
    [dispatch, router],
  );
}
