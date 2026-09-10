/**
 * Share Resource Modal Component
 *
 * Modal form for sharing AI-generated content with the community or school library.
 *
 * When the user belongs to an organization, the modal renders a two-step flow:
 *   Step 1 — destination picker (Todas / Biblioteca comunitaria / Biblioteca de <org>)
 *   Step 2 — the existing form (title, grade, subject, etc.)
 *
 * When the user does NOT belong to an organization the modal renders the
 * single-step form targeting the community library, matching the previous UX.
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GRADE_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  SUBJECT_OPTIONS,
  type ShareDestination,
  type ShareResourceRequest,
} from "@/services/api/community.service";
import { cn } from "@/shared/utils/utils";
import { ArrowLeft, Building2, Globe2, Share2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface ShareResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: ShareResourceRequest) => void;
  isLoading?: boolean;
  initialContent?: string;
  initialTitle?: string;
  initialGrade?: string;
  initialSubject?: string;
  initialResourceType?: string;
  /**
   * Initial destination for the form. When `allowOrganizationScope` is true the
   * modal always starts on step 1 (the destination picker) regardless of this
   * value, so callers can leave it at the default.
   */
  libraryScope?: ShareDestination;
  /**
   * When true the modal shows the two-step flow with the 3 destination cards.
   * Should be set to true whenever the signed-in user has an active organization
   * workspace.
   */
  allowOrganizationScope?: boolean;
  organizationName?: string | null;
  documentId?: string;
}

interface DestinationOption {
  value: ShareDestination;
  title: string;
  hint: string;
  icon: typeof Globe2;
  cardClassName: string;
  iconClassName: string;
}

type ShareModalTranslate = (key: string, values?: Record<string, string | number>) => string;

function getDestinationOptions(
  organizationName: string | null,
  t: ShareModalTranslate,
): DestinationOption[] {
  const orgLabel = organizationName
    ? t("orgLibraryLabel", { name: organizationName })
    : t("schoolLibraryLabel");

  return [
    {
      value: "both",
      title: t("destinationAll"),
      hint: t("destinationAllHint"),
      icon: Sparkles,
      cardClassName:
        "border-primary/30 bg-primary/10 hover:border-primary/45 hover:bg-primary/14",
      iconClassName:
        "border-primary/25 bg-primary/15 text-primary",
    },
    {
      value: "community",
      title: t("destinationCommunity"),
      hint: t("destinationCommunityHint"),
      icon: Globe2,
      cardClassName:
        "border-teal-500/30 bg-teal-500/10 hover:border-teal-500/45 hover:bg-teal-500/14",
      iconClassName:
        "border-teal-500/25 bg-teal-500/15 text-teal-700 dark:text-teal-300",
    },
    {
      value: "organization",
      title: orgLabel,
      hint: t("destinationOrgHint"),
      icon: Building2,
      cardClassName:
        "border-amber-400/35 bg-amber-400/10 hover:border-amber-400/50 hover:bg-amber-400/14",
      iconClassName:
        "border-amber-400/25 bg-amber-400/15 text-amber-700 dark:text-amber-300",
    },
  ];
}

