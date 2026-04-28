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
  // Track previous content to avoid unnecessary remounts and update loops
  const prevContentRef = useRef<string | null>(null);
  // When set to true, the next content change will not bump editorKey
  // (used during diff/suggestions mode to prevent editor remount)
  const skipNextEditorKeyBumpRef = useRef(false);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    // Clear editor content immediately when changing route document
    // so stale content is not shown while the new document fetch is pending.
    if (documentId !== prevDocumentIdRef.current) {
      setContent("");
      prevContentRef.current = null;
    }

    // If the current document already matches, mark as synced and stop.
    if (currentDocument?.id === documentId) {
      prevDocumentIdRef.current = documentId;
      return;
    }

    // Wait for any in-flight load to finish, then retry via dependency change.
    if (storeLoading) {
      return;
    }

    // Dispatch only once per target document ID.
    if (documentId !== prevDocumentIdRef.current) {
      dispatch(fetchDocument(documentId));
      prevDocumentIdRef.current = documentId;
    }
  }, [documentId, dispatch, currentDocument?.id, storeLoading]);

  // Only sync content when the current route document content changes.
  // This prevents syncing stale data from other documents during transitions.
  useEffect(() => {
    if (
      currentDocument?.id !== documentId ||
      currentDocument?.content === undefined ||
      currentDocument.content === prevContentRef.current
    ) {
      return;
    }

    prevContentRef.current = currentDocument.content;

    if (skipNextEditorKeyBumpRef.current) {
      // Skip editor remount - the caller is handling the content change
      console.warn("[DIFF] useDocumentManager: skipping editorKey bump");
      skipNextEditorKeyBumpRef.current = false;
      return;
    }

    console.warn("[DIFF] useDocumentManager: bumping editorKey");
    setContent(currentDocument.content || "");
    setEditorKey((prev) => prev + 1);
  }, [currentDocument?.id, currentDocument?.content, documentId]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      if (!currentDocument || currentDocument.id !== documentId) {
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
    [currentDocument, dispatch, documentId]
  );

  const handleAutosave = useCallback(
    async (newContent: string) => {
      if (
        !currentDocument ||
        currentDocument.id !== documentId ||
        newContent === prevContentRef.current
      ) {
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
    [currentDocument, dispatch, documentId]
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
    // Set to true before a content change to prevent editor remount (for diff mode)
    skipNextEditorKeyBumpRef,
  };
}
