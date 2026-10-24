"use client";

import AIChatPanel from "@/components/document-editor/AIChatPanel";
import { DocumentEditorSkeleton } from "@/components/document-editor/DocumentEditorSkeleton";
import { DocumentLessonContext } from "@/components/document-editor/DocumentLessonContext";
import { ImagePickerModal, type ImageInsertResult } from "@/components/document-editor-v2/ImagePickerModal";
import ShareButton from "@/components/document-editor/ShareButton";
import { DocumentVersionsButton } from "@/components/document-versions/DocumentVersionsButton";
import { SuggestionBar } from "@/components/document-versions/SuggestionBar";
import { Button } from "@/components/ui/button";
import { GenerationStalledNotice } from "@/components/ui/generation-stalled-notice";
import { Input } from "@/components/ui/input";
import { useGenerationProgress } from "@/hooks/useGenerationProgress";
import { useGenerationStalled } from "@/hooks/useGenerationStalled";
import { generateDocumentImage } from "@/services/api/document-images.service";
import { searchAeOutcomes } from "@/services/export/documentExport";
import { MAX_LENGTHS } from "@/shared/config/constants";
import { Routes, type Document } from "@/shared/types";
import { isFailedDocumentStatus, type RagSource } from "@/shared/types/document";
import { chatWithDocument, fetchDocument, setCurrentDocument, updateDocument } from "@/store/documents/documentSlice";
import { fetchEntitlements } from "@/store/entitlements/entitlementsSlice";
import { selectCurrentEntitlement, selectEntitlementError, selectEntitlementLoading } from "@/store/entitlements/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsPro } from "@/store/subscription/selectors";
import { fetchSubscription } from "@/store/subscription/subscriptionSlice";
import type { AssessmentDocument } from "@/types/assessment";
import { AlertTriangle, Download, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AssessmentWorkspace } from "./AssessmentWorkspace";
import { ExportDialog } from "./ExportDialog";
import { adoptGrids, adoptStudentOrder, parseAssessment } from "./model";
import { createSerialRunner } from "./serialRunner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasUpdate?: boolean;
}

interface AssessmentEditorProps {
  documentId: string;
  defaultTitle: string;
  chatTitle: string;
  chatPlaceholder: string;
}

const AUTOSAVE_MS = 1500;

