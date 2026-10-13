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
  color = "#009FE3",
  hoverColor = "#0085be",
  icon,
  textColor,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`flex items-center justify-center sm:w-fit w-full py-[0.4rem] px-[0.85rem] text-[14px] ${textColor ? "" : "text-white"} rounded-md transition-all duration-300 ease-in-out cursor-pointer hover:opacity-95 shadow-xs
        ${buttonClass} ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      style={{
        backgroundColor: color,
        borderColor: color,
        color: textColor,
      }}
      onMouseOver={(e) => {
        if (hoverColor) {
          e.currentTarget.style.backgroundColor = hoverColor;
          e.currentTarget.style.borderColor = hoverColor;
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = color;
        e.currentTarget.style.borderColor = color;
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