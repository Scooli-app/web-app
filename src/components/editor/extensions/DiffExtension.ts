/**
 * DiffExtension — Tiptap extension for "suggestions mode".
 *
 * Manages diff state, creates ProseMirror decorations (inline highlights +
 * action widgets), and provides commands to accept/reject changes.
 *
 * Architecture:
 *   - Plugin state stores the current DiffChange[] array
 *   - DecorationSet is rebuilt from DiffChange[] on every state update
 *   - Accept/reject modify the document and remove the change from state
 *   - Positions are remapped after each transaction via appendedTransaction
 */

import { Extension } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { DiffChange } from "../utils/diffEngine";

// ---------------------------------------------------------------------------
// Plugin key & meta
// ---------------------------------------------------------------------------

export const diffPluginKey = new PluginKey<DiffPluginState>("diff");

interface DiffPluginState {
  changes: DiffChange[];
  active: boolean;
  decorations: DecorationSet;
}

const SET_CHANGES_META = "setDiffChanges";
const REMOVE_CHANGE_META = "removeDiffChange";
const CLEAR_META = "clearDiffChanges";

// ---------------------------------------------------------------------------
// Decoration builders
// ---------------------------------------------------------------------------

function buildDecorations(
  state: EditorState,
  changes: DiffChange[]
): DecorationSet {
  if (changes.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  const docSize = state.doc.content.size;

  for (const change of changes) {
    // Insertion/replace decorations (in the new doc, positions are fromB/toB)
    if (change.type === "insert" || change.type === "replace") {
      const from = Math.max(0, Math.min(change.fromB, docSize));
      const to = Math.max(from, Math.min(change.toB, docSize));

      if (from < to) {
        let inlineCount = 0;
        // Walk through text blocks within the range and create per-block
        // inline decorations. Decoration.inline() cannot span block boundaries.
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock) {
            // Clamp the inline decoration to this text block's content
            const blockStart = pos + 1; // inside the node (after opening token)
            const blockEnd = pos + node.nodeSize - 1; // before closing token
            const decoFrom = Math.max(from, blockStart);
            const decoTo = Math.min(to, blockEnd);

            if (decoFrom < decoTo) {
              decorations.push(
                Decoration.inline(decoFrom, decoTo, {
                  class: "diff-insert",
                  "data-diff-id": change.id,
                })
              );
              inlineCount++;
            }
            return false; // don't descend into text block children
          }
          return true; // descend into wrapper nodes (e.g. list, blockquote)
        });

        console.warn(`[DIFF] buildDecorations: change ${change.id} type=${change.type} from=${from} to=${to} docSize=${docSize} inlineDecos=${inlineCount}`);
      }
    }

    // Deletion decorations — show as widget at the deletion point
    if (change.type === "delete" || change.type === "replace") {
      const pos = Math.max(0, Math.min(change.fromB, docSize));
      decorations.push(
        Decoration.widget(pos, createDeleteWidget(change), {
          id: `del-${change.id}`,
          side: -1,
        })
      );
    }

    // Action buttons widget — positioned at the end of the change
    const actionPos = Math.max(0, Math.min(change.toB, docSize));
    decorations.push(
      Decoration.widget(actionPos, createActionWidget(change.id), {
        id: `actions-${change.id}`,
        side: 1,
      })
    );
  }

  console.warn(`[DIFF] buildDecorations total: ${decorations.length} decorations for ${changes.length} changes`);
  return DecorationSet.create(state.doc, decorations);
}

/**
 * Create a DOM element showing deleted content with strikethrough styling.
 * For large deletions (e.g. entire chapters), shows a prominent block.
 */
