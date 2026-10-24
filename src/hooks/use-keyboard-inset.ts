import * as React from "react";

/**
 * For bottom sheets on phones: returns how much of the layout viewport the on-screen keyboard covers (0 when
 * closed), to pad the sheet by, and keeps a focused field inside a sheet scrolled into view.
 */
export function useKeyboardInset(active = true): number {
  const [inset, setInset] = React.useState(0);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const reveal = () => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.closest("[data-slot=sheet-content]") && el.matches("input, textarea, [contenteditable=true]")) {
        el.scrollIntoView({ block: "nearest" });
      }
    };
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A pinch zoom shrinks the visual viewport too; that is not a keyboard.
    const measure = () => setInset(vv.scale > 1.01 ? 0 : Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    const onResize = () => {
      measure();
      // After the padding lands, so the field ends up above the keyboard rather than under it.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(reveal);
    };
    // Moving between fields with the keyboard already open fires no resize.
    const onFocus = () => {
      clearTimeout(timer);
      timer = setTimeout(reveal, 50);
    };
    onResize();
    vv.addEventListener("resize", onResize);
    // iOS pans the visual viewport (offsetTop) when the keyboard opens, without a resize.
    vv.addEventListener("scroll", measure);
    document.addEventListener("focusin", onFocus);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", measure);
      document.removeEventListener("focusin", onFocus);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      setInset(0);
    };
  }, [active]);
  return inset;
}
