"use client";

import {
  GRADE_GROUPS,
  SUBJECTS,
  SUBJECTS_BY_GRADE,
  translateGradeGroupLabel,
  translateGradeLabel,
  translateSubjectCategory,
  translateSubjectLabel,
} from "@/components/document-creation/constants";
import { documentTypes } from "@/components/document-creation/documentTypes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getUploadUrl,
  importDocument,
  waitForDocument,
} from "@/services/api/document.service";
import type { DocumentType, WorksheetVariant } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { selectIsWorksheetCreationEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { AlertCircle, FilePlus, Loader2, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const WORKSHEET_VARIANT_KEYS: Array<{
  value: Exclude<WorksheetVariant, "assessment">;
}> = [
  { value: "practice" },
  { value: "diagnostic" },
  { value: "formative" },
  { value: "exploration" },
];

export function UploadDocumentModal({
  isOpen,
  onClose,
}: UploadDocumentModalProps) {
  const t = useTranslations("modals.uploadDocument");
  const tEnums = useTranslations("enums");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [worksheetVariant, setWorksheetVariant] = useState<
    WorksheetVariant | ""
  >("");
  const [schoolYear, setSchoolYear] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [usageIntent, setUsageIntent] = useState<
    "reference" | "standing_context"
  >("reference");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWorksheetCreationEnabled = useAppSelector(
    selectIsWorksheetCreationEnabled
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableDocumentTypes = useMemo(
    () =>
      Object.values(documentTypes).filter(
        (type) => type.id !== "worksheet" || isWorksheetCreationEnabled
      ),
    [isWorksheetCreationEnabled]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFile(null);
    setTitle("");
    setDocumentType("");
    setWorksheetVariant("");
    setSchoolYear("");
    setSubject("");
    setUsageIntent("reference");
    setError(null);
    setIsUploading(false);
  }, [isOpen]);

  useEffect(() => {
    if (schoolYear && subject) {
      const validSubjects = SUBJECTS_BY_GRADE[schoolYear];
      if (validSubjects && !validSubjects.includes(subject)) {
        setSubject("");
      }
    }
  }, [schoolYear, subject]);

  useEffect(() => {
    if (documentType !== "worksheet" && worksheetVariant) {
      setWorksheetVariant("");
    }
  }, [documentType, worksheetVariant]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError(t("errorInvalidType"));
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(t("errorFileTooLarge"));
      setFile(null);
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    const droppedFile = event.dataTransfer.files?.[0];
    if (!droppedFile) {
      return;
    }

    if (!ALLOWED_TYPES.includes(droppedFile.type)) {
      setError(t("errorInvalidType"));
      return;
    }

    if (droppedFile.size > MAX_FILE_SIZE) {
      setError(t("errorFileTooLarge"));
      return;
    }

    setFile(droppedFile);
    if (!title) {
      setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setError(t("errorSelectFile"));
      return;
    }

    if (!title || !documentType || !schoolYear || !subject) {
      setError(t("errorFillRequired"));
      return;
    }

    if (documentType === "worksheet" && !worksheetVariant) {
      setError(t("errorSelectWorksheetGoal"));
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const subjectValue =
        SUBJECTS.find((item) => item.id === subject)?.value || subject;

      const importPromise = (async () => {
        const { uploadUrl, fileKey } = await getUploadUrl(
          file.name,
          file.type,
          documentType
        );

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(t("errorUploadFailed"));
        }

        const { id } = await importDocument({
          title,
          documentType,
          subject: subjectValue,
          schoolYear: parseInt(schoolYear, 10),
          fileKey,
          worksheetVariant:
            documentType === "worksheet" ? worksheetVariant || undefined : undefined,
          usageIntent,
        });

        await waitForDocument(id);
      })();

      toast.promise(
        importPromise.then(() => {
          window.location.reload();
        }),
        {
          loading: t("toastLoading"),
          success: t("toastSuccess"),
          error: (err: Error) => err.message || t("toastError"),
        }
      );

      onClose();
    } catch (err: unknown) {
      console.error("Import failed entirely:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid =
    !!file &&
    !!title &&
    !!documentType &&
    !!schoolYear &&
    !!subject &&
    (documentType !== "worksheet" || !!worksheetVariant);

  return (
    <Dialog open={isOpen} onOpenChange={isUploading ? undefined : onClose}>
      <DialogContent className="max-w-md overflow-y-auto p-0">
        <div className="border-b border-border px-6 pb-4 pt-6 pr-14">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UploadCloud className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {t("title")}
            </DialogTitle>
          </div>
          <DialogDescription className="ml-12 text-sm text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6 pr-14">
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all",
                file
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50",
                error && !file && "border-destructive/50 bg-destructive/5"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />

              {file ? (
                <div className="flex w-full items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FilePlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <UploadCloud className="h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {t("dropzone.dragText")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("dropzone.hint")}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/60 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {t("warningText")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">
                {t("titleLabel")}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("titlePlaceholder")}
                disabled={isUploading}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="docType" className="text-sm">
                  {t("convertToLabel")}
                </Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as DocumentType)}
                  disabled={isUploading}
                >
                  <SelectTrigger id="docType">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDocumentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {tEnums(`documentType.${type.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="schoolYear" className="text-sm">
                  {t("schoolYearLabel")}
                </Label>
                <Select
                  value={schoolYear}
                  onValueChange={setSchoolYear}
                  disabled={isUploading}
                >
                  <SelectTrigger id="schoolYear" className="h-10">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {GRADE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="mb-1 border-b border-border/50 bg-background px-2 py-2 text-xs font-bold text-primary">
                          {translateGradeGroupLabel(group.groupId)}
                        </SelectLabel>
                        {group.grades.map((grade) => (
                          <SelectItem
                            key={grade.id}
                            value={grade.id}
                            className="cursor-pointer rounded-md py-2 pl-4 pr-3 text-sm focus:bg-accent focus:text-primary"
                          >
                            {translateGradeLabel(grade.id)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {documentType === "worksheet" && (
              <div className="space-y-1.5">
                <Label htmlFor="worksheetVariant" className="text-sm">
                  {t("worksheetGoalLabel")}
                </Label>
                <Select
                  value={worksheetVariant}
                  onValueChange={(value) =>
                    setWorksheetVariant(value as WorksheetVariant)
                  }
                  disabled={isUploading}
                >
                  <SelectTrigger id="worksheetVariant" className="h-10">
                    <SelectValue placeholder={t("selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSHEET_VARIANT_KEYS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(`worksheetVariantOptions.${option.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-sm">
                {t("subjectLabel")}
              </Label>
              <Select
                value={subject}
                onValueChange={setSubject}
                disabled={!schoolYear || isUploading}
              >
                <SelectTrigger id="subject" className="h-10">
                  <SelectValue
                    placeholder={
                      !schoolYear
                        ? t("selectYearFirstPlaceholder")
                        : t("selectPlaceholder")
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {schoolYear &&
                    (() => {
                      const validSubjectsIds = SUBJECTS_BY_GRADE[schoolYear] || [];
                      const validSubjects = SUBJECTS.filter((item) =>
                        validSubjectsIds.includes(item.id)
                      );
                      const categories = [
                        ...new Set(validSubjects.map((item) => item.category)),
                      ];

                      return categories.map((category) => (
                        <SelectGroup key={category}>
                          <SelectLabel className="mb-1 border-b border-border/50 bg-background px-2 py-2 text-xs font-bold text-primary">
                            {translateSubjectCategory(category)}
                          </SelectLabel>
                          {validSubjects
                            .filter((item) => item.category === category)
                            .map((item) => (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                                className="cursor-pointer rounded-md py-2 pl-4 pr-3 text-sm focus:bg-accent focus:text-primary"
                              >
                                {translateSubjectLabel(item.id)}
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      ));
                    })()}
                </SelectContent>
              </Select>
            </div>

            {/* Usage intent — SCOOL-108 */}
            <div className="space-y-2">
              <Label className="text-sm">{t("usageIntentLabel")}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm">
                  <input
                    type="radio"
                    name="usageIntent"
                    value="reference"
                    checked={usageIntent === "reference"}
                    onChange={() => setUsageIntent("reference")}
                    className="mt-1 accent-primary"
                    disabled={isUploading}
                  />
                  <span>
                    <span className="font-medium">{t("usageIntent.referenceTitle")}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t("usageIntent.referenceDescription")}
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm">
                  <input
                    type="radio"
                    name="usageIntent"
                    value="standing_context"
                    checked={usageIntent === "standing_context"}
                    onChange={() => setUsageIntent("standing_context")}
                    className="mt-1 accent-primary"
                    disabled={isUploading}
                  />
                  <span>
                    <span className="font-medium">{t("usageIntent.standingTitle")}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t("usageIntent.standingDescription")}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 px-6 pb-6 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!isFormValid || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("importing")}
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {t("importAndConvert")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
