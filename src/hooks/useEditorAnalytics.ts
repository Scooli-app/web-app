"use client";

import type { Document, DocumentImage } from "@/shared/types/document";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef } from "react";

const EDITOR_IDLE_TIMEOUT_MS = 60_000;
const EDIT_BURST_GAP_MS = 10_000;
const MIN_SESSION_DURATION_MS = 1_000;

type SessionMetrics = {
  activeDurationMs: number;
  contentChangeCount: number;
  editBurstCount: number;
  autosaveCount: number;
  chatMessageCount: number;
  chatCharactersCount: number;
  imageUploadCount: number;
  aiSuggestionCount: number;
};

function createSessionMetrics(): SessionMetrics {
  return {
    activeDurationMs: 0,
    contentChangeCount: 0,
    editBurstCount: 0,
    autosaveCount: 0,
    chatMessageCount: 0,
    chatCharactersCount: 0,
    imageUploadCount: 0,
    aiSuggestionCount: 0,
  };
}

function createSessionId(documentId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${documentId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function countWords(content: string): number {
  const matches = content.trim().match(/\S+/g);
  return matches?.length ?? 0;
}

function toSeconds(ms: number): number {
  return Math.max(0, Math.round(ms / 1000));
}

function getDocumentContext(currentDocument: Document) {
  return {
    document_id: currentDocument.id,
    document_type: currentDocument.documentType,
    grade: currentDocument.gradeLevel ?? null,
    subject: currentDocument.subject ?? null,
  };
}

export function useEditorAnalytics(
  currentDocument: Document | null,
  content: string,
) {
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const activeWindowStartRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef<number | null>(null);
  const lastEditAtRef = useRef<number | null>(null);
  const latestContentRef = useRef(content);
  const currentDocumentRef = useRef<Document | null>(currentDocument);
  const metricsRef = useRef<SessionMetrics>(createSessionMetrics());

  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  useEffect(() => {
    currentDocumentRef.current = currentDocument;
  }, [currentDocument]);

  const stopActiveWindow = useCallback((timestamp = Date.now()) => {
    if (activeWindowStartRef.current === null) {
      return;
    }

    const activeUntil = lastActivityAtRef.current
      ? Math.min(timestamp, lastActivityAtRef.current + EDITOR_IDLE_TIMEOUT_MS)
      : timestamp;

    if (activeUntil > activeWindowStartRef.current) {
      metricsRef.current.activeDurationMs += activeUntil - activeWindowStartRef.current;
    }

    activeWindowStartRef.current = null;
    lastActivityAtRef.current = null;
  }, []);

  const registerActivity = useCallback(() => {
    if (!startedAtRef.current) {
      return;
    }

    const now = Date.now();
    if (
      activeWindowStartRef.current !== null &&
      lastActivityAtRef.current !== null &&
      now - lastActivityAtRef.current > EDITOR_IDLE_TIMEOUT_MS
    ) {
      stopActiveWindow(now);
    }

    if (activeWindowStartRef.current === null) {
      activeWindowStartRef.current = now;
    }

    lastActivityAtRef.current = now;
  }, [stopActiveWindow]);

  const flushSession = useCallback(
    (reason: string) => {
      const sessionDocument = currentDocumentRef.current;
      if (!sessionDocument || !sessionIdRef.current || !startedAtRef.current) {
        return;
      }

      stopActiveWindow();

      const durationMs = Date.now() - startedAtRef.current;
      const meaningfulActivityCount =
        metricsRef.current.contentChangeCount +
        metricsRef.current.autosaveCount +
        metricsRef.current.chatMessageCount +
        metricsRef.current.imageUploadCount +
        metricsRef.current.aiSuggestionCount;

      if (
        durationMs < MIN_SESSION_DURATION_MS &&
        meaningfulActivityCount === 0
      ) {
        sessionIdRef.current = null;
        startedAtRef.current = null;
        lastEditAtRef.current = null;
        metricsRef.current = createSessionMetrics();
        return;
      }

      const finalContent = latestContentRef.current;
      const activeDurationMs = Math.min(
        metricsRef.current.activeDurationMs,
        durationMs,
      );

      posthog.capture("editor_session_summary", {
        ...getDocumentContext(sessionDocument),
        editor_session_id: sessionIdRef.current,
        session_end_reason: reason,
        session_duration_seconds: toSeconds(durationMs),
        active_duration_seconds: toSeconds(activeDurationMs),
        idle_duration_seconds: toSeconds(durationMs - activeDurationMs),
        content_change_count: metricsRef.current.contentChangeCount,
        edit_burst_count: metricsRef.current.editBurstCount,
        autosave_count: metricsRef.current.autosaveCount,
        ai_chat_message_count: metricsRef.current.chatMessageCount,
        ai_chat_characters_count: metricsRef.current.chatCharactersCount,
        image_upload_count: metricsRef.current.imageUploadCount,
        ai_suggestion_count: metricsRef.current.aiSuggestionCount,
        final_content_length: finalContent.length,
        final_word_count: countWords(finalContent),
      });

      sessionIdRef.current = null;
      startedAtRef.current = null;
      lastEditAtRef.current = null;
      metricsRef.current = createSessionMetrics();
    },
    [stopActiveWindow],
  );

  useEffect(() => {
    const sessionDocument = currentDocumentRef.current;
    if (!sessionDocument?.id) {
      return;
    }

    sessionIdRef.current = createSessionId(sessionDocument.id);
    startedAtRef.current = Date.now();
    metricsRef.current = createSessionMetrics();
    lastEditAtRef.current = null;
    latestContentRef.current =
      latestContentRef.current || sessionDocument.content || "";

    posthog.capture("editor_opened", {
      ...getDocumentContext(sessionDocument),
      editor_session_id: sessionIdRef.current,
      initial_content_length: latestContentRef.current.length,
      initial_word_count: countWords(latestContentRef.current),
    });

    const handleVisibilityChange = () => {
      if (globalThis.document.hidden) {
        stopActiveWindow();
      }
    };

    const handlePageHide = () => {
      stopActiveWindow();
    };

    globalThis.document.addEventListener("visibilitychange", handleVisibilityChange);
    globalThis.window.addEventListener("pagehide", handlePageHide);

    return () => {
      globalThis.document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      globalThis.window.removeEventListener("pagehide", handlePageHide);
      flushSession("document_closed");
    };
  }, [currentDocument?.id, flushSession, stopActiveWindow]);

  const registerEdit = useCallback(
    (nextContent: string) => {
      latestContentRef.current = nextContent;

      if (!startedAtRef.current) {
        return;
      }

      registerActivity();
      metricsRef.current.contentChangeCount += 1;

      const now = Date.now();
      if (
        !lastEditAtRef.current ||
        now - lastEditAtRef.current > EDIT_BURST_GAP_MS
      ) {
        metricsRef.current.editBurstCount += 1;
      }
      lastEditAtRef.current = now;
    },
    [registerActivity],
  );

  const registerAutosave = useCallback(
    (nextContent: string) => {
      latestContentRef.current = nextContent;

      if (!startedAtRef.current) {
        return;
      }

      registerActivity();
      metricsRef.current.autosaveCount += 1;
    },
    [registerActivity],
  );

  const registerChatMessage = useCallback(
    (message: string) => {
      if (!startedAtRef.current) {
        return;
      }

      registerActivity();
      metricsRef.current.chatMessageCount += 1;
      metricsRef.current.chatCharactersCount += message.trim().length;
    },
    [registerActivity],
  );

  const registerImageUpload = useCallback(
    (file: File, image: DocumentImage) => {
      const sessionDocument = currentDocumentRef.current;
      if (!sessionDocument || !startedAtRef.current || !sessionIdRef.current) {
        return;
      }

      registerActivity();
      metricsRef.current.imageUploadCount += 1;

      posthog.capture("document_image_uploaded", {
        ...getDocumentContext(sessionDocument),
        editor_session_id: sessionIdRef.current,
        image_id: image.id,
        image_kind: image.kind,
        image_source: image.source ?? "user_upload",
        file_size_bytes: file.size,
        file_type: file.type,
        upload_source: "toolbar",
      });
    },
    [registerActivity],
  );

  const registerImageUploadFailed = useCallback(
    (file: File, error: unknown) => {
      const sessionDocument = currentDocumentRef.current;
      if (!sessionDocument || !startedAtRef.current || !sessionIdRef.current) {
        return;
      }

      registerActivity();
      posthog.capture("document_image_upload_failed", {
        ...getDocumentContext(sessionDocument),
        editor_session_id: sessionIdRef.current,
        file_size_bytes: file.size,
        file_type: file.type,
        upload_source: "toolbar",
      });
      posthog.captureException(error);
    },
    [registerActivity],
  );

  const registerAiSuggestionReceived = useCallback(
    (changesCount: number) => {
      const sessionDocument = currentDocumentRef.current;
      if (!sessionDocument || !startedAtRef.current || !sessionIdRef.current) {
        return;
      }

      registerActivity();
      metricsRef.current.aiSuggestionCount += 1;

      posthog.capture("ai_document_suggestion_received", {
        ...getDocumentContext(sessionDocument),
        editor_session_id: sessionIdRef.current,
        changes_count: changesCount,
      });
    },
    [registerActivity],
  );

  const syncContent = useCallback((nextContent: string) => {
    latestContentRef.current = nextContent;
  }, []);

  const getSessionId = useCallback(() => sessionIdRef.current, []);

  return useMemo(
    () => ({
      registerActivity,
      registerEdit,
      registerAutosave,
      registerChatMessage,
      registerImageUpload,
      registerImageUploadFailed,
      registerAiSuggestionReceived,
      syncContent,
      getSessionId,
    }),
    [
      getSessionId,
      registerActivity,
      registerAiSuggestionReceived,
      registerAutosave,
      registerChatMessage,
      registerEdit,
      registerImageUpload,
      registerImageUploadFailed,
      syncContent,
    ],
  );
}
