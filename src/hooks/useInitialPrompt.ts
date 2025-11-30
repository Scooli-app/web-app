import type { Document } from "@/shared/types/domain/document";
import { clearPendingInitialPrompt } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCallback, useEffect, useState } from "react";

export function useInitialPrompt(
  document: Document | null,
  documentId: string,
  generateMessage: string,
  onContentChange: (content: string) => void
) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const { pendingInitialPrompt, pendingDocumentId } = useAppSelector(
    (state) => state.documents
  );
  const dispatch = useAppDispatch();

  const executePrompt = useCallback(
    async (prompt: string) => {
      try {
        setIsExecuting(true);
        setHasExecuted(true);

        const response = await fetch(`/api/documents/${documentId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `${generateMessage}: ${prompt}`,
            currentContent: "",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }

        const data = await response.json();

        if (data.generatedContent) {
          onContentChange(data.generatedContent);
        }

        dispatch(clearPendingInitialPrompt());
      } catch (error) {
        console.error("Failed to execute initial prompt:", error);
        dispatch(clearPendingInitialPrompt());
        setHasExecuted(false);
      } finally {
        setIsExecuting(false);
      }
    },
    [documentId, generateMessage, dispatch, onContentChange]
  );

  useEffect(() => {
    if (
      !isExecuting &&
      (!pendingInitialPrompt || pendingDocumentId !== documentId) &&
      document?.metadata?.initial_prompt &&
      (!document.content || document.content.trim() === "")
    ) {
      executePrompt(document?.metadata.initial_prompt as string);
    }
  }, [
    document,
    hasExecuted,
    isExecuting,
    pendingInitialPrompt,
    pendingDocumentId,
    documentId,
    executePrompt,
  ]);

  useEffect(() => {
    if (
      !isExecuting &&
      !hasExecuted &&
      document &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId
    ) {
      executePrompt(pendingInitialPrompt);
    }
  }, [
    document,
    documentId,
    pendingInitialPrompt,
    pendingDocumentId,
    executePrompt,
    isExecuting,
    hasExecuted,
  ]);

  return {
    isExecuting,
    hasExecuted,
    executePrompt,
  };
}
