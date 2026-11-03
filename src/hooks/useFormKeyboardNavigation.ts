import { useEffect, useRef } from "react";

export interface FormKeyboardNavOptions {
  /**
   * Whether to automatically focus the first interactive input/select field on mount or when active.
   * Defaults to true.
   */
  autoFocusFirst?: boolean;
  /**
   * Delay in milliseconds before attempting initial auto-focus.
   * Defaults to 60ms.
   */
  autoFocusDelay?: number;
  /**
   * Whether all 4 arrow keys (ArrowDown, ArrowUp, ArrowLeft, ArrowRight) navigate between form fields.
   * Defaults to true.
   */
  enableArrowKeys?: boolean;
  /**
   * Whether Enter key advances to the next field instead of triggering premature form submit.
   * Defaults to true.
   */
  enableEnterNavigation?: boolean;
  /**
   * Custom query selector string for focusable elements.
   */
  customSelector?: string;
  /**
   * Whether the container is currently active (e.g. modal isOpen).
   * Defaults to true.
   */
  isActive?: boolean;
}

export const DEFAULT_FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])',
  '[role="combobox"]:not([aria-disabled="true"]):not([tabindex="-1"])',
  '[data-form-nav="true"]:not([disabled]):not([aria-disabled="true"]):not([tabindex="-1"])',
  'button[type="submit"]:not([disabled])',
].join(", ");

/**
 * Checks whether an element is visible and interactive in the DOM.
 */
