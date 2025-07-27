import { useCallback, useEffect, useState } from "react";
import { useDocumentStore } from "@/stores/document.store";

export function useDocumentManager(documentId: string) {
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const {
    fetchDocument,
    updateDocument,
    currentDocument,
    isLoading: storeLoading,
  } = useDocumentStore();

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
  }, [documentId, fetchDocument]);

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content || "");
      setEditorKey((prev) => prev + 1);
    }
  }, [currentDocument]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      if (!currentDocument) {
        return;
      }

      try {
        await updateDocument({
          id: currentDocument.id,
          title: newTitle,
        });
      } catch (error) {
        console.error("Failed to save title:", error);
        throw error;
      }
    },
    [currentDocument, updateDocument]
  );

  return {
    document: currentDocument,
    content,
    editorKey,
    isLoading: storeLoading,
    handleContentChange,
    handleTitleSave,
    updateDocument,
  };
}
