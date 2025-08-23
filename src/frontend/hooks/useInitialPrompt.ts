import { useDocumentStore } from "@/frontend/stores/document.store";
import type { Document } from "@/shared/types/domain/document";
import { useCallback, useEffect, useState } from "react";

export function useInitialPrompt(
  document: Document | null,
  documentId: string,
  generateMessage: string,
  onContentChange: (content: string) => void
) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const { pendingInitialPrompt, pendingDocumentId, clearPendingInitialPrompt } =
    useDocumentStore();

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

        clearPendingInitialPrompt();
      } catch (error) {
        console.error("Failed to execute initial prompt:", error);
        clearPendingInitialPrompt();
        setHasExecuted(false);
      } finally {
        setIsExecuting(false);
      }
    },
    [documentId, generateMessage, onContentChange, clearPendingInitialPrompt]
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
