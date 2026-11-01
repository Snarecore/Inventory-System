import React from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  isLoading?: boolean;
  buttonClass?: string;
  color?: string;
  hoverColor?: string;
  icon?: React.ReactNode;
  textColor?: string;
  children?: React.ReactNode;
}

/**
 * Variants map onto the token-backed .ui-btn-* classes, so colour, radius and
 * border weight all follow the active appearance theme.
 */
const variantStyles: Record<string, string> = {
  primary: "ui-btn-primary",
  secondary: "ui-btn-secondary",
  outline: "ui-btn-secondary",
  ghost: "ui-btn-ghost",
  danger: "ui-btn-danger",
};

/** Sizes are derived from the density token rather than fixed pixels. */
const sizeStyles: Record<string, string> = {
  sm: "!h-8 !px-3 !gap-1.5 text-xs font-medium !rounded-md",
  md: "h-[var(--ui-control-h)] px-4 gap-2",
  lg: "h-[calc(var(--ui-control-h)+6px)] px-6 gap-2.5 text-[calc(var(--ui-font-size)+1px)]",
};

export const Button: React.FC<ButtonProps> = ({
  label = "",
  type = "button",
  disabled = false,
  isLoading = false,
  buttonClass = "",
  className = "",
  variant,
  size,
  onClick,
  children,
  color,
  hoverColor,
  icon,
  textColor,
  style,
  ...props
}) => {
  const getHoverColor = () => {
    if (hoverColor) return hoverColor;
    if (color === "var(--primary-color)" || color === "#01306B") return "var(--primary-color-hover)";
    if (color === "#059669") return "#047857";
    if (color === "#dc2626") return "#b91c1c";
    return color;
  };

  const effectiveHoverColor = getHoverColor();
  const hasCustomColor = Boolean(color);

  const baseStyles = "ui-btn active:scale-[0.98]";

  // Legacy call sites pass neither `variant` nor `size`; they match the global
  // toolbar / header button dimensions (h-8 px-3 rounded-md) exactly like RefreshButton.
  const legacyStyles =
    "ui-btn ui-btn-primary !h-8 !px-3 !py-0 text-xs sm:text-xs font-medium !rounded-md !gap-1.5 w-full sm:w-fit whitespace-nowrap shrink-0 active:scale-[0.98]";

  const finalClass = cn(
    variant || size ? baseStyles : legacyStyles,
    variant && variantStyles[variant],
    size && sizeStyles[size],
    buttonClass,
    className,
    disabled || isLoading ? "opacity-50 cursor-not-allowed active:scale-100" : ""
  );

  const finalStyle: React.CSSProperties = {
    ...style,
    ...(hasCustomColor
      ? {
          backgroundColor: color,
          borderColor: color,
          color: textColor || "#ffffff",
        }
      : {}),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={finalClass}
      style={finalStyle}
      onMouseOver={(e) => {
        if (!disabled && !isLoading && effectiveHoverColor && hasCustomColor) {
          e.currentTarget.style.backgroundColor = effectiveHoverColor;
          e.currentTarget.style.borderColor = effectiveHoverColor;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !isLoading && hasCustomColor && color) {
          e.currentTarget.style.backgroundColor = color;
          e.currentTarget.style.borderColor = color;
        }
      }}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : icon ? (
        <span className="inline-flex items-center justify-center shrink-0 leading-none">{icon}</span>
      ) : null}
      {label}
      {children}
    </button>
  );
};

export default Button;