function createDeleteWidget(change: DiffChange): (view: any) => HTMLElement {
  return (view) => {
    const text = change.deletedSlice ? sliceToText(change.deletedSlice) : "";
    const isLargeDeletion = text.length > 100 || (change.deletedSlice && change.deletedSlice.content.childCount > 1);

    if (isLargeDeletion && change.deletedSlice) {
      // Block-level deletion indicator for large chunks (chapters, sections)
      const wrapper = document.createElement("div");
      wrapper.className = "diff-delete-block";
      wrapper.setAttribute("data-diff-id", change.id);
      wrapper.contentEditable = "false";

      const label = document.createElement("div");
      label.className = "diff-delete-label";
      label.textContent = "🗑 Conteúdo removido";

      const preview = document.createElement("div");
      preview.className = "diff-delete-content";
      
      // Render the deleted slice with full editor formatting
      const fragment = renderSlice(change.deletedSlice, view.state.schema);
      preview.appendChild(fragment);

      wrapper.appendChild(label);
      wrapper.appendChild(preview);
      return wrapper;
    } else {
      // Inline deletion for small changes
      const wrapper = document.createElement("span");
      wrapper.className = "diff-delete";
      wrapper.setAttribute("data-diff-id", change.id);
      
      if (change.deletedSlice) {
        const fragment = renderSlice(change.deletedSlice, view.state.schema);
        wrapper.appendChild(fragment);
      } else {
        wrapper.textContent = "⌫";
      }
      return wrapper;
    }
  };
}

/**
 * Render a ProseMirror Slice to a DOM Fragment using the provided schema.
 */
function renderSlice(slice: any, schema: any): DocumentFragment | HTMLElement {
  const serializer = DOMSerializer.fromSchema(schema);
  return serializer.serializeFragment(slice.content);
}

/**
 * Create accept/reject action buttons for a change.
 */
function createActionWidget(changeId: string): (view: unknown) => HTMLElement {
  return () => {
    const wrapper = document.createElement("span");
    wrapper.className = "diff-actions";
    wrapper.setAttribute("data-diff-actions", changeId);
    wrapper.contentEditable = "false";

    const acceptBtn = document.createElement("button");
    acceptBtn.className = "diff-action-btn diff-action-accept";
    acceptBtn.textContent = "✓";
    acceptBtn.title = "Aceitar alteração";
    acceptBtn.type = "button";
    acceptBtn.setAttribute("data-action", "accept");
    acceptBtn.setAttribute("data-change-id", changeId);

    const rejectBtn = document.createElement("button");
    rejectBtn.className = "diff-action-btn diff-action-reject";
    rejectBtn.textContent = "✗";
    rejectBtn.title = "Rejeitar alteração";
    rejectBtn.type = "button";
    rejectBtn.setAttribute("data-action", "reject");
    rejectBtn.setAttribute("data-change-id", changeId);

    wrapper.appendChild(acceptBtn);
    wrapper.appendChild(rejectBtn);

    return wrapper;
  };
}

/**
 * Extract plain text from a Slice for display in delete widgets.
 */
function sliceToText(slice: import("@tiptap/pm/model").Slice): string {
  const parts: string[] = [];
  slice.content.forEach((node) => {
    if (node.isText) {
      parts.push(node.text || "");
    } else if (node.isBlock) {
      const blockText: string[] = [];
      node.descendants((child) => {
        if (child.isText) {
          blockText.push(child.text || "");
        }
        return true;
      });
      if (blockText.length > 0) {
        parts.push(blockText.join(""));
      }
    }
  });
  return parts.join(" ") || "⌫";
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diff: {
      /**
       * Enter suggestions mode with the given diff changes.
       */
      setDiffChanges: (changes: DiffChange[]) => ReturnType;
      /**
       * Exit suggestions mode, clearing all diff state.
       */
      clearDiffChanges: () => ReturnType;
      /**
       * Accept a single change by ID.
       */
      acceptChange: (id: string) => ReturnType;
      /**
       * Reject a single change by ID.
       */
      rejectChange: (id: string) => ReturnType;
      /**
       * Accept all remaining changes.
       */
      acceptAllChanges: () => ReturnType;
      /**
       * Reject all remaining changes.
       */
      rejectAllChanges: () => ReturnType;
    };
  }
}

