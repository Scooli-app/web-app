import type { DiffChange } from "@/shared/types/api";
import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

export interface DiffOptions {
  onAccept?: (id: string | number) => void;
  onReject?: (id: string | number) => void;
  onAllReviewed?: () => void;
}

const diffPluginKey = new PluginKey("diff-plugin");

interface DiffPluginState {
  changes: DiffChange[];
  decorations: DecorationSet;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diff: {
      setDiffs: (changes: DiffChange[]) => ReturnType;
      acceptDiff: (id: string | number) => ReturnType;
      rejectDiff: (id: string | number) => ReturnType;
      clearDiffs: () => ReturnType;
    };
  }
}

/**
 * DiffExtension for TipTap
 * Manages insertions, deletions, and replacements with Accept/Reject actions.
 * 
 * Logic:
 * - Diffs are stored in the plugin state.
 * - Each diff is tracked via a ProseMirror decoration.
 * - Rejection: Reverts the document text to the 'oldText' for that segment.
 * - Accept: Simply removes the decoration.
 */
export const DiffExtension = Extension.create<DiffOptions>({
  name: "diff",

  addOptions() {
    return {
      onAccept: undefined,
      onReject: undefined,
      onAllReviewed: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { onAccept, onReject, onAllReviewed } = this.options;

    return [
      new Plugin({
        key: diffPluginKey,
        state: {
          init() {
            return {
              changes: [] as DiffChange[],
              decorations: DecorationSet.empty,
            };
          },
          apply(tr: Transaction, value: DiffPluginState, _oldState: EditorState, newState: EditorState): DiffPluginState {
            // 1. Handle command to set new diffs
            const setMeta = tr.getMeta(diffPluginKey);
            if (setMeta?.type === "SET_DIFFS") {
              const changes = setMeta.changes as DiffChange[];
              const posMap = createPosMap(newState.doc);
              
              const decorations = createDiffDecorations(
                changes,
                newState.doc,
                posMap,
                // These wrappers ensure we use the editor commands to resolve
                (id) => tr.setMeta(diffPluginKey, { type: "RESOLVE", id, accepted: true }),
                (id) => tr.setMeta(diffPluginKey, { type: "RESOLVE", id, accepted: false })
              );
              
              return { changes, decorations };
            }

            // 2. Handle Resolution (Accept/Reject)
            if (setMeta?.type === "RESOLVE") {
              const { id, accepted } = setMeta;
              const remainingChanges = value.changes.filter((c: DiffChange) => c.id !== id);
              
              // Map decorations to new document state
              const mappedDecorations = value.decorations.map(tr.mapping, tr.doc);
              
              // Remove decorations associated with this ID
              const filteredDecorations = DecorationSet.create(
                tr.doc,
                mappedDecorations.find().filter((d: Decoration) => !d.spec.diffId || d.spec.diffId !== id)
              );

              // Check if finished
              if (remainingChanges.length === 0 && onAllReviewed) {
                // Use a timeout or deferred call to ensure it happens after state update
                setTimeout(() => onAllReviewed(), 0);
              }

              return {
                changes: remainingChanges,
                decorations: filteredDecorations
              };
            }

            // 3. Normal mapping
            return {
              changes: value.changes,
              decorations: value.decorations.map(tr.mapping, tr.doc),
            };
          },
        },
        props: {
          decorations(state: EditorState) {
            return (diffPluginKey.getState(state) as DiffPluginState).decorations;
          },
          handleDOMEvents: {
            mouseover: (view: EditorView, event: Event) => {
              const target = event.target as HTMLElement;
              const diffElem = target.closest("[data-diff-id]");
              const diffId = diffElem?.getAttribute("data-diff-id");
              if (diffId) {
                view.dom.querySelectorAll(`[data-diff-id="${diffId}"]`).forEach((el) => {
                  (el as HTMLElement).classList.add("diff-hover-active");
                });
              }
              return false;
            },
            mouseout: (view: EditorView, event: Event) => {
              const target = event.target as HTMLElement;
              const diffElem = target.closest("[data-diff-id]");
              const diffId = diffElem?.getAttribute("data-diff-id");
              if (diffId) {
                view.dom.querySelectorAll(`[data-diff-id="${diffId}"]`).forEach((el) => {
                  (el as HTMLElement).classList.remove("diff-hover-active");
                });
              }
              return false;
            },
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setDiffs: (changes: DiffChange[]) => ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
        if (dispatch) {
          tr.setMeta(diffPluginKey, { type: "SET_DIFFS", changes });
          dispatch(tr);
        }
        return true;
      },
      acceptDiff: (id: string | number) => ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
        if (dispatch) {
          tr.setMeta(diffPluginKey, { type: "RESOLVE", id, accepted: true });
          dispatch(tr);
          if (this.options.onAccept) this.options.onAccept(id);
        }
        return true;
      },
      rejectDiff: (id: string | number) => ({ state, tr, dispatch }: { state: EditorState; tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
        if (dispatch) {
          const pluginState = diffPluginKey.getState(state) as DiffPluginState;
          const change = pluginState.changes.find((c: DiffChange) => String(c.id) === String(id));
          
          if (change) {
            // Find current document range of this change via decorations
            const decorations = pluginState.decorations.find();
            const changeDeco = decorations.find((d) => d.spec.diffId === id && d.spec.type !== "widget");
            // If it's a deletion, it only has a widget
            const widgetDeco = decorations.find((d) => d.spec.diffId === id && d.spec.type === "widget");

            let from = 0, to = 0;
            if (changeDeco) {
              from = changeDeco.from;
              to = changeDeco.to;
            } else if (widgetDeco) {
              from = widgetDeco.from;
              to = widgetDeco.from;
            }

            // REVERT THE TEXT
            const oldText = change.oldText || "";
            if (change.type === "insert") {
              tr.delete(from, to);
            } else {
              tr.insertText(oldText, from, to);
            }
          }

          tr.setMeta(diffPluginKey, { type: "RESOLVE", id, accepted: false });
          dispatch(tr);
          if (this.options.onReject) this.options.onReject(id);
        }
        return true;
      },
      clearDiffs: () => ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
        if (dispatch) {
          tr.setMeta(diffPluginKey, { type: "SET_DIFFS", changes: [] });
          dispatch(tr);
        }
        return true;
      }
    };
  },
});

function createDiffDecorations(
  changes: DiffChange[],
  doc: Node,
  posMap: number[],
  onAccept: (id: string | number) => void,
  onReject: (id: string | number) => void
): DecorationSet {
  const decorations: Decoration[] = [];

  changes.forEach((change) => {
    const changeId = change.id;
    const pos = posMap[change.startOffset] || change.startOffset;
    let endPos = posMap[change.startOffset + change.text.length] || (pos + change.text.length);
    if (endPos < pos) endPos = pos;

    if (change.type === "insert") {
      decorations.push(
        Decoration.inline(pos, endPos, {
          class: "diff-insert",
          "data-diff-id": changeId,
        }, { diffId: changeId, type: "insert" })
      );

      decorations.push(
        Decoration.widget(
          endPos,
          (view: EditorView) => createActionWidget(changeId, view),
          { side: 1, key: `widget-${changeId}`, diffId: changeId, type: "widget" }
        )
      );
    } else if (change.type === "delete") {
      decorations.push(
        Decoration.widget(
          pos,
          (view: EditorView) => createActionWidget(changeId, view, true, change.oldText),
          { side: -1, key: `widget-${changeId}`, diffId: changeId, type: "widget" }
        )
      );
    } else if (change.type === "replace") {
      decorations.push(
        Decoration.inline(pos, endPos, {
          class: "diff-replace",
          "data-diff-id": changeId,
        }, { diffId: changeId, type: "replace" })
      );

      decorations.push(
        Decoration.widget(
          endPos,
          (view: EditorView) => createActionWidget(changeId, view),
          { side: 1, key: `widget-${changeId}`, diffId: changeId, type: "widget" }
        )
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

function createPosMap(doc: Node): number[] {
  const map: number[] = [];
  
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        map.push(pos + i);
      }
    } else if (node.isLeaf) {
      map.push(pos);
    } else if (node.isBlock && pos > 0) {
      map.push(pos);
    }
  });

  const maxDocPos = doc.content.size;
  while (map.length <= maxDocPos + 100) {
    map.push(maxDocPos);
  }
  
  return map;
}

function createActionWidget(
  id: string | number,
  view: EditorView,
  isDeletion: boolean = false,
  deletedText?: string
): HTMLElement {
  const container = document.createElement("span");
  container.className = `diff-actions ${isDeletion ? "is-deletion" : ""}`;
  container.contentEditable = "false";
  container.setAttribute("data-diff-id", String(id));

  if (isDeletion && deletedText) {
    const textSpan = document.createElement("span");
    textSpan.className = "diff-deleted-text";
    textSpan.textContent = deletedText;
    container.appendChild(textSpan);
  }

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "diff-action-btn diff-accept";
  acceptBtn.innerHTML = "✓";
  acceptBtn.type = "button";
  acceptBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    view.dispatch(view.state.tr.setMeta(diffPluginKey, { type: "RESOLVE", id, accepted: true }));
    window.dispatchEvent(new CustomEvent("tiptap-diff-resolve", { detail: { id, accepted: true } }));
  };
  container.appendChild(acceptBtn);

  const rejectBtn = document.createElement("button");
  rejectBtn.className = "diff-action-btn diff-reject";
  rejectBtn.innerHTML = "✕";
  rejectBtn.type = "button";
  rejectBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("tiptap-diff-resolve", { detail: { id, accepted: false } }));
  };
  container.appendChild(rejectBtn);

  return container;
}
