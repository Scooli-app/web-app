"use client";

import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { isAssessmentDoc } from "@/lib/documents/kind";
import { fetchDocument } from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DocumentEditor = dynamic(() => import("@/components/document-editor/DocumentEditor"), {
  loading: DocumentEditorSkeleton,
  ssr: false,
});
const AssessmentEditor = dynamic(() => import("./AssessmentEditor"), {
  loading: DocumentEditorSkeleton,
  ssr: false,
});

interface EditorSwitchProps {
  documentId: string;
  defaultTitle: string;
  generateMessage: string;
  chatTitle: string;
  chatPlaceholder: string;
}

/**
 * Test / worksheet / quiz pages: block-JSON documents open the assessment editor, markdown ones the
 * existing editor. Waits for the document first so the markdown editor never touches JSON content.
 */
export function EditorSwitch(props: EditorSwitchProps) {
  const { documentId } = props;
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.documents.currentDocument);
  const loadingId = useAppSelector((s) => s.documents.loadingDocumentId);
  const document = current?.id === documentId ? current : null;
  const [attempted, setAttempted] = useState<string | null>(null);

  useEffect(() => {
    if (document || attempted === documentId) return;
    setAttempted(documentId);
    if (loadingId !== documentId) void dispatch(fetchDocument(documentId));
  }, [attempted, dispatch, document, documentId, loadingId]);

  if (!document && (attempted !== documentId || loadingId === documentId)) return <DocumentEditorSkeleton />;

  if (isAssessmentDoc(document)) {
    return (
      // Full-bleed like the presentation editor: cancel SidebarLayout's padding.
      <div className="-m-3 flex w-full flex-1 min-h-0 sm:-m-4 md:-m-6">
        <AssessmentEditor documentId={documentId} defaultTitle={props.defaultTitle} chatTitle={props.chatTitle} chatPlaceholder={props.chatPlaceholder} />
      </div>
    );
  }
  return <DocumentEditor {...props} />;
}
