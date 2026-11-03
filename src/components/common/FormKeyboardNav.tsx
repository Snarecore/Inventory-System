import React, { useRef } from "react";
import {
  useFormKeyboardNavigation,
  FormKeyboardNavOptions,
} from "@/hooks/useFormKeyboardNavigation";

export interface FormKeyboardNavProps
  extends React.HTMLAttributes<HTMLElement>,
    FormKeyboardNavOptions {
  /**
   * The HTML tag to render as the container (e.g. 'form', 'div', 'section').
   * Defaults to 'div'.
   */
  as?: "div" | "form" | "section" | "article";
  /**
   * Optional form submit handler when `as="form"`
   */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}

/**
 * Reusable container that automatically focuses the first interactive field on open/mount
 * and provides fluid ArrowDown / ArrowUp / Enter keyboard navigation.
 */
export const FormKeyboardNav: React.FC<FormKeyboardNavProps> = ({
  as: Component = "div",
  autoFocusFirst = true,
  autoFocusDelay = 60,
  enableArrowKeys = true,
  enableEnterNavigation = true,
  customSelector,
  isActive = true,
  children,
  className = "",
  onSubmit,
  ...restProps
}) => {
  const containerRef = useRef<HTMLElement | null>(null);

  useFormKeyboardNavigation(containerRef, {
    autoFocusFirst,
    autoFocusDelay,
    enableArrowKeys,
    enableEnterNavigation,
    customSelector,
    isActive,
  });

  if (Component === "form") {
    return (
      <form
        ref={containerRef as React.RefObject<HTMLFormElement>}
        onSubmit={onSubmit}
        className={className}
        {...(restProps as React.FormHTMLAttributes<HTMLFormElement>)}
      >
        {children}
      </form>
    );
  }

  return (
    <Component
      ref={containerRef as any}
      className={className}
      {...(restProps as any)}
    >
      {children}
    </Component>
  );
};

export default FormKeyboardNav;
