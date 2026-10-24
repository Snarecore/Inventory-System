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

const variantStyles: Record<string, string> = {
  primary: "bg-primary hover:bg-primary-hover text-white shadow-sm shadow-primary/20 focus:ring-primary",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100",
  outline: "border border-slate-300 hover:border-primary hover:text-primary text-slate-700 focus:ring-primary dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary dark:hover:text-primary-light",
  ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
  danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 focus:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600",
};

const sizeStyles: Record<string, string> = {
  sm: "text-xs px-3.5 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3 gap-2.5 font-semibold",
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

  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]";

  const legacyStyles =
    "flex items-center justify-center sm:w-fit w-full py-[0.4rem] px-2 text-[14px] font-normal text-white rounded-md transition-all duration-200 ease-in-out cursor-pointer hover:shadow-xs active:scale-[0.98]";

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
        <span className="mr-2 text-lg leading-none">{icon}</span>
      ) : null}
      {label}
      {children}
    </button>
  );
};

export default Button;