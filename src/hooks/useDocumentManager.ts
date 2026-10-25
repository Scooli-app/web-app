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
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useDocumentManager(documentId: string) {
  const [content, setContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const currentDocument = useAppSelector(selectCurrentDocument);
  const storeLoading = useAppSelector(selectIsLoading);
  const dispatch = useAppDispatch();
  const t = useTranslations("editor.documentEditor");
  // The stored content the editor's text starts from, and the saves in order: two autosaves in flight at once
  // would otherwise send the same base and the second would look like another tab's save.
  const baseVersionRef = useRef<string | undefined>(undefined);
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());

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
    baseVersionRef.current = currentDocument.contentVersion;

    if (skipNextEditorKeyBumpRef.current) {
      // Skip editor remount - the caller is handling the content change
      console.warn("[DIFF] useDocumentManager: skipping editorKey bump");
      skipNextEditorKeyBumpRef.current = false;
      return;
    }

    console.warn("[DIFF] useDocumentManager: bumping editorKey");
    setContent(currentDocument.content || "");
    setEditorKey((prev) => prev + 1);
  }, [currentDocument?.id, currentDocument?.content, currentDocument?.contentVersion, documentId]);

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

      const id = currentDocument.id;
      const save = async (overwrite: boolean): Promise<void> => {
        const result = await dispatch(
          updateDocument({ id, content: newContent, baseContentVersion: overwrite ? undefined : baseVersionRef.current })
        );
        if (updateDocument.fulfilled.match(result)) {
          baseVersionRef.current = result.payload.contentVersion;
          return;
        }
        if (result.meta.conflict) {
          // Nothing was overwritten: the teacher picks which version stays.
          toast.error(t("conflict"), {
            id: "document-conflict",
            duration: Infinity,
            action: { label: t("conflictReload"), onClick: () => window.location.reload() },
            cancel: { label: t("conflictKeepMine"), onClick: () => void save(true) },
          });
          return;
        }
        console.error("Failed to autosave content:", result.payload);
      };
      const run = saveChainRef.current.then(() => save(false));
      saveChainRef.current = run.catch(() => undefined);
      await run;
    },
    [currentDocument, dispatch, documentId, t]
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
