import React, { ChangeEvent } from "react";

export interface TextInputProps {
  label?: string;
  value?: string | number;
  name?: string;
  placeholder?: string;
  type?: string;
  inputClass?: string;
  className?: string;
  required?: boolean;
  readOnly?: boolean;
  message?: string;
  error?: string;
  wrapperClass?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  step?: string;
  min?: string | number;
  max?: string | number;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onWheel?: React.WheelEventHandler<HTMLInputElement>;
  onChange?: ((value: string) => void) | ((event: ChangeEvent<HTMLInputElement>) => void);
}

export type InputFieldProps = TextInputProps;

const InputField: React.FC<TextInputProps> = ({
  label,
  value = "",
  name,
  type = "text",
  inputClass = "",
  className = "",
  required = false,
  readOnly = false,
  message,
  error,
  wrapperClass = "",
  icon,
  disabled = false,
  step,
  min,
  max,
  autoFocus,
  inputRef,
  onFocus,
  onBlur,
  onPaste,
  onKeyDown,
  onWheel,
  placeholder = "",
  onChange,
}) => {
  const displayError = error || message;
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      const fnStr = typeof onChange === "function" ? onChange.toString() : "";
      if (fnStr.includes("target")) {
        (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(e);
      } else {
        (onChange as (value: string) => void)(e.target.value);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (onWheel) {
      onWheel(e);
    } else if (type === "number") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-black block mb-1">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}

      <div
        className={`flex items-center w-full transition-all duration-200 border rounded-lg px-2.5 h-9
          ${displayError ? "border-red-500" : "border-gray-300"}
          bg-white text-black text-xs focus-within:ring-1 focus-within:ring-[var(--primary-color)] focus-within:border-[var(--primary-color)]
          ${wrapperClass}`}
      >
        {icon && <div className="pr-2">{icon}</div>}

        <input
          ref={inputRef}
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          step={step}
          min={min}
          max={max}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          onWheel={handleWheel}
          onChange={handleChange}
          className={`w-full focus:outline-none placeholder:text-xs placeholder:text-gray-400 px-1 text-xs text-black bg-transparent
            ${inputClass}
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-text"}
          `}
        />
      </div>

      {displayError && <p className="text-xs text-red-500 mt-1">{displayError}</p>}
    </div>
  );
};

export { InputField as TextInput, InputField };
export default InputField;
