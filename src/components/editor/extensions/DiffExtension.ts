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
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
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
  changes: DiffChange[],
): DecorationSet {
  if (changes.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  const docSize = state.doc.content.size;

  for (const change of changes) {
    if (change.type === "insert" || change.type === "replace") {
      const from = Math.max(0, Math.min(change.fromB, docSize));
      const to = Math.max(from, Math.min(change.toB, docSize));

      if (from < to) {
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock) {
            const blockStart = pos + 1;
            const blockEnd = pos + node.nodeSize - 1;
            const decoFrom = Math.max(from, blockStart);
            const decoTo = Math.min(to, blockEnd);

            if (decoFrom < decoTo) {
              decorations.push(
                Decoration.inline(decoFrom, decoTo, {
                  class: "diff-insert",
                  "data-diff-id": change.id,
                }),
              );
            }
            return false;
          }
          return true;
        });
      }
    }

    if (change.type === "delete" || change.type === "replace") {
      const pos = Math.max(0, Math.min(change.fromB, docSize));
      decorations.push(
        Decoration.widget(pos, createDeleteWidget(change), {
          id: `del-${change.id}`,
          side: -1,
        }),
      );
    }

    const actionPos = Math.max(0, Math.min(change.toB, docSize));
    decorations.push(
      Decoration.widget(actionPos, createActionWidget(change.id), {
        id: `actions-${change.id}`,
        side: 1,
      }),
    );
  }

  return DecorationSet.create(state.doc, decorations);
}

function createDeleteWidget(
  change: DiffChange,
): (view: import("@tiptap/pm/view").EditorView) => HTMLElement {
  return (view) => {
    const text = change.deletedSlice ? sliceToText(change.deletedSlice) : "";
    const isLargeDeletion =
      text.length > 100 ||
      (change.deletedSlice && change.deletedSlice.content.childCount > 1);

    if (isLargeDeletion && change.deletedSlice) {
      const wrapper = document.createElement("div");
      wrapper.className = "diff-delete-block";
      wrapper.setAttribute("data-diff-id", change.id);
      wrapper.contentEditable = "false";

      const label = document.createElement("div");
      label.className = "diff-delete-label";
      label.textContent = "🗑 Conteúdo removido";

      const preview = document.createElement("div");
      preview.className = "diff-delete-content";

      const fragment = renderSlice(change.deletedSlice, view.state.schema);
      preview.appendChild(fragment);

      wrapper.appendChild(label);
      wrapper.appendChild(preview);
      return wrapper;
    } else {
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

function renderSlice(
  slice: import("@tiptap/pm/model").Slice,
  schema: import("@tiptap/pm/model").Schema,
): DocumentFragment | HTMLElement {
  const serializer = DOMSerializer.fromSchema(schema);
  return serializer.serializeFragment(slice.content);
}

function createActionWidget(
  changeId: string,
): (view: import("@tiptap/pm/view").EditorView) => HTMLElement {
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
      setDiffChanges: (changes: DiffChange[]) => ReturnType;
      clearDiffChanges: () => ReturnType;
      acceptChange: (id: string) => ReturnType;
      rejectChange: (id: string) => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
    };
  }
}

export const DiffExtension = Extension.create({
  name: "diff",

  addStorage() {
    return {
      originalContent: null as string | null,
      onDiffStateChange: null as
        | ((active: boolean, count: number) => void)
        | null,
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
              const from = Math.min(change.fromB, docSize);
              const to = Math.min(change.toB, docSize);
              if (from < to) {
                tr.delete(from, to);
              }
            } else if (change.type === "delete") {
              if (change.deletedSlice) {
                const pos = Math.min(change.fromB, docSize);
                tr.insert(pos, change.deletedSlice.content);
              }
            } else if (change.type === "replace") {
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
            tr.setMeta(CLEAR_META, true);
            dispatch(tr);
          }
          return true;
        },

      rejectAllChanges:
        () =>
        ({ editor, tr, dispatch }) => {
          const storage = (
            editor.storage as unknown as Record<
              string,
              { originalContent?: string | null }
            >
          ).diff;
          const originalContent = storage?.originalContent;

          if (dispatch) {
            tr.setMeta(CLEAR_META, true);
            dispatch(tr);
          }

          if (originalContent) {
            editor.commands.setContent(originalContent, { emitUpdate: false });
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { storage } = this;
    const tiptapEditor = this.editor;

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

          apply(
            tr: Transaction,
            prev: DiffPluginState,
            _oldState,
            newState,
          ): DiffPluginState {
            if (tr.getMeta(CLEAR_META)) {
              storage.onDiffStateChange?.(false, 0);
              return {
                changes: [],
                active: false,
                decorations: DecorationSet.empty,
              };
            }

            const newChanges = tr.getMeta(SET_CHANGES_META) as
              | DiffChange[]
              | undefined;
            if (newChanges) {
              const decorations = buildDecorations(newState, newChanges);
              storage.onDiffStateChange?.(true, newChanges.length);
              return {
                changes: newChanges,
                active: true,
                decorations,
              };
            }

            const removeId = tr.getMeta(REMOVE_CHANGE_META) as
              | string
              | undefined;
            if (removeId) {
              const remaining = prev.changes.filter((c) => c.id !== removeId);
              const isActive = remaining.length > 0;

              const remapped = tr.docChanged
                ? remapChanges(remaining, tr)
                : remaining;

              const decorations = buildDecorations(newState, remapped);
              storage.onDiffStateChange?.(isActive, remapped.length);
              return {
                changes: remapped,
                active: isActive,
                decorations,
              };
            }

            if (prev.active && tr.docChanged) {
              const remapped = remapChanges(prev.changes, tr);
              const decorations = buildDecorations(newState, remapped);
              return {
                changes: remapped,
                active: prev.active,
                decorations,
              };
            }

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
            return (
              diffPluginKey.getState(state)?.decorations ?? DecorationSet.empty
            );
          },

          handleDOMEvents: {
            click(_view, event) {
              const target = event.target as HTMLElement;
              const btn = target.closest(".diff-action-btn");
              if (!btn) return false;

              event.preventDefault();
              event.stopPropagation();

              const action = btn.getAttribute("data-action");
              const changeId = btn.getAttribute("data-change-id");
              if (!action || !changeId) return false;

              if (action === "accept") {
                tiptapEditor.commands.acceptChange(changeId);
              } else if (action === "reject") {
                tiptapEditor.commands.rejectChange(changeId);
              }

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

export function getDiffState(state: EditorState): DiffPluginState | undefined {
  return diffPluginKey.getState(state);
}
