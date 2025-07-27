import { useCallback, useEffect, useRef, useState } from "react";
import type { Document } from "@/shared/types/domain/document";

export function useAutoSave(
  document: Document | null,
  content: string,
  updateDocument: (data: { id: string; content: string }) => Promise<void>
) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedContent = useRef<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const saveContent = useCallback(
    async (newContent: string) => {
      if (!document || newContent === lastSavedContent.current) {
        return;
      }

      try {
        setIsSaving(true);
        await updateDocument({
          id: document.id,
          content: newContent,
        });
        lastSavedContent.current = newContent;
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [document, updateDocument]
  );

  // Debounced auto-save
  useEffect(() => {
    if (
      !document ||
      !content ||
      content.trim() === "" ||
      content === lastSavedContent.current
    ) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveContent(content);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, document, saveContent]);

  useEffect(() => {
    if (document?.content) {
      lastSavedContent.current = document.content;
    }
  }, [document?.content]);

  return { isSaving };
}