export function ShareResourceModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialContent = "",
  initialTitle = "",
  initialGrade = "",
  initialSubject = "",
  initialResourceType = "",
  libraryScope = "community",
  allowOrganizationScope = false,
  organizationName = null,
  documentId,
}: ShareResourceModalProps) {
  const t = useTranslations("community.shareModal");
  const tResourceTypes = useTranslations("community.resourceCard.resourceTypes");
  const tFilters = useTranslations("community.filters");
  const defaultDestination: ShareDestination = allowOrganizationScope
    ? "both"
    : libraryScope;

  const [formData, setFormData] = useState<ShareResourceRequest>({
    title: initialTitle,
    description: "",
    content: initialContent,
    grade: initialGrade,
    subject: initialSubject,
    resourceType: initialResourceType,
    libraryScope: defaultDestination,
    documentId,
  });

  const [step, setStep] = useState<1 | 2>(allowOrganizationScope ? 1 : 2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const destinationOptions = useMemo(
    () => getDestinationOptions(organizationName, t),
    [organizationName, t],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      content: initialContent,
      title: initialTitle || prev.title,
      grade: initialGrade || prev.grade,
      subject: initialSubject || prev.subject,
      resourceType: initialResourceType || prev.resourceType,
      libraryScope: prev.libraryScope ?? defaultDestination,
      documentId,
    }));
    setStep(allowOrganizationScope ? 1 : 2);
    setErrors({});
  }, [
    allowOrganizationScope,
    defaultDestination,
    documentId,
    initialContent,
    initialGrade,
    initialResourceType,
    initialSubject,
    initialTitle,
    isOpen,
  ]);

  const currentDestination: ShareDestination =
    formData.libraryScope ?? defaultDestination;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t("titleRequired");
    }
    if (!formData.grade) {
      newErrors.grade = t("gradeRequired");
    }
    if (!formData.subject) {
      newErrors.subject = t("subjectRequired");
    }
    if (!formData.resourceType) {
      newErrors.resourceType = t("typeRequired");
    }
    if (!formData.content.trim()) {
      newErrors.content = t("contentRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      libraryScope: currentDestination,
    });
  };

  const handleClose = () => {
    if (isLoading) {
      return;
    }

    onClose();
    setFormData({
      title: "",
      description: "",
      content: "",
      grade: "",
      subject: "",
      resourceType: "",
      libraryScope: defaultDestination,
      documentId: undefined,
    });
    setErrors({});
    setStep(allowOrganizationScope ? 1 : 2);
  };

  const handleSelectDestination = (destination: ShareDestination) => {
    setFormData((prev) => ({ ...prev, libraryScope: destination }));
    setStep(2);
  };

  const modalTitle = (() => {
    if (allowOrganizationScope && step === 1) {
      return t("whereToShareTitle");
    }
    if (currentDestination === "organization") {
      return t("shareWithOrgTitle", { name: organizationName ?? t("schoolFallback") });
    }
    if (currentDestination === "both") {
      return t("shareAllTitle");
    }
    return t("shareCommunityTitle");
  })();

  const modalDescription = (() => {
    if (allowOrganizationScope && step === 1) {
      return t("whereToShareDescription");
    }
    if (currentDestination === "organization") {
      return t("shareWithOrgDescription", { name: organizationName ?? t("schoolFallbackPossessive") });
    }
    if (currentDestination === "both") {
      return t("shareAllDescription");
    }
    return t("shareCommunityDescription");
  })();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border/70 bg-muted/40 px-6 py-5 pr-14">
          <div className="flex items-center gap-3">
            {allowOrganizationScope && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {step}/2
              </span>
            )}
            <DialogTitle className="flex min-w-0 items-center gap-2 text-lg">
              <Share2 className="h-5 w-5 shrink-0" />
              <span className="truncate">{modalTitle}</span>
            </DialogTitle>
          </div>
          <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
            {modalDescription}
          </DialogDescription>
          {allowOrganizationScope && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>
          )}
        </DialogHeader>

        {allowOrganizationScope && step === 1 ? (
          <div className="space-y-3 px-6 pb-6 pt-4 pr-14">
            {destinationOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = currentDestination === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSelectDestination(option.value)}
                  className={cn(
                    "group flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60",
                    option.cardClassName,
                    isSelected ? "ring-2 ring-primary/30" : "",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-[1.02]",
                      option.iconClassName,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold">{option.title}</div>
                    <div className="mt-1 text-sm leading-5 text-muted-foreground">
                      {option.hint}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6 pt-4 pr-14">
            <div className="space-y-1.5">
              <Label htmlFor="share-title">
                {t("titleLabel")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="share-title"
                type="text"
                placeholder={t("titlePlaceholder")}
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-description">
                {t("descriptionLabel")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("optional")}
                </span>
              </Label>
              <Textarea
                id="share-description"
                placeholder={t("descriptionPlaceholder")}
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>
                  {t("gradeLabel")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.grade || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, grade: value }))
                  }
                >
                  <SelectTrigger className={errors.grade ? "border-destructive" : ""}>
                    <SelectValue placeholder={t("gradePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {tFilters("gradeOption", { n: option.value })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grade ? (
                  <p className="text-xs text-destructive">{errors.grade}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>
                  {t("subjectLabel")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.subject || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, subject: value }))
                  }
                >
                  <SelectTrigger className={errors.subject ? "border-destructive" : ""}>
                    <SelectValue placeholder={t("subjectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subject ? (
                  <p className="text-xs text-destructive">{errors.subject}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>
                  {t("typeLabel")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.resourceType || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, resourceType: value }))
                  }
                >
                  <SelectTrigger
                    className={errors.resourceType ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder={t("typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {tResourceTypes(`${option.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.resourceType ? (
                  <p className="text-xs text-destructive">{errors.resourceType}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
              <p className="mb-2 font-medium text-foreground">
                {currentDestination === "organization"
                  ? t("orgLibraryHeading")
                  : currentDestination === "both"
                    ? t("combinedShareHeading")
                    : t("reviewProcessHeading")}
              </p>
              {currentDestination === "organization" ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(t.raw("orgBullets") as string[]).map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : currentDestination === "both" ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(t.raw("bothBullets") as string[]).map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {(t.raw("communityBullets") as string[]).map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {allowOrganizationScope && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("back")}
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isLoading} className="min-w-32">
                  {isLoading
                    ? t("submitting")
                    : currentDestination === "organization"
                      ? t("submitOrg")
                      : currentDestination === "both"
                        ? t("submitAll")
                        : t("submitCommunity")}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
