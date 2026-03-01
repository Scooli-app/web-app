/**
 * Share Button Component
 * Button for sharing AI-generated content with Community Library
 * Appears in editor toolbar next to export button
 */

"use client";

import { ShareResourceModal } from "@/components/community/ShareResourceModal";
import { Button } from "@/components/ui/button";
import { submitResource } from "@/store/community";
import { useAppDispatch } from "@/store/hooks";
import type { ShareResourceRequest } from "@/services/api/community.service";
import { Share2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  content: string;
  disabled?: boolean;
  documentId?: string;
  className?: string;
}

function ShareButtonComponent({ 
  title, 
  content, 
  disabled = false,
  documentId,
  className = ""
}: ShareButtonProps) {
  const dispatch = useAppDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleShareClick = useCallback(() => {
    if (!title || !content) {
      toast.error("Documento deve ter título e conteúdo para ser partilhado");
      return;
    }
    setIsModalOpen(true);
  }, [title, content]);

  const handleShareSubmit = useCallback(async (request: ShareResourceRequest) => {
    setIsSharing(true);
    
    try {
      await dispatch(submitResource(request)).unwrap();
      setIsModalOpen(false);
      toast.success(
        "Recurso submetido para revisão! Receberá notificação em 24-48h."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao partilhar recurso"
      );
    } finally {
      setIsSharing(false);
    }
  }, [dispatch]);

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
          {isSharing ? "Partilhando..." : "Partilhar"}
        </span>
      </Button>

      <ShareResourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleShareSubmit}
        isLoading={isSharing}
        initialContent={content}
        documentId={documentId}
      />
    </>
  );
}

export const ShareButton = memo(ShareButtonComponent);
ShareButton.displayName = "ShareButton";

export default ShareButton;