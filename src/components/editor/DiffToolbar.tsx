"use client";

import type { Editor } from "@tiptap/react";
import { memo } from "react";
import { getDiffState } from "./extensions/DiffExtension";
import posthog from "posthog-js";

interface DiffToolbarProps {
  editor: Editor;
  onExitDiffMode: () => void;
}

/**
 * Toolbar shown above the editor during "suggestions mode".
 * Provides Accept All, Reject All, and Exit controls.
 */
export const DiffToolbar = memo(function DiffToolbar({
  editor,
  onExitDiffMode,
}: DiffToolbarProps) {
  const diffState = getDiffState(editor.state);
  const changesCount = diffState?.changes.length ?? 0;

  if (!diffState?.active) return null;

  const handleAcceptAll = () => {
    posthog.capture("ai_suggestion_accepted_all", { changes_count: changesCount });
    editor.commands.acceptAllChanges();
    onExitDiffMode();
  };

  const handleRejectAll = () => {
    posthog.capture("ai_suggestion_rejected_all", { changes_count: changesCount });
    editor.commands.rejectAllChanges();
    onExitDiffMode();
  };

  const handleExit = () => {
    editor.commands.acceptAllChanges();
    onExitDiffMode();
  };

  return (
    <div className="diff-toolbar">
      <div className="diff-toolbar-info">
        <span className="diff-toolbar-badge">
          ✨ Modo Sugestões
        </span>
        <span className="diff-toolbar-count">
          {changesCount} {changesCount === 1 ? "alteração" : "alterações"}
        </span>
      </div>
      <div className="diff-toolbar-actions">
        <button
          onClick={handleAcceptAll}
          className="diff-toolbar-btn diff-toolbar-btn-accept"
          type="button"
        >
          ✓ Aceitar todas
        </button>
        <button
          onClick={handleRejectAll}
          className="diff-toolbar-btn diff-toolbar-btn-reject"
          type="button"
        >
          ✗ Rejeitar todas
        </button>
        <button
          onClick={handleExit}
          className="diff-toolbar-btn diff-toolbar-btn-exit"
          type="button"
        >
          ✕ Sair
        </button>
      </div>
    </div>
  );
});