function isVisibleAndInteractive(el: HTMLElement): boolean {
  if (
    !el ||
    el.hasAttribute("disabled") ||
    el.getAttribute("aria-disabled") === "true" ||
    el.getAttribute("tabindex") === "-1" ||
    el.getAttribute("aria-hidden") === "true"
  ) {
    return false;
  }
  // Check CSS visibility and dimensions
  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Smoothly focuses a target field and selects its text if applicable.
 */
function focusField(el: HTMLElement) {
  try {
    el.focus({ preventScroll: false });

    // If input has text, select it for immediate typing convenience
    if (
      el instanceof HTMLInputElement &&
      !["checkbox", "radio", "date", "time", "file", "button", "submit", "reset"].includes(
        el.type.toLowerCase()
      )
    ) {
      el.select?.();
    }

    el.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  } catch (err) {
    console.debug("Focus field suppressed:", err);
  }
}

/**
 * Enterprise-grade keyboard navigation hook for forms, modals, drawers, and CMS panels.
 * Controls fluid navigation across all 4 arrow keys (ArrowDown, ArrowUp, ArrowLeft, ArrowRight)
 * and guarantees immediate cursor/focus placement on the first field (especially Select fields).
 */
export function useFormKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  options: FormKeyboardNavOptions = {}
) {
  const {
    autoFocusFirst = true,
    autoFocusDelay = 60,
    enableArrowKeys = true,
    enableEnterNavigation = true,
    customSelector,
    isActive = true,
  } = options;

  const selector = customSelector || DEFAULT_FOCUSABLE_SELECTOR;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Reactive Auto-focus: focuses the first interactive field (including Select / Combobox)
  // Uses MutationObserver to reliably catch async-loaded selects (like Banks, Suppliers, Categories)
  useEffect(() => {
    if (!isActive || !autoFocusFirst) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    let observer: MutationObserver | null = null;
    let cleanupTimer: NodeJS.Timeout | null = null;
    let userInteracted = false;

    const container = containerRef.current;
    if (!container) return;

    const onUserInteraction = () => {
      userInteracted = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    container.addEventListener("pointerdown", onUserInteraction, { once: true, passive: true });
    container.addEventListener("keydown", onUserInteraction, { once: true, passive: true });

    const attemptFocusFirst = () => {
      if (userInteracted) return false;
      const currentContainer = containerRef.current;
      if (!currentContainer) return false;

      const candidates = Array.from(
        currentContainer.querySelectorAll<HTMLElement>(selector)
      ).filter(isVisibleAndInteractive);

      if (candidates.length === 0) return false;

      const firstCandidate = candidates[0];
      const activeEl = document.activeElement as HTMLElement | null;

      // If active element is already the first candidate, perfect
      if (activeEl === firstCandidate) return true;

      // If nothing is focused inside container, or if a subsequent element was temporarily focused
      // while candidate 0 was async-loading, place focus squarely on candidate 0
      const isFocusedInside = activeEl && currentContainer.contains(activeEl);
      if (!isFocusedInside || (candidates.length > 1 && activeEl === candidates[1])) {
        focusField(firstCandidate);
        return true;
      }

      return false;
    };

    // Run after initial mount delay
    timeoutRef.current = setTimeout(() => {
      attemptFocusFirst();

      // Attach MutationObserver to watch for async loading completion (e.g. disabled -> enabled on select)
      if (typeof window !== "undefined" && window.MutationObserver) {
        observer = new MutationObserver(() => {
          if (!userInteracted) {
            attemptFocusFirst();
          }
        });

        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["disabled", "aria-disabled", "tabindex", "class", "style"],
        });
      }
    }, autoFocusDelay);

    // Stop observer after safety window (1200ms) to ensure zero persistent overhead
    cleanupTimer = setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 1200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      container.removeEventListener("pointerdown", onUserInteraction);
      container.removeEventListener("keydown", onUserInteraction);
    };
  }, [isActive, autoFocusFirst, autoFocusDelay, selector, containerRef]);

  // 2. All 4 Arrow keys (Up, Down, Left, Right) and Enter keyboard navigation
  useEffect(() => {
    if (!isActive || (!enableArrowKeys && !enableEnterNavigation)) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modified keys (Ctrl, Alt, Meta) to preserve native system shortcuts
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key;
      const isArrowDown = enableArrowKeys && key === "ArrowDown";
      const isArrowUp = enableArrowKeys && key === "ArrowUp";
      const isArrowRight = enableArrowKeys && key === "ArrowRight";
      const isArrowLeft = enableArrowKeys && key === "ArrowLeft";
      const isEnter = enableEnterNavigation && key === "Enter";

      if (!isArrowDown && !isArrowUp && !isArrowRight && !isArrowLeft && !isEnter) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (!activeEl || !container.contains(activeEl)) return;

      // Special Case 1: Multi-line textarea or rich text editor
      if (
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable ||
        Boolean(activeEl.closest(".ql-editor"))
      ) {
        // Let user navigate text and lines naturally inside textarea
        return;
      }

      // Special Case 2: Expanded dropdown / combobox / listbox
      const isComboboxExpanded =
        activeEl.getAttribute("aria-expanded") === "true" ||
        Boolean(activeEl.closest('[aria-expanded="true"]')) ||
        Boolean(activeEl.closest('[role="listbox"]'));
      if (isComboboxExpanded) {
        // Let the dropdown component handle option selection with arrow keys
        if (isArrowDown || isArrowUp || key === "Escape") {
          return;
        }
      }

      // Special Case 3: Native <select> element (when opened)
      if (activeEl.tagName === "SELECT" && (isArrowDown || isArrowUp)) {
        return;
      }

      // Special Case 4: Submit button on Enter: trigger submit naturally
      if (
        (activeEl.tagName === "BUTTON" || activeEl.getAttribute("type") === "submit") &&
        isEnter
      ) {
        return;
      }

      // Special Case 5: Caret-aware ArrowLeft / ArrowRight inside text inputs
      if (isArrowLeft || isArrowRight) {
        if (activeEl instanceof HTMLInputElement) {
          const inputType = activeEl.type.toLowerCase();
          const isTextInput = ![
            "checkbox",
            "radio",
            "button",
            "submit",
            "reset",
            "file",
          ].includes(inputType);

          if (isTextInput) {
            const val = activeEl.value ?? "";
            let selStart: number | null = null;
            let selEnd: number | null = null;

            try {
              selStart = activeEl.selectionStart;
              selEnd = activeEl.selectionEnd;
            } catch {
              // Some browsers throw on selectionStart for specific input types
              selStart = null;
              selEnd = null;
            }

            if (isArrowLeft) {
              // Only move to previous field if caret is at the beginning or all text is selected
              const isAtStart =
                val.length === 0 ||
                selStart === 0 ||
                (selStart === 0 && selEnd === val.length);
              if (!isAtStart && selStart !== null) {
                // Let native caret move left inside text
                return;
              }
            }

            if (isArrowRight) {
              // Only move to next field if caret is at the end or all text is selected
              const isAtEnd =
                val.length === 0 ||
                selEnd === val.length ||
                (selStart === 0 && selEnd === val.length);
              if (!isAtEnd && selEnd !== null) {
                // Let native caret move right inside text
                return;
              }
            }
          }
        }
      }

      // Get list of all interactive elements in DOM tree order
      const focusableList = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      ).filter(isVisibleAndInteractive);

      if (focusableList.length === 0) return;

      const currentIndex = focusableList.indexOf(activeEl);
      if (currentIndex === -1) return;

      const isForward =
        isArrowDown ||
        isArrowRight ||
        (isEnter && !e.shiftKey);

      const isBackward =
        isArrowUp ||
        isArrowLeft ||
        (isEnter && e.shiftKey);

      // Navigate Forward
      if (isForward) {
        if (currentIndex < focusableList.length - 1) {
          e.preventDefault();
          const nextTarget = focusableList[currentIndex + 1];
          focusField(nextTarget);
        }
        // If on the last field and pressing Enter, allow natural form submit if inside a form
      }

      // Navigate Backward
      else if (isBackward) {
        if (currentIndex > 0) {
          e.preventDefault();
          const prevTarget = focusableList[currentIndex - 1];
          focusField(prevTarget);
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, enableArrowKeys, enableEnterNavigation, selector, containerRef]);
}
