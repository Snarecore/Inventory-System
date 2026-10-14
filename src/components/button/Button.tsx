import React from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface ButtonProps {
  label?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
  buttonClass?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  color?: string; 
  hoverColor?: string; 
  icon?: React.ReactNode; 
  textColor?: string;
}

const Button: React.FC<ButtonProps> = ({
  label = "",
  type = "button",
  disabled = false,
  isLoading = false,
  buttonClass = "",
  onClick,
  children,
  color = "var(--primary-color)",
  hoverColor,
  icon,
  textColor,
}) => {
  const getHoverColor = () => {
    if (hoverColor) return hoverColor;
    if (color === "var(--primary-color)" || color === "#01306B") return "var(--primary-color-hover)";
    if (color === "#059669") return "#047857";
    if (color === "#dc2626") return "#b91c1c";
    return color;
  };

  const effectiveHoverColor = getHoverColor();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center justify-center sm:w-fit w-full py-[0.4rem] px-2 text-[14px] font-normal text-white rounded-md transition-all duration-200 ease-in-out cursor-pointer hover:shadow-xs active:scale-[0.98]
        ${buttonClass} ${disabled || isLoading ? "opacity-50 cursor-not-allowed active:scale-100" : ""}
      `}
      style={{
        backgroundColor: color,
        borderColor: color,
        color: textColor || "#ffffff",
      }}
      onMouseOver={(e) => {
        if (!disabled && !isLoading && effectiveHoverColor) {
          e.currentTarget.style.backgroundColor = effectiveHoverColor;
          e.currentTarget.style.borderColor = effectiveHoverColor;
        }
      }}
      onMouseOut={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = color;
          e.currentTarget.style.borderColor = color;
        }
      }}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {isLoading ? (
        <div className="flex items-center">
          <AiOutlineLoading3Quarters className="animate-spin mr-2" />
          {/* Loading... */}
        </div>
      ) : (
        label
      )}
      {children}
    </button>
  );
};

export default Button;