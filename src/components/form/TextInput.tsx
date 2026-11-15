import React, { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

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
  ariaDescribedBy?: string;
  wrapperClass?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  step?: string;
  autoFocus?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
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
  ariaDescribedBy,
  wrapperClass = "",
  icon,
  disabled = false,
  step,
  min,
  max,
  autoFocus,
  size = "md",
  inputRef,
  onFocus,
  onBlur,
  onPaste,
  onKeyDown,
  onWheel,
  placeholder = "",
  onChange,
}) => {
  const { t } = useTranslation();
  const translatedLabel = label ? t(label) : label;
  const translatedPlaceholder = placeholder ? t(placeholder) : placeholder;
  const rawError = error || message;
  const displayError = rawError ? t(rawError) : rawError;

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


  const sizeClasses: Record<string, string> = {
    xs: "ui-control-xs",
    sm: "ui-control-sm",
    md: "",
    lg: "h-[calc(var(--ui-control-h)+6px)] text-[calc(var(--ui-font-size)+1px)]",
  };

  return (
    <div className={`ui-field ${className}`}>
      {translatedLabel && (
        <label htmlFor={name} className={`ui-label ${required ? "ui-label-required" : ""}`}>
          {translatedLabel}
        </label>
      )}

      <div
        className={`ui-control ui-control-shell ${sizeClasses[size] || ""} ${displayError ? "is-invalid" : ""} ${wrapperClass}`}
      >
        {icon && <span className="flex shrink-0 items-center text-[var(--ui-text-subtle)]">{icon}</span>}

        <input
          ref={inputRef}
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={translatedPlaceholder}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          step={step}
          min={min}
          max={max}
          autoFocus={autoFocus}
          aria-invalid={displayError ? true : undefined}
          aria-describedby={ariaDescribedBy || (displayError && name ? `${name}-error` : undefined)}
          onFocus={onFocus}
          onBlur={onBlur}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          onWheel={handleWheel}
          onChange={handleChange}
          className={`ui-control-bare text-xs ${inputClass} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-text"}`}
        />
      </div>

      {displayError && <p id={name ? `${name}-error` : undefined} className="ui-error">{displayError}</p>}
    </div>
  );
};

export { InputField as TextInput, InputField };
export default InputField;
