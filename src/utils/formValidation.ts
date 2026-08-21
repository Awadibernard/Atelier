/**
 * Form Validation & Accessibility Focus/Scroll Utilities
 * 
 * Provides smooth, reliable scrolling and keyboard focus management
 * when form validation errors occur on both mobile and desktop viewports.
 */

export interface FocusAndScrollOptions {
  /**
   * Distance in pixels from the top of the viewport
   * to ensure fixed headers and floating toast notifications do not obscure the field.
   * Default: 110px
   */
  topOffset?: number;
  /**
   * Whether to select the text inside input if text is present
   */
  selectText?: boolean;
  /**
   * Whether to apply a temporary visual highlight animation/class to the field
   */
  highlight?: boolean;
}

/**
 * Reusable helper to smoothly scroll to and focus a form input/element when a validation error occurs.
 * Accounts for fixed top navigation bar, floating toasts, modal containers, and mobile viewports.
 * 
 * @param target Element ID string or HTMLElement reference
 * @param options Focus and scroll options
 * @returns boolean true if element was found and focused, false otherwise
 */
export function focusAndScrollToField(
  target: string | HTMLElement | null | undefined,
  options: FocusAndScrollOptions = {}
): boolean {
  if (!target) return false;

  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) return false;

  const { topOffset = 110, selectText = true, highlight = true } = options;

  // 1. Check if the element is inside a modal or scrollable container
  const modalOrScrollParent = element.closest<HTMLElement>(
    '[role="dialog"], .overflow-y-auto, .overflow-auto'
  );

  if (
    modalOrScrollParent &&
    modalOrScrollParent !== document.documentElement &&
    modalOrScrollParent !== document.body
  ) {
    // Inside a modal container: calculate relative position inside modal
    const parentRect = modalOrScrollParent.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();
    const relativeTop = elemRect.top - parentRect.top + modalOrScrollParent.scrollTop;

    modalOrScrollParent.scrollTo({
      top: Math.max(0, relativeTop - 40),
      behavior: 'smooth',
    });
  } else {
    // Top-level page scroll: calculate viewport coordinates accounting for fixed header + floating banner
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.scrollY;
    const targetScrollY = Math.max(0, absoluteElementTop - topOffset);

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });
  }

  // 2. Focus the element with accessibility in mind (preventing default scroll jump so smooth scroll takes effect)
  setTimeout(() => {
    try {
      element.focus({ preventScroll: true });
      if (selectText && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        element.select();
      }
    } catch {
      // Graceful fallback
    }
  }, 100);

  // 3. Visual identification: visually highlight the problematic field
  if (highlight) {
    element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', '!border-red-500');
    
    // Clean up temporary highlight on user input, blur, or timeout
    const cleanUp = () => {
      element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', '!border-red-500');
      element.removeEventListener('input', cleanUp);
      element.removeEventListener('blur', cleanUp);
    };

    element.addEventListener('input', cleanUp, { once: true });
    element.addEventListener('blur', cleanUp, { once: true });
    setTimeout(cleanUp, 3500);
  }

  return true;
}
