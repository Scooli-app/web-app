"use client";

/**
 * Keeps what is being generated on screen: while the document is written, the newest slide or exercise (the end of
 * the preview); while its images are made, the next image still to come. The teacher takes over by scrolling: from
 * then on nothing moves until they scroll back to the end or press "follow" again.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** "end": the newest content. "pending": the first element marked {@link PENDING_ATTRIBUTE}. null: stay put. */
export type FollowTarget = "end" | "pending" | null;

/** Marks the element the screen follows while images are made (the first one in the document wins). */
export const PENDING_ATTRIBUTE = "data-generation-pending";

/** Within this many pixels of the end counts as "at the end". */
const END_SLACK = 48;
/** Room left above a followed element for the sticky status bar. */
const TOP_GAP = 96;
/** A scroll this soon after a wheel, touch or key is the teacher's; any other is ours (or the browser's). */
const USER_SCROLL_WINDOW_MS = 400;

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/** The element that scrolls `el`: itself or its nearest ancestor with a scrolling overflow. */
export function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

export function isAtEnd(scroller: Pick<HTMLElement, "scrollTop" | "scrollHeight" | "clientHeight">): boolean {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= END_SLACK;
}

/**
 * Where to scroll so that `target` is in view: centred when it fits, else its top just below the status bar.
 * Null when it is already comfortably in view (nothing to do).
 */
export function scrollTopToShow(
  scroller: { scrollTop: number; top: number; height: number },
  target: { top: number; height: number },
): number | null {
  const offset = target.top - scroller.top;
  const fullyVisible = offset >= TOP_GAP && offset + target.height <= scroller.height;
  if (fullyVisible) return null;
  const margin = Math.max(TOP_GAP, (scroller.height - target.height) / 2);
  return Math.max(0, scroller.scrollTop + offset - margin);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useFollowGeneration(
  rootRef: RefObject<HTMLElement | null>,
  target: FollowTarget,
  /** Changes whenever there is something new to show (a slide, an exercise, an image). */
  revision: unknown,
): { following: boolean; resume: () => void } {
  const [following, setFollowing] = useState(true);
  const followingRef = useRef(true);
  const targetRef = useRef(target);
  targetRef.current = target;
  const lastIntentRef = useRef(0);

  const setFollow = useCallback((value: boolean) => {
    followingRef.current = value;
    setFollowing(value);
  }, []);

  const scrollToTarget = useCallback(() => {
    const root = rootRef.current;
    const scroller = scrollParent(root);
    if (!root || !scroller) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    if (targetRef.current === "end") {
      if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 1) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior });
      }
      return;
    }
    if (targetRef.current === "pending") {
      const el = root.querySelector<HTMLElement>(`[${PENDING_ATTRIBUTE}]`);
      if (!el) return;
      const s = scroller.getBoundingClientRect();
      const e = el.getBoundingClientRect();
      const top = scrollTopToShow({ scrollTop: scroller.scrollTop, top: s.top, height: s.height }, e);
      if (top !== null) scroller.scrollTo({ top, behavior });
    }
  }, [rootRef]);

  // Who is scrolling: a scroll right after a wheel, touch or key is the teacher's.
  useEffect(() => {
    const scroller = scrollParent(rootRef.current);
    if (!scroller) return;
    const intent = () => {
      lastIntentRef.current = Date.now();
    };
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) intent();
    };
    // A press on the scroller itself (not on its content) is a grab of its scrollbar.
    const onPointer = (e: PointerEvent) => {
      if (e.target === scroller) intent();
    };
    const onScroll = () => {
      if (Date.now() - lastIntentRef.current > USER_SCROLL_WINDOW_MS) return;
      // Back at the end while it is still being written: follow again.
      setFollow(targetRef.current === "end" && isAtEnd(scroller));
    };
    scroller.addEventListener("wheel", intent, { passive: true });
    scroller.addEventListener("touchmove", intent, { passive: true });
    scroller.addEventListener("keydown", onKey);
    scroller.addEventListener("pointerdown", onPointer);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("wheel", intent);
      scroller.removeEventListener("touchmove", intent);
      scroller.removeEventListener("keydown", onKey);
      scroller.removeEventListener("pointerdown", onPointer);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [rootRef, setFollow]);

  // Something new: bring it into view (after layout, so the new element has its size).
  useEffect(() => {
    if (!followingRef.current || target === null) return;
    const frame = window.requestAnimationFrame(scrollToTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [revision, target, scrollToTarget]);

  const resume = useCallback(() => {
    setFollow(true);
    scrollToTarget();
  }, [setFollow, scrollToTarget]);

  return { following, resume };
}
