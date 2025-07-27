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
      if (!document || hasExecuted) {
        console.log("Skipping prompt execution:", {
          documentExists: !!document,
          hasExecuted,
          prompt,
        });
        return;
      }

      console.log("Executing initial prompt:", {
        documentId: document.id,
        prompt,
        hasExecuted,
      });

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

        console.log("Sending prompt request to API");
        const response = await fetch(`/api/documents/${document.id}/chat`, {
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
        console.log("Received API response:", {
          hasGeneratedContent: !!data.generatedContent,
          contentLength: data.generatedContent?.length || 0,
        });

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
      console.log(
        "Found initial_prompt in document metadata:",
        document.metadata.initial_prompt
      );
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

  // Execute pending prompt if available
  useEffect(() => {
    const shouldExecute =
      document &&
      !hasExecuted &&
      !isExecuting &&
      pendingInitialPrompt &&
      pendingDocumentId === documentId &&
      (!document.content || document.content.trim() === "");

    console.log("Checking if should execute prompt:", {
      shouldExecute,
      documentExists: !!document,
      hasExecuted,
      isExecuting,
      hasPendingPrompt: !!pendingInitialPrompt,
      pendingDocId: pendingDocumentId,
      currentDocId: documentId,
      hasContent: !!document?.content?.trim(),
    });

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
