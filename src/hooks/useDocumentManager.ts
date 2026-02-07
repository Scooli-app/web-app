import {
  fetchDocument,
  updateDocument,
  updateDocumentOptimistic,
} from "@/store/documents/documentSlice";
import {
  selectCurrentDocument,
  selectIsLoading,
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";
import { useCallback, useEffect, useRef, useState } from "react";

export function useDocumentManager(documentId: string) {
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const currentDocument = useAppSelector(selectCurrentDocument);
  const storeLoading = useAppSelector(selectIsLoading);
  const dispatch = useAppDispatch();

  // Track previous document ID to avoid unnecessary fetches
  const prevDocumentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (documentId && documentId !== prevDocumentIdRef.current) {
      prevDocumentIdRef.current = documentId;
      dispatch(fetchDocument(documentId));
    }
  }, [documentId, dispatch]);

  // Only sync content when the document's content actually changes
  // This prevents resetting content when only title or other fields change
  const prevContentRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      currentDocument?.content !== undefined &&
      currentDocument.content !== prevContentRef.current
    ) {
      prevContentRef.current = currentDocument.content;
      setContent(currentDocument.content || "");
      setEditorKey((prev) => prev + 1);
    }
  }, [currentDocument?.id, currentDocument?.content]);

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

  const handleAutosave = useCallback(
    async (newContent: string) => {
      if (!currentDocument || newContent === prevContentRef.current) {
        return;
      }

      // Update refs to prevent circular updates
      prevContentRef.current = newContent;
      setContent(newContent);

      try {
        await dispatch(
          updateDocument({
            id: currentDocument.id,
            content: newContent,
          })
        ).unwrap();
      } catch (error) {
        console.error("Failed to autosave content:", error);
      }
    },
    [currentDocument, dispatch]
  );

  const isSaving = useAppSelector((state) => state.documents.isSaving);

  return {
    document: currentDocument,
    content,
    setContent,
    editorKey,
    isLoading: storeLoading,
    isSaving,
    handleContentChange,
    handleTitleSave,
    handleAutosave,
  };
}
