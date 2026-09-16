import { useCallback, useEffect, useRef } from "react";

/**
 * Dialog behaviour: the four things a modal owes a keyboard user.
 *
 *   1. focus moves into it when it opens
 *   2. focus cannot leave it while it is open
 *   3. focus returns to whatever opened it when it closes
 *   4. Escape closes it
 *
 * Without 2 and 3 a modal is only visually modal: Tab walks out into content
 * that is sitting behind a scrim, still reachable and still operable, with the
 * focus ring invisible.
 *
 * Mount this from inside the dialog so open/close is just mount/unmount.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // offsetParent is null for display:none and for anything in a hidden
    // subtree, which keeps collapsed tab panels out of the cycle.
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export interface ModalDialog {
  dialogRef: React.RefObject<HTMLDivElement>;
  /** Spread onto the dialog element. */
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function useModalDialog(
  onClose: () => void,
  /** Element id of the app content to freeze while the dialog is open. */
  backgroundId = "app-shell",
): ModalDialog {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const background = document.getElementById(backgroundId);

    // `inert` takes the whole background out of the tab order AND out of the
    // accessibility tree, so a screen reader in browse mode cannot wander into
    // it either — which a focus trap alone does not prevent.
    if (background) background.inert = true;

    const dialog = dialogRef.current;
    const first = dialog ? focusableWithin(dialog)[0] : null;
    (first ?? dialog)?.focus();

    return () => {
      if (background) background.inert = false;
      // Guard against restoring focus to something that has since been removed.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [backgroundId]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeRef.current();
      return;
    }
    if (e.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const items = focusableWithin(dialog);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  return { dialogRef, onKeyDown };
}
