"use client";

import { ShareResourceModal } from "@/components/community/ShareResourceModal";
import { Button } from "@/components/ui/button";
import type { ShareResourceRequest } from "@/services/api/community.service";
import type { SharedResourceStatus } from "@/shared/types/document";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { submitResource } from "@/store/community";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { CheckCircle2, Clock, Share2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
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
  // Local status set immediately from the submitResource response, overrides the prop
  const [localStatus, setLocalStatus] = useState<SharedResourceStatus | null>(null);

  // Check feature flag — if community library is OFF, hide the button entirely
  const features = useSelector((state: RootState) => state.features.flags);
  const isCommunityEnabled = features[FeatureFlag.COMMUNITY_LIBRARY] === true;

  // Effective status: prefer local (just submitted) over prop (from last fetch)
  const effectiveStatus = localStatus ?? sharedStatus;

  const handleShareClick = useCallback(() => {
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

  // If community library feature is disabled, hide the button entirely
  if (!isCommunityEnabled) {
    return null;
  }

  if (effectiveStatus === "PENDING") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`flex items-center gap-2 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 ${className}`}
      >
        <Clock className="h-4 w-4" />
        <span className="hidden sm:inline">Em revisão</span>
      </Button>
    );
  }

  if (effectiveStatus === "APPROVED") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`flex items-center gap-2 text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400 ${className}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="hidden sm:inline">Publicado</span>
      </Button>
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
        onClick={handleShareClick}
        className={`flex items-center gap-2 ${className}`}
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isSharing ? "A partilhar..." : "Partilhar"}
        </span>
      </Button>

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
        documentId={documentId}
      />
    </>
  );
}

export const ShareButton = memo(ShareButtonComponent);
ShareButton.displayName = "ShareButton";

export default ShareButton;