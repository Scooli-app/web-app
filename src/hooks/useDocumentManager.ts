import { fetchDocument, updateDocument } from "@/store/documents/documentSlice";
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

      try {
        await dispatch(
          updateDocument({
            id: currentDocument.id,
            title: newTitle,
          })
        );
      } catch (error) {
        console.error("Failed to save title:", error);
        throw error;
      }
    },
    [currentDocument, dispatch]
  );

  return {
    document: currentDocument,
    content,
    editorKey,
    isLoading: storeLoading,
    handleContentChange,
    handleTitleSave,
  };
}
