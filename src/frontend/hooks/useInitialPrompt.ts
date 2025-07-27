import { useCallback, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useDocumentStore } from "@/frontend/stores/document.store";
import type { Document } from "@/shared/types/domain/document";

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

        const supabase = createClientComponentClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/documents/${documentId}/chat`, {
          method: "POST",
          headers,
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
    [
      document,
      hasExecuted,
      generateMessage,
      onContentChange,
      clearPendingInitialPrompt,
    ]
  );

  // Check for metadata.initial_prompt in the document if no pending prompt
  useEffect(() => {
    if (
      document &&
      !hasExecuted &&
      !isExecuting &&
      (!pendingInitialPrompt || pendingDocumentId !== documentId) &&
      document.metadata?.initial_prompt &&
      (!document.content || document.content.trim() === "")
    ) {
      executePrompt(document.metadata.initial_prompt as string);
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
    const shouldExecute =
      document &&
      !hasExecuted &&
      !isExecuting &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId &&
      (!document.content || document.content.trim() === "");

    if (shouldExecute) {
      executePrompt(pendingInitialPrompt);
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

  return { isExecuting };
}
