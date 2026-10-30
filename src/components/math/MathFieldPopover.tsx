"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MathfieldElement } from "mathlive";
import { fromFieldTex, toFieldTex } from "./mathTex";

export type MathAnchor = { x: number; y: number };

const WIDTH = 360;

/** MathLive is loaded the first time a formula is edited, never when an editor opens. */
let loading: Promise<typeof import("mathlive")> | null = null;
function loadMathLive() {
  loading ??= import("mathlive").then(
    (mod) => {
      // KaTeX's fonts are already on the page (app layout); no sounds.
      mod.MathfieldElement.fontsDirectory = null;
      mod.MathfieldElement.soundsDirectory = null;
      return mod;
    },
    (error: unknown) => {
      // A failed download (offline, a deploy in between) is tried again next time, not cached.
      loading = null;
      throw error;
    },
  );
  return loading;
}

/**
 * Edits one formula as maths, like Word's equation editor: "3/4" becomes a fraction, "x^2" an exponent, arrows move
 * inside. The teacher never sees LaTeX. Enter or a click outside saves, Escape cancels. An empty formula is saved as
 * "" (the caller removes it).
 */
export function MathFieldPopover({ tex, anchor, allowBlank = false, within, onSave, onCancel }: {
  tex: string;
  anchor: MathAnchor;
  allowBlank?: boolean;
  /** The dialog (e.g. the phone exercise sheet) the formula belongs to: a modal dialog ignores and closes on
   *  anything outside it, so the popover and MathLive's on-screen keyboard go inside it. */
  within?: HTMLElement | null;
  onSave: (tex: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("math");
  const hostRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<MathfieldElement | null>(null);
  // How the field itself wrote the formula on opening: unchanged since then = saved as stored, byte for byte.
  const initial = useRef("");
  const done = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pos, setPos] = useState({ left: anchor.x, top: anchor.y + 8 });
  const save = useRef<() => void>(() => undefined);
  const cancel = useRef<() => void>(() => undefined);

  save.current = () => {
    if (done.current) return;
    done.current = true;
    const field = fieldRef.current;
    const now = field?.getValue("latex");
    onSave(now === undefined || now === initial.current ? tex : fromFieldTex(now, tex));
  };
  cancel.current = () => {
    if (done.current) return;
    done.current = true;
    onCancel();
  };

  useEffect(() => {
    let alive = true;
    void loadMathLive().then(({ MathfieldElement }) => {
      if (!alive || !hostRef.current) return;
      const field = new MathfieldElement();
      field.style.width = "100%";
      field.style.fontSize = "20px";
      // MathLive only takes its options once the field is on the page.
      hostRef.current.appendChild(field);
      field.value = toFieldTex(tex);
      field.menuItems = [];
      field.mathVirtualKeyboardPolicy = "auto";
      field.smartFence = true;
      initial.current = field.getValue("latex");
      try {
        if (within) window.mathVirtualKeyboard.container = within;
      } catch {
        // A page inside an iframe can't move MathLive's keyboard: the field still works, with it where it is.
      }
      field.addEventListener("keydown", (e) => {
        // Keys typed in the formula are the formula's: a slide must not delete or move its element on Backspace.
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          save.current();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel.current();
        }
      });
      fieldRef.current = field;
      setReady(true);
      requestAnimationFrame(() => field.focus());
    }, () => alive && setFailed(true));
    return () => {
      alive = false;
      fieldRef.current?.remove();
      fieldRef.current = null;
      try {
        if (within && window.mathVirtualKeyboard) window.mathVirtualKeyboard.container = document.body;
      } catch {
        // See above: not movable inside an iframe.
      }
    };
  }, [tex, within, attempt]);

  // A click outside the popover (and outside MathLive's on-screen keyboard) saves.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (boxRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.(".ML__keyboard, .ML__menu")) return;
      save.current();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);

  // Keep the popover inside the window.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const h = box.offsetHeight;
    const left = Math.max(8, Math.min(anchor.x, window.innerWidth - WIDTH - 8));
    const below = anchor.y + 8;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, anchor.y - h - 8) : below;
    // Inside a transformed dialog (a sliding sheet), "fixed" is measured from the dialog, not the window.
    const transformed = within && getComputedStyle(within).transform !== "none";
    const origin = transformed ? within.getBoundingClientRect() : { left: 0, top: 0 };
    setPos({ left: left - origin.left, top: top - origin.top });
  }, [anchor.x, anchor.y, ready, within]);

  return createPortal(
    <div
      ref={boxRef}
      role="dialog"
      aria-label={t("editLabel")}
      className="paper-light fixed z-[60] flex flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
      style={{ left: pos.left, top: pos.top, width: `min(${WIDTH}px, calc(100vw - 16px))` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div ref={hostRef} className="min-h-10 rounded-md border border-input bg-white px-2 py-1 text-neutral-900">
        {!ready && !failed && <Loader2 className="m-1 h-4 w-4 animate-spin text-muted-foreground" aria-label={t("loading")} />}
        {failed && (
          <div role="alert" className="flex items-center justify-between gap-2 py-1 font-sans text-sm text-neutral-700">
            <span>{t("loadFailed")}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>
              {t("retry")}
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {allowBlank && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!ready}
            onClick={() => {
              fieldRef.current?.executeCommand(["insert", "\\placeholder{}"]);
              fieldRef.current?.focus();
            }}
          >
            {t("blank")}
          </Button>
        )}
        <span className="min-w-0 flex-1 text-xs text-muted-foreground max-sm:hidden">{t("hint")}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => cancel.current()}>
          {t("cancel")}
        </Button>
        <Button type="button" size="sm" disabled={!ready} onClick={() => save.current()}>
          {t("save")}
        </Button>
      </div>
    </div>,
    within ?? document.body,
  );
}
