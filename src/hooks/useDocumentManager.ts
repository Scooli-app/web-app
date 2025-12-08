import {
  fetchDocument,
  updateDocument,
  updateDocumentOptimistic,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCallback, useEffect, useState } from "react";

export function useDocumentManager(documentId: string) {
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const { currentDocument, isLoading: storeLoading } = useAppSelector(
    (state) => state.documents
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (documentId) {
      dispatch(fetchDocument(documentId as string));
    }
  }, [documentId, dispatch]);

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

      const previousTitle = currentDocument.title;

      // Optimistic update - immediately update the UI
      dispatch(
        updateDocumentOptimistic({
          id: currentDocument.id,
          title: newTitle,
        })
      );

      try {
        await dispatch(
          updateDocument({
            id: currentDocument.id,
            title: newTitle,
          })
        ).unwrap();
      } catch (error) {
        // Revert on failure
        dispatch(
          updateDocumentOptimistic({
            id: currentDocument.id,
            title: previousTitle,
          })
        );
        console.error("Failed to save title:", error);
        throw error;
      }
    },
    [currentDocument, dispatch]
  );

  return {
    document: currentDocument,
    content,
    setContent,
    editorKey,
    isLoading: storeLoading,
    handleContentChange,
    handleTitleSave,
  };
}
