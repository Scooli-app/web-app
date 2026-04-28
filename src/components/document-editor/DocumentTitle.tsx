"use client";

import { Input } from "@/components/ui/input";
import { StreamingText } from "@/components/ui/streaming-text";
import { MAX_LENGTHS } from "@/shared/config/constants";
import { Edit3, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DocumentTitleProps {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  isSaving: boolean;
  defaultTitle?: string;
  isStreaming?: boolean;
}

export default function DocumentTitle({
  title,
  onSave,
  isSaving,
  defaultTitle = "Documento",
  isStreaming = false,
}: DocumentTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);
  const [showSaved, setShowSaved] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditingTitle(title);
  }, [title]);

  const handleTitleClick = () => {
    setIsEditing(true);
    setEditingTitle(title);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleTitleSave = async () => {
    if (!editingTitle.trim()) {
      setIsEditing(false);
      return;
    }

    if (editingTitle.length > MAX_LENGTHS.DOCUMENT_TITLE) {
      return;
    }

    try {
      await onSave(editingTitle.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save title:", error);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditingTitle(title);
    }
  };

  const handleTitleBlur = () => {
    handleTitleSave();
  };

  useEffect(() => {
    if (isSaving) {
      setShowSaved(false);
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    } else if (title) {
      setShowSaved(true);
      savedTimerRef.current = setTimeout(() => {
        setShowSaved(false);
      }, 3000);
    }

    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, [isSaving, title]);

  return (
    <div className="mb-2 w-full">
      {isEditing ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start">
          <div className="relative w-full max-w-3xl">
            <Input
              ref={titleInputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              maxLength={MAX_LENGTHS.DOCUMENT_TITLE}
              className="h-12 w-full rounded-lg border-2 border-primary bg-background px-3 py-2 text-xl font-bold text-foreground sm:h-14 sm:px-4 sm:text-3xl"
              placeholder="Título do documento..."
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {editingTitle.length}/{MAX_LENGTHS.DOCUMENT_TITLE}
            </div>
          </div>
          <Edit3 className="hidden h-5 w-5 text-primary sm:block" />
        </div>
      ) : (
        <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <StreamingText
            text={title || defaultTitle}
            isStreaming={isStreaming}
            as="h1"
            className="cursor-pointer break-words text-2xl font-bold text-foreground transition-colors hover:text-primary sm:text-3xl"
            onClick={handleTitleClick}
          />

          <div className="flex min-h-5 items-center">
            {isSaving ? (
              <div className="flex items-center text-muted-foreground/70 animate-pulse">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                <span className="text-xs font-medium">A guardar...</span>
              </div>
            ) : showSaved ? (
              <div className="flex items-center text-primary/70 animate-in fade-in duration-500">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                <span className="text-xs font-medium">Guardado</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
