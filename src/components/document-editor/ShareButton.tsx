"use client";

import { ShareResourceModal } from "@/components/community/ShareResourceModal";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ShareResourceRequest } from "@/services/api/community.service";
import type {
  DocumentSharedScope,
  SharedResourceStatus,
} from "@/shared/types/document";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { submitResource, unshareDocumentResource } from "@/store/community";
import {
  fetchDocument,
  syncDocumentSharingState,
} from "@/store/documents/documentSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectHasAccessibleOrganization,
  selectWorkspaceContext,
} from "@/store/workspace/selectors";
import type { RootState } from "@/store/store";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import posthog from "posthog-js";

interface ShareButtonProps {
  title: string;
  content: string;
  disabled?: boolean;
  documentId?: string;
  grade?: string;
  subject?: string;
  resourceType?: string;
  /** Status as fetched from the document (may be null if not yet shared) */
  sharedStatus?: SharedResourceStatus | undefined | null;
  className?: string;
}

function getSharedScopes(
  scope: ShareResourceRequest["libraryScope"],
  fallbackScope?: DocumentSharedScope,
): DocumentSharedScope[] {
  if (scope === "both") {
    return ["community", "organization"];
  }

  if (scope === "community" || scope === "organization") {
    return [scope];
  }

  return fallbackScope ? [fallbackScope] : [];
}