/** Editor for tests, worksheets and quizzes stored as assessment block JSON. */
export default function AssessmentEditor({ documentId, defaultTitle, chatTitle, chatPlaceholder }: AssessmentEditorProps) {
  const t = useTranslations("assessmentEditor");
  const tDoc = useTranslations("editor.documentEditor");
  const dispatch = useAppDispatch();
  const rawDocument = useAppSelector((s) => s.documents.currentDocument);
  const document = rawDocument?.id === documentId ? rawDocument : null;
  const isLoading = useAppSelector((s) => s.documents.isLoading);
  const isPremium = useAppSelector(selectIsPro);
  const isEntitlementLoading = useAppSelector(selectEntitlementLoading);
  const entitlement = useAppSelector(selectCurrentEntitlement);
  const entitlementError = useAppSelector(selectEntitlementError);
  // Unknown until the entitlement arrives (a failed load counts as free; the server decides anyway).
  const exportIsPro = entitlement ? isPremium : entitlementError ? false : null;

  useEffect(() => {
    if (documentId && !document) void dispatch(fetchDocument(documentId));
    dispatch(fetchSubscription());
    dispatch(fetchEntitlements());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / id change
  }, [dispatch, documentId]);

  // Full-viewport editor, like the presentation editor: page scroll would fight the inner scroll areas.
  useEffect(() => {
    const html = window.document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  /* ── Generation ─────────────────────────────────────────────────── */
  const inProgress = !!document && (document.status === "generating" || document.status === "processing");
  const isGenerationStalled = useGenerationStalled(inProgress, document?.updatedAt);
  const progress = useGenerationProgress({ documentId: inProgress ? documentId : null });
  useEffect(() => {
    if (progress.isDone) void dispatch(fetchDocument(documentId));
  }, [progress.isDone, documentId, dispatch]);

  /* ── Local working copy ─────────────────────────────────────────── */
  const [doc, setDoc] = useState<AssessmentDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveFailed, setSaveFailed] = useState<"content" | "title" | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [isChatting, setIsChatting] = useState(false);
  // The pre-chat save: editing is already locked, but the chat panel isn't "streaming" yet.
  const [flushing, setFlushing] = useState(false);
  // Only (re)load from the store when asked: first open, chat revision, version restore. Our own saves echo back through the store too.
  const needsLoadRef = useRef(true);
  const docRef = useRef(doc);
  docRef.current = doc;
  const documentRef = useRef(document);
  documentRef.current = document;
  const pendingTitleRef = useRef(pendingTitle);
  pendingTitleRef.current = pendingTitle;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    needsLoadRef.current = true;
    setDoc(null);
    setDirty(false);
    setPendingTitle(null);
  }, [documentId]);

  // The last save's answer, and the exercise open in the editor: its saved student order lands once it closes.
  const lastSavedRef = useRef<AssessmentDocument | null>(null);
  const editingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!document || inProgress || !needsLoadRef.current) return;
    const parsed = parseAssessment(document.content);
    if (!parsed) return;
    needsLoadRef.current = false;
    lastSavedRef.current = null;
    setDoc(parsed);
    setDirty(false);
  }, [document, inProgress]);

  const handleEditingChange = useCallback((id: string | null) => {
    editingIdRef.current = id;
    const current = docRef.current;
    if (!current) return;
    const adopted = adoptStudentOrder(current, lastSavedRef.current, id);
    if (adopted !== current) {
      docRef.current = adopted;
      setDoc(adopted);
    }
  }, []);

  const handleChange = useCallback((next: AssessmentDocument) => {
    setDoc(next);
    setDirty(true);
  }, []);

  // One PUT at a time; edits made meanwhile go out in a single follow-up with the latest snapshot.
  const runSave = async (): Promise<boolean> => {
    const snapshot = docRef.current;
    const current = documentRef.current;
    if (!snapshot || !current) return false;
    const title = pendingTitleRef.current ?? current.title;
    setSaveStatus("saving");
    const result = await dispatch(updateDocument({ id: documentId, title, content: JSON.stringify(snapshot) }));
    if (updateDocument.fulfilled.match(result)) {
      const clean = docRef.current === snapshot;
      // A word search whose words changed comes back with the grid the server built (the one that prints), and
      // items typed in answer order with the shuffled order the student gets.
      const current = docRef.current ?? snapshot;
      const saved = parseAssessment(result.payload.content);
      lastSavedRef.current = saved;
      const adopted = adoptStudentOrder(adoptGrids(current, saved), saved, editingIdRef.current);
      if (adopted !== current) {
        docRef.current = adopted;
        setDoc(adopted);
      }
      if (clean) setDirty(false);
      if (pendingTitleRef.current === title) setPendingTitle(null);
      setSaveFailed(null);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      return true;
    }
    // Structural problems come back as 400: keep the teacher's local state and say so, without blocking editing.
    setSaveFailed(pendingTitleRef.current !== null && !dirtyRef.current ? "title" : "content");
    setSaveStatus("idle");
    return false;
  };
  const runSaveRef = useRef(runSave);
  runSaveRef.current = runSave;
  const save = useMemo(() => createSerialRunner(() => runSaveRef.current()), []);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // No autosave while the assistant revises the stored document: editing is locked then anyway.
    if (!dirty || isChatting || flushing) return;
    timerRef.current = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [doc, dirty, isChatting, flushing, save]);

  useEffect(() => {
    if (!dirty && pendingTitle === null) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pendingTitle]);

  const handleTitleSave = useCallback(
    async (title: string) => {
      setPendingTitle(title);
      pendingTitleRef.current = title;
      await save();
    },
    [save],
  );

  const handleVersionRestored = useCallback(
    (restored: Document) => {
      needsLoadRef.current = true;
      dispatch(setCurrentDocument(restored));
    },
    [dispatch],
  );

  /* ── Suggestions ─────────────────────────────────────────────────── */
  // The review and the apply work on what is stored: unsaved edits land first (editing locked meanwhile), as for
  // the chat. "saved" tells the review its diff may be out of date.
  const flushEdits = useCallback(async (): Promise<"clean" | "saved" | "failed"> => {
    const pending = dirtyRef.current || !!saveFailed || saveStatus === "saving";
    setFlushing(true);
    try {
      const ok = dirtyRef.current || saveFailed ? await save() : await save.settled();
      return !ok ? "failed" : pending ? "saved" : "clean";
    } finally {
      setFlushing(false);
    }
  }, [save, saveFailed, saveStatus]);
  // After apply (or reject) the store gets the server copy: reload from it unless the teacher has edits in flight.
  const handleSuggestionReplaced = useCallback(() => {
    if (!dirtyRef.current) needsLoadRef.current = true;
  }, []);
  const searchParams = useSearchParams();

  const [exportOpen, setExportOpen] = useState(false);
  // The files must match the screen: send pending edits (or wait for the save on its way) first.
  const flushForExport = useCallback(() => (dirtyRef.current || saveFailed ? save() : save.settled()), [save, saveFailed]);

  /* ── Chat ────────────────────────────────────────────────────────── */
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    setChatHistory([]);
    setChatError("");
  }, [documentId]);

  useEffect(() => {
    const raw = document?.metadata?.prompt ?? document?.metadata?.initialPrompt;
    const prompt = typeof raw === "string" ? raw.trim() : "";
    if (prompt && chatHistory.length === 0 && document?.metadata?.promptServerGenerated !== true) {
      setChatHistory([{ role: "user", content: prompt }]);
    }
  }, [document?.metadata, chatHistory.length]);

  /** Returns false when the message was not sent, so the panel keeps it in the input. */
  const handleChatSubmit = useCallback(
    async (message: string): Promise<boolean> => {
      if (!document) return false;
      setChatError("");
      // Locks editing from here on, so nothing new can be lost when the revision reloads the document.
      setFlushing(true);
      // The assistant revises what is stored: unsaved edits (or a save already on its way) must land first,
      // or the reload would wipe them.
      let saved = false;
      try {
        saved = dirtyRef.current || saveFailed ? await save() : await save.settled();
      } finally {
        setFlushing(false);
      }
      if (!saved) {
        setChatError(t("chatSaveFirst"));
        return false;
      }
      setIsChatting(true);
      try {
        setChatHistory((prev) => [...prev, { role: "user", content: message }]);
        const response = await dispatch(chatWithDocument({ id: document.id, message })).unwrap();
        const updated = !!parseAssessment(response.content);
        if (updated) {
          needsLoadRef.current = true;
          await dispatch(fetchDocument(document.id));
        }
        setChatHistory((prev) => [...prev, { role: "assistant", content: response.chatAnswer || t("chatUpdated"), hasUpdate: updated }]);
        return true;
      } catch {
        setChatError(t("chatError"));
        return true;
      } finally {
        setIsChatting(false);
      }
    },
    [dispatch, document, save, saveFailed, t],
  );

  /* ── Images ──────────────────────────────────────────────────────── */
  const [imageOpen, setImageOpen] = useState(false);
  const imageCallbackRef = useRef<((url: string) => void) | null>(null);
  const requestImage = useCallback((onPicked: (url: string) => void) => {
    imageCallbackRef.current = onPicked;
    setImageOpen(true);
  }, []);
  const handleImageInsert = (result: ImageInsertResult) => {
    imageCallbackRef.current?.(result.url);
    setImageOpen(false);
  };
  const handleImageGenerate = async (prompt: string) => {
    setImageOpen(false);
    const onPicked = imageCallbackRef.current;
    const toastId = toast.loading(t("imageGenerating"));
    try {
      const result = await generateDocumentImage(documentId, prompt);
      if (result.newUrl) onPicked?.(result.newUrl);
      else toast.error(t("imageFailed"));
    } catch {
      toast.error(t("imageFailed"));
    } finally {
      toast.dismiss(toastId);
    }
  };

  /* ── AE goals ────────────────────────────────────────────────────── */
  const subject = document?.subject ?? null;
  const schoolYear = Number.parseInt(document?.gradeLevel ?? "", 10);
  const lookupAe = useCallback((ids: string[]) => searchAeOutcomes({ ids }), []);
  const searchAe = useCallback(
    (q: string) => searchAeOutcomes({ subject: subject ?? undefined, schoolYear, q: q || undefined }),
    [subject, schoolYear],
  );

  /* ── Render ──────────────────────────────────────────────────────── */
  if (!document) {
    if (isLoading) return <DocumentEditorSkeleton />;
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
        {tDoc("documentNotFound")}
        <Link href={Routes.DOCUMENTS} className="text-primary hover:underline">{t("backToDocuments")}</Link>
      </div>
    );
  }
  if (isFailedDocumentStatus(document.status)) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">{t("generationFailedTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("generationFailedSubtitle")}</p>
        <Button asChild className="mt-4"><Link href={Routes.DOCUMENTS}>{t("backToDocuments")}</Link></Button>
      </div>
    );
  }
  if (inProgress && isGenerationStalled) {
    return (
      <div className="flex min-h-[60dvh] w-full items-center justify-center p-8">
        <GenerationStalledNotice />
      </div>
    );
  }
  if (!inProgress && !doc) {
    if (isLoading) return <DocumentEditorSkeleton />;
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">{t("loadFailedTitle")}</h2>
        <Button className="mt-4" onClick={() => void dispatch(fetchDocument(documentId))}>{t("retry")}</Button>
      </div>
    );
  }

  const sources: RagSource[] = Array.isArray(document.sources)
    ? document.sources
    : Array.isArray(document.metadata?.sources)
      ? (document.metadata.sources as RagSource[])
      : [];
  const ready = !inProgress && !!doc;
  const english = String(document.metadata?.contentLanguage ?? "").toLowerCase().startsWith("en");

  return (
    <>
      <AssessmentWorkspace
        doc={inProgress ? null : doc}
        onChange={handleChange}
        readOnly={isChatting || flushing}
        lookupAe={lookupAe}
        showAe={!english}
        searchAe={subject && Number.isFinite(schoolYear) ? searchAe : null}
        requestImage={requestImage}
        onEditingChange={handleEditingChange}
        title={
          <>
            <InlineTitle title={pendingTitle ?? (document.title || defaultTitle)} onSave={handleTitleSave} disabled={!ready || isChatting || flushing} />
            <span className="shrink-0 text-xs text-muted-foreground">
              {saveStatus === "saving" ? t("saving") : saveStatus === "saved" ? t("saved") : dirty ? t("unsaved") : null}
            </span>
          </>
        }
        actions={
          <>
            <DocumentVersionsButton documentId={documentId} documentType={document.documentType} onRestored={handleVersionRestored} />
            <ShareButton
              title={pendingTitle ?? (document.title || defaultTitle)}
              content={document.content ?? ""}
              // Shares what is stored: not while edits are on their way.
              // (a title not yet stored counts too, even once its failure banner is dismissed: the shared title would differ)
              disabled={!ready || isChatting || flushing || dirty || saveStatus === "saving" || saveFailed !== null || pendingTitle !== null}
              disabledReason={
                saveStatus === "saving" ? t("saving") : saveFailed ? t("shareSaveFirst") : dirty || pendingTitle !== null ? t("unsaved") : undefined
              }
              documentId={documentId}
              grade={document.gradeLevel || ""}
              subject={document.subject || ""}
              resourceType={document.documentType}
              sharedStatus={document.sharedResourceStatus}
              className="h-8"
            />
            {/* Phone: icon only, so the actions (with Partilhar) stay on one row. */}
            <Button size="sm" className="h-8 gap-1.5" disabled={!ready} onClick={() => setExportOpen(true)}>
              <Download className="h-3.5 w-3.5" />
              <span className="max-md:sr-only">{t("export")}</span>
            </Button>
          </>
        }
        banner={
          saveFailed ? (
            <div role="alert" className="flex flex-shrink-0 items-center gap-3 border-b max-md:flex-wrap max-md:gap-y-1 border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 max-md:basis-[calc(100%-1.75rem)]">{saveFailed === "title" ? t("titleSaveFailed") : t("saveFailed")}</span>
              <Button size="sm" variant="outline" className="h-7 bg-background max-md:ml-7" onClick={() => void save()}>{t("retrySave")}</Button>
              <button type="button" aria-label={t("dismiss")} onClick={() => setSaveFailed(null)} className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null
        }
        lessonContext={
          <div className="mx-auto w-full max-w-[794px] max-md:px-3">
            <SuggestionBar
              documentId={documentId}
              suggestion={document.pendingSuggestion}
              contentFormat="json"
              documentType={document.documentType}
              flushEdits={flushEdits}
              onContentReplaced={handleSuggestionReplaced}
              autoOpenReview={searchParams.get("review") === "1"}
            />
            <DocumentLessonContext classInfo={document.classInfo} documentId={documentId} />
          </div>
        }
        onOpenChat={() => setChatOpen(true)}
        chat={
          <AIChatPanel
            mobileOpen={chatOpen}
            onMobileOpenChange={setChatOpen}
            onChatSubmit={handleChatSubmit}
            chatHistory={chatHistory}
            isStreaming={isChatting}
            disabled={!ready}
            error={chatError}
            placeholder={chatPlaceholder}
            title={chatTitle}
            sources={sources}
            showGenerationHint={!isEntitlementLoading && !isPremium}
            documentType={document.documentType}
            suggestionsKey={document.documentType === "worksheet" ? "assessmentWorksheet" : document.documentType === "quiz" ? "assessmentQuiz" : "assessment"}
            documentId={documentId}
          />
        }
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        documentId={documentId}
        documentType={document.documentType}
        title={pendingTitle ?? (document.title || defaultTitle)}
        english={english}
        isPro={exportIsPro}
        chatting={isChatting || flushing}
        flush={flushForExport}
      />
      <ImagePickerModal
        open={imageOpen}
        documentId={documentId}
        replacing
        onClose={() => setImageOpen(false)}
        onInsert={handleImageInsert}
        onGenerate={(prompt) => void handleImageGenerate(prompt)}
      />
    </>
  );
}

function InlineTitle({ title, onSave, disabled }: { title: string; onSave: (title: string) => Promise<void>; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== title) void onSave(next);
    else setValue(title);
  };
  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        maxLength={MAX_LENGTHS.DOCUMENT_TITLE}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className="h-8 max-w-md text-sm font-semibold"
      />
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setValue(title);
        setEditing(true);
      }}
      className="min-w-0 truncate rounded px-1 -mx-1 text-left text-sm font-semibold text-foreground enabled:hover:bg-accent"
      title={title}
    >
      {title}
    </button>
  );
}
