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
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingTitle(title);
  }, [title]);

  const handleTitleClick = () => {
    setIsEditing(true);
    setEditingTitle(title);
    // Focus the input after a brief delay to ensure it's rendered
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

    // Check character limit
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

  return (
    <div className="flex items-center space-x-3 m-1.5">
      {isEditing ? (
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Input
              ref={titleInputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              maxLength={MAX_LENGTHS.DOCUMENT_TITLE}
              className="text-3xl font-bold text-foreground bg-background border-2 border-primary rounded-lg px-4 py-2 min-w-[300px]"
              placeholder="Título do documento..."
            />
            <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">
              {editingTitle.length}/{MAX_LENGTHS.DOCUMENT_TITLE}
            </div>
          </div>
          <Edit3 className="h-6 w-6 text-primary" />
        </div>
      ) : (
        <StreamingText
          text={title || defaultTitle}
          isStreaming={isStreaming}
          as="h1"
          className="text-3xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={handleTitleClick}
        />
      )}
      {isSaving && (
        <div className="flex items-center text-muted-foreground">
          <Save className="h-4 w-4 mr-2" />
          <span className="text-sm">A guardar...</span>
        </div>
      )}
    </div>
  );
}
