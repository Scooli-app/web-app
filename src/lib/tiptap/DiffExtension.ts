import type { DiffChange } from "@/shared/types/api";
import { computeDiff } from "@/shared/utils/diff-utils";
import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface DiffOptions {
  oldText: string;
  newText: string;
  diffChanges?: DiffChange[];
  onAccept?: (changeId: string | number) => void;
  onReject?: (changeId: string | number) => void;
}

export const DiffExtension = Extension.create<DiffOptions>({
  name: "diff",

  addOptions() {
    return {
      oldText: "",
      newText: "",
      diffChanges: undefined,
      onAccept: undefined,
      onReject: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { oldText, diffChanges, onAccept, onReject } = this.options;

    return [
      new Plugin({
        key: new PluginKey("diff"),
        state: {
          init(_config, instance) {
            // If we have pre-computed diff changes from backend, use them!
            if (diffChanges && diffChanges.length > 0) {
              // eslint-disable-next-line no-console
              console.log("[DIFF EXT] Using pre-computed diff changes:", diffChanges.length);
              const posMap = createPosMap(instance.doc);
              return createDiffDecorations(
                diffChanges,
                instance.doc,
                posMap,
                onAccept,
                onReject
              );
            }

            // Normalize line endings and whitespace for reliable diffing
            // Normalize text: remove markdown symbols and standardize whitespace
            const normalize = (text: string) => {
              if (!text) return "";
              return text
                .replace(/\r\n/g, "\n")
                .replace(/[#*_`[\]()]/g, "")
                .replace(/\n+/g, "\n")
                .replace(/[ \t]+/g, " ")
                .trim();
            };
            
            const docText = normalize(instance.doc.textContent);
            const oldPlainText = normalize(oldText);

            // eslint-disable-next-line no-console
            console.log("[DIFF EXT] Computing diff locally:", {
              oldLength: oldPlainText.length,
              docLength: docText.length,
            });

            // Compare old plain text with current document text
            const changes = computeDiff(oldPlainText, docText);

            // Map local DiffChange to API DiffChange structure for createDiffDecorations
            let localOffset = 0;
            const apiChanges: DiffChange[] = changes.map((c, i) => {
              const change: DiffChange = {
                id: `local-${i}`,
                type: c.type as "insert" | "delete" | "replace",
                text: c.text,
                startOffset: localOffset,
                endOffset: localOffset + c.text.length,
              };
              localOffset += c.text.length;
              return change;
            });

            const posMap = createPosMap(instance.doc);
            return createDiffDecorations(apiChanges, instance.doc, posMap, onAccept, onReject);
          },
          apply(tr, oldState) {
            // Keep decorations stable unless explicitly updated
            return oldState.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            // Mouse tracking removed in favor of CSS-based hover on widgets
          },
        },
      }),
    ];
  },
});


function createDiffDecorations(
  changes: DiffChange[],
  doc: Node,
  posMap: number[],
  onAccept?: (id: string | number) => void,
  onReject?: (id: string | number) => void
): DecorationSet {
  const decorations: Decoration[] = [];

  changes.forEach((change) => {
    const changeId = change.id;
    // Map character offset to ProseMirror position using our posMap
    const pos = posMap[change.startOffset] || change.startOffset + 1;
    const endPos = posMap[change.startOffset + change.text.length] || (pos + change.text.length);
    
    if (change.type === "insert") {
      // Green background for insertions
      decorations.push(
        Decoration.inline(
          pos,
          endPos,
          {
            class: "diff-insert",
            "data-diff-id": changeId,
          }
        )
      );

      // Add accept/reject widget at the END of the insertion
      if (onAccept || onReject) {
        decorations.push(
          Decoration.widget(
            endPos,
            createActionWidget(changeId, onAccept, onReject),
            { side: 1, key: `widget-${changeId}` }
          )
        );
      }
    } else if (change.type === "delete") {
      // For deletions in the NEW content view, we show a small widget at the position
      // where the text was removed.
      if (onAccept || onReject) {
        decorations.push(
          Decoration.widget(
            pos,
            createActionWidget(changeId, onAccept, onReject, true), // true means deletion widget
            { side: -1, key: `widget-${changeId}` }
          )
        );
      }
    } else if (change.type === "replace") {
       // Yellow/Orange background for replacements
       decorations.push(
        Decoration.inline(
          pos,
          endPos,
          {
            class: "diff-replace",
            "data-diff-id": changeId,
          }
        )
      );

      // Add accept/reject widget at the END of the replacement
      if (onAccept || onReject) {
        decorations.push(
          Decoration.widget(
            endPos,
            createActionWidget(changeId, onAccept, onReject),
            { side: 1, key: `widget-${changeId}` }
          )
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Creates a map where map[charOffset] = prosemirrorPosition
 * This accounts for block boundaries that take up positions but aren't visible in plain text.
 */
function createPosMap(doc: Node): number[] {
  const map: number[] = [];
  let lastPos = 0;

  doc.descendants((node: Node, pos: number) => {
      if (node.isText && node.text) {
        // If we jumped over a block boundary, represent it as a newline
        if (lastPos !== 0 && pos > lastPos) {
          map.push(pos); // Virtual \n maps to the start of the next block
        }
        
        for (let i = 0; i < node.text.length; i++) {
          map.push(pos + i);
        }
        lastPos = pos + node.text.length;
      } else if (node.isBlock && node.content.size === 0 && lastPos !== 0) {
      // Empty blocks (like empty paragraphs) should also count as a newline
      if (pos > lastPos) {
        map.push(pos);
        lastPos = pos + node.nodeSize;
      }
    }
    return true;
  });
  
  return map;
}

function createActionWidget(
  id: string | number,
  onAccept?: (id: string | number) => void,
  onReject?: (id: string | number) => void,
  isDeletion: boolean = false
): HTMLElement {
  const container = document.createElement("span");
  container.className = `diff-actions ${isDeletion ? "is-deletion" : ""}`;
  container.contentEditable = "false";
  container.setAttribute("data-diff-id", String(id));

  if (onAccept) {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "diff-action-btn diff-accept";
    acceptBtn.innerHTML = "✓";
    acceptBtn.title = "Aceitar alteração";
    acceptBtn.type = "button";
    acceptBtn.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    acceptBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // eslint-disable-next-line no-console
      console.log("[DIFF] Accept clicked for id:", id);
      onAccept(id);
    };
    container.appendChild(acceptBtn);
  }

  if (onReject) {
    const rejectBtn = document.createElement("button");
    rejectBtn.className = "diff-action-btn diff-reject";
    rejectBtn.innerHTML = "✕";
    rejectBtn.title = "Rejeitar alteração";
    rejectBtn.type = "button";
    rejectBtn.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    rejectBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // eslint-disable-next-line no-console
      console.log("[DIFF] Reject clicked for id:", id);
      onReject(id);
    };
    container.appendChild(rejectBtn);
  }

  return container;
}
