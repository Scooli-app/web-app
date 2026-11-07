import type { ChainedCommands, Editor } from "@tiptap/core";

/**
 * Runs a toolbar command with the editor focused, without `chain().focus()`.
 *
 * On iOS and Android, Tiptap's `focus()` focuses the DOM inside the chain. The
 * focus transaction can change the document first (the trailing paragraph), so
 * the chain's own transaction no longer matches the state and ProseMirror throws
 * "Applying a mismatched transaction". Focusing first lets the chain start from
 * the state after the focus.
 */
export function runFocusedChain(
  editor: Editor,
  command: (chain: ChainedCommands) => ChainedCommands,
): boolean {
  if (editor.view.hasFocus()) return command(editor.chain()).run();
  editor.view.focus();
  return command(editor.chain()).scrollIntoView().run();
}