function ShareButtonComponent({
  title,
  content,
  disabled = false,
  documentId,
  grade = "",
  subject = "",
  resourceType = "",
  sharedStatus,
  className = "",
}: ShareButtonProps) {
  const dispatch = useAppDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isUnshareConfirmOpen, setIsUnshareConfirmOpen] = useState(false);
  const [isUnsharing, setIsUnsharing] = useState(false);
  // Local status set immediately from the submitResource response, overrides the prop
  const [localStatus, setLocalStatus] = useState<
    SharedResourceStatus | "UNSHARED" | null
  >(null);
  const workspace = useAppSelector(selectWorkspaceContext);
  const hasAccessibleOrganization = useAppSelector(selectHasAccessibleOrganization);

  // Check feature flag — if community library is OFF, hide the button entirely
  const features = useSelector((state: RootState) => state.features.flags);
  const isCommunityEnabled = features[FeatureFlag.COMMUNITY_LIBRARY] === true;

  // Effective status: prefer local (just submitted/unshared) over prop (from last fetch)
  // "UNSHARED" is a local-only sentinel that means "we just removed the share —
  // treat the document as unshared even if the prop still says APPROVED".
  const effectiveStatus =
    localStatus === "UNSHARED" ? null : (localStatus ?? sharedStatus);

  useEffect(() => {
    setLocalStatus(null);
  }, [documentId]);

  const openShareModal = useCallback(() => {
    if (!title || !content) {
      toast.error("Documento deve ter título e conteúdo para ser partilhado");
      return;
    }
    setIsModalOpen(true);
  }, [title, content]);

  const handleShareSubmit = useCallback(
    async (request: ShareResourceRequest) => {
      setIsSharing(true);
      try {
        const result = await dispatch(submitResource(request)).unwrap();
        setIsModalOpen(false);
        setLocalStatus(result.status as SharedResourceStatus);
        if (documentId) {
          dispatch(
            syncDocumentSharingState({
              documentId,
              sharedResourceStatus: result.status as SharedResourceStatus,
              sharedResourceId: result.id ?? null,
              sharedScopes: getSharedScopes(request.libraryScope, result.libraryScope),
            }),
          );
          void dispatch(fetchDocument(documentId));
        }
        posthog.capture("document_shared_to_community", {
          resource_type: resourceType,
          grade,
          subject,
          submission_status: result.status,
          document_id: documentId,
        });
        if (result.status === "APPROVED") {
          toast.success("Recurso publicado na biblioteca comunitária!");
        } else {
          toast.success("Recurso submetido para revisão! Receberá notificação em 24-48h.");
        }
      } catch (error) {
        posthog.captureException(error);
        toast.error(
          error instanceof Error ? error.message : "Erro ao partilhar recurso"
        );
      } finally {
        setIsSharing(false);
      }
    },
    [dispatch, resourceType, grade, subject, documentId]
  );

  const handleUnshareConfirm = useCallback(async () => {
    if (!documentId) {
      toast.error("Nao foi possivel identificar o documento.");
      setIsUnshareConfirmOpen(false);
      return;
    }
    setIsUnsharing(true);
    try {
      await dispatch(unshareDocumentResource(documentId)).unwrap();
      setLocalStatus("UNSHARED");
      dispatch(
        syncDocumentSharingState({
          documentId,
          sharedResourceStatus: null,
          sharedResourceId: null,
          sharedScopes: [],
        }),
      );
      void dispatch(fetchDocument(documentId));
      posthog.capture("document_unshared_from_community", {
        resource_type: resourceType,
        document_id: documentId,
      });
      toast.success("Recurso removido das bibliotecas.");
    } catch (error) {
      posthog.captureException(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel deixar de partilhar o recurso."
      );
    } finally {
      setIsUnsharing(false);
      setIsUnshareConfirmOpen(false);
    }
  }, [dispatch, documentId, resourceType]);

  // If community library feature is disabled, hide the button entirely
  if (!isCommunityEnabled) {
    return null;
  }

  const isShared =
    effectiveStatus === "APPROVED" || effectiveStatus === "PENDING";

  const shareModal = (
    <ShareResourceModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onSubmit={handleShareSubmit}
      isLoading={isSharing}
      initialContent={content}
      initialTitle={title}
      initialGrade={grade}
      initialSubject={subject}
      initialResourceType={resourceType}
      libraryScope={hasAccessibleOrganization ? "both" : "community"}
      allowOrganizationScope={hasAccessibleOrganization}
      organizationName={workspace?.organization?.name ?? null}
      documentId={documentId}
    />
  );

  const unshareDialog = (
    <ConfirmationDialog
      isOpen={isUnshareConfirmOpen}
      onClose={() => {
        if (!isUnsharing) {
          setIsUnshareConfirmOpen(false);
        }
      }}
      onConfirm={handleUnshareConfirm}
      title="Deixar de partilhar este recurso?"
      description="O recurso sera removido das bibliotecas onde foi partilhado. Pode voltar a partilhar mais tarde."
      confirmLabel={isUnsharing ? "A remover..." : "Deixar de partilhar"}
      variant="danger"
    />
  );

  if (isShared) {
    const isPending = effectiveStatus === "PENDING";
    const statusIcon = isPending ? (
      <Clock className="h-4 w-4" />
    ) : (
      <CheckCircle2 className="h-4 w-4" />
    );
    const statusLabel = isPending ? "Em revisao" : "Publicado";
    const statusClasses = isPending
      ? "text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/50"
      : "text-green-700 border-green-300 bg-green-50 hover:bg-green-100 hover:text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/50";

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isUnsharing}
              className={`flex items-center gap-2 ${statusClasses} ${className}`}
              aria-label={`Gerir partilha - ${statusLabel}`}
            >
              {statusIcon}
              <span className="hidden sm:inline">{statusLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onSelect={() => {
                // Defer opening the modal until after Radix finishes tearing
                // down the dropdown — otherwise the dropdown's pointer-events
                // cleanup clashes with the dialog's focus lock and the whole
                // app becomes unclickable until a refresh.
                setTimeout(() => {
                  openShareModal();
                }, 0);
              }}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              <span>Alterar destino</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setTimeout(() => {
                  setIsUnshareConfirmOpen(true);
                }, 0);
              }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Deixar de partilhar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {shareModal}
        {unshareDialog}
      </>
    );
  }

  // REJECTED or no status — show normal share button
  const isDisabled = disabled || isSharing || !title || !content;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={openShareModal}
        className={`flex items-center gap-2 ${className}`}
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isSharing ? "A partilhar..." : "Partilhar"}
        </span>
      </Button>

      {shareModal}
    </>
  );
}

const ShareButton = memo(ShareButtonComponent);
ShareButton.displayName = "ShareButton";

export default ShareButton;