export const DiffExtension = Extension.create({
  name: "diff",

  addStorage() {
    return {
      /** Original document content (HTML) before entering diff mode */
      originalContent: null as string | null,
      /** Callback fired when diff state changes */
      onDiffStateChange: null as ((active: boolean, count: number) => void) | null,
    };
  },

  addCommands() {
    return {
      setDiffChanges:
        (changes: DiffChange[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(SET_CHANGES_META, changes);
            dispatch(tr);
          }
          return true;
        },

      clearDiffChanges:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(CLEAR_META, true);
            dispatch(tr);
          }
          return true;
        },

      acceptChange:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const pluginState = diffPluginKey.getState(state);
          if (!pluginState?.active) return false;

          const change = pluginState.changes.find((c) => c.id === id);
          if (!change) return false;

          if (dispatch) {
            // For insertions: content is already in the document, just remove decoration
            // For deletions: content needs to be removed from document (the deleted part
            //   is shown as a widget, not in the doc, so nothing to do for the doc)
            // For replacements: insertion is already in the doc, deletion widget is visual only
            // In our approach (editor shows AI doc), ACCEPT = keep as-is, remove decoration
            tr.setMeta(REMOVE_CHANGE_META, id);
            dispatch(tr);
          }
          return true;
        },

      rejectChange:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const pluginState = diffPluginKey.getState(state);
          if (!pluginState?.active) return false;

          const change = pluginState.changes.find((c) => c.id === id);
          if (!change) return false;

          if (dispatch) {
            const docSize = state.doc.content.size;

            if (change.type === "insert") {
              // Reject insertion: remove the inserted content
              const from = Math.min(change.fromB, docSize);
              const to = Math.min(change.toB, docSize);
              if (from < to) {
                tr.delete(from, to);
              }
            } else if (change.type === "delete") {
              // Reject deletion: re-insert the deleted content
              if (change.deletedSlice) {
                const pos = Math.min(change.fromB, docSize);
                tr.insert(pos, change.deletedSlice.content);
              }
            } else if (change.type === "replace") {
              // Reject replace: remove inserted content, re-insert deleted content
              const from = Math.min(change.fromB, docSize);
              const to = Math.min(change.toB, docSize);
              if (change.deletedSlice) {
                tr.replaceWith(from, to, change.deletedSlice.content);
              } else if (from < to) {
                tr.delete(from, to);
              }
            }

            tr.setMeta(REMOVE_CHANGE_META, id);
            dispatch(tr);
          }
          return true;
        },

      acceptAllChanges:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            // Accept all = keep current content, just clear decorations
            tr.setMeta(CLEAR_META, true);
            dispatch(tr);
          }
          return true;
        },

      rejectAllChanges:
        () =>
        ({ state, dispatch, editor }) => {
          if (dispatch) {
            // Restore original content
            const storage = (editor.storage as unknown as Record<string, { originalContent?: string | null }>).diff;
            const originalContent = storage?.originalContent;
            if (originalContent) {
              // Clear diff state first, then set content
              const tr = state.tr;
              tr.setMeta(CLEAR_META, true);
              dispatch(tr);
              // Restore content after clearing diff state
              editor.commands.setContent(originalContent, { emitUpdate: false });
            } else {
              const tr = state.tr;
              tr.setMeta(CLEAR_META, true);
              dispatch(tr);
            }
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: diffPluginKey,

        state: {
          init(): DiffPluginState {
            return {
              changes: [],
              active: false,
              decorations: DecorationSet.empty,
            };
          },

          apply(tr: Transaction, prev: DiffPluginState, _oldState, newState): DiffPluginState {
            // Handle clear
            if (tr.getMeta(CLEAR_META)) {
              // Notify about state change
              extension.storage.onDiffStateChange?.(false, 0);
              return {
                changes: [],
                active: false,
                decorations: DecorationSet.empty,
              };
            }

            // Handle set changes
            const newChanges = tr.getMeta(SET_CHANGES_META) as DiffChange[] | undefined;
            if (newChanges) {
              const decorations = buildDecorations(newState, newChanges);
              extension.storage.onDiffStateChange?.(true, newChanges.length);
              return {
                changes: newChanges,
                active: true,
                decorations,
              };
            }

            // Handle remove single change
            const removeId = tr.getMeta(REMOVE_CHANGE_META) as string | undefined;
            if (removeId) {
              const remaining = prev.changes.filter((c) => c.id !== removeId);
              const isActive = remaining.length > 0;

              // Remap positions of remaining changes if the transaction modified the doc
              const remapped = tr.docChanged
                ? remapChanges(remaining, tr)
                : remaining;

              const decorations = buildDecorations(newState, remapped);
              extension.storage.onDiffStateChange?.(isActive, remapped.length);
              return {
                changes: remapped,
                active: isActive,
                decorations,
              };
            }

            // If doc changed for other reasons and we have active diff, remap decorations
            if (prev.active && tr.docChanged) {
              const remapped = remapChanges(prev.changes, tr);
              const decorations = buildDecorations(newState, remapped);
              return {
                changes: remapped,
                active: prev.active,
                decorations,
              };
            }

            // Map existing decorations through the transaction mapping
            if (prev.active) {
              return {
                ...prev,
                decorations: prev.decorations.map(tr.mapping, tr.doc),
              };
            }

            return prev;
          },
        },

        props: {
          decorations(state) {
            return diffPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },

          // Handle clicks on accept/reject buttons
          handleDOMEvents: {
            click(view, event) {
              const target = event.target as HTMLElement;
              const btn = target.closest(".diff-action-btn");
              if (!btn) return false;

              event.preventDefault();
              event.stopPropagation();

              const action = btn.getAttribute("data-action");
              const changeId = btn.getAttribute("data-change-id");
              if (!action || !changeId) return false;

              // Use setTimeout to avoid issues with DOM updates during event handling
              setTimeout(() => {
                if (action === "accept") {
                  const cmd = view.state.schema
                    ? (view as import("@tiptap/pm/view").EditorView).dispatch
                    : null;
                  if (cmd) {
                    // Find the extension commands via the editor — we use meta instead
                    const tr = view.state.tr;
                    tr.setMeta(REMOVE_CHANGE_META, changeId);
                    view.dispatch(tr);
                  }
                } else if (action === "reject") {
                  const pluginState = diffPluginKey.getState(view.state);
                  const change = pluginState?.changes.find((c) => c.id === changeId);
                  if (change) {
                    const tr = view.state.tr;
                    const docSize = view.state.doc.content.size;

                    if (change.type === "insert") {
                      const from = Math.min(change.fromB, docSize);
                      const to = Math.min(change.toB, docSize);
                      if (from < to) tr.delete(from, to);
                    } else if (change.type === "delete" && change.deletedSlice) {
                      const pos = Math.min(change.fromB, docSize);
                      tr.insert(pos, change.deletedSlice.content);
                    } else if (change.type === "replace") {
                      const from = Math.min(change.fromB, docSize);
                      const to = Math.min(change.toB, docSize);
                      if (change.deletedSlice) {
                        tr.replaceWith(from, to, change.deletedSlice.content);
                      } else if (from < to) {
                        tr.delete(from, to);
                      }
                    }

                    tr.setMeta(REMOVE_CHANGE_META, changeId);
                    view.dispatch(tr);
                  }
                }
              }, 0);

              return true;
            },
          },
        },
      }),
    ];
  },
});

// ---------------------------------------------------------------------------
// Position remapping
// ---------------------------------------------------------------------------

/**
 * Remap DiffChange positions through a transaction mapping.
 * This keeps positions aligned after the document changes.
 */
function remapChanges(changes: DiffChange[], tr: Transaction): DiffChange[] {
  return changes.map((change) => ({
    ...change,
    fromB: tr.mapping.map(change.fromB, 1),
    toB: tr.mapping.map(change.toB, -1),
  }));
}

// ---------------------------------------------------------------------------
// State accessor
// ---------------------------------------------------------------------------

/**
 * Get the current diff plugin state from an editor state.
 */
export function getDiffState(state: EditorState): DiffPluginState | undefined {
  return diffPluginKey.getState(state);
}
