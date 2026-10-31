import React, { ChangeEvent } from "react";

export interface CurrencyInputProps {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  currencySymbol?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: string;
  className?: string;
  inputClassName?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  currencySymbol = "৳",
  placeholder = "0",
  disabled = false,
  min = 0,
  max,
  step = "0.01",
  className = "",
  inputClassName = "",
}) => {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      {label && <label className="ui-label truncate">{label}</label>}
      <div className="relative w-32 sm:w-36 shrink-0">
        <span className="pointer-events-none absolute left-[var(--ui-control-px)] top-1/2 -translate-y-1/2 select-none font-bold text-[var(--ui-text)]">
          {currencySymbol}
        </span>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value === 0 || value === "0" ? "" : value}
          placeholder={placeholder}
          disabled={disabled}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={`ui-control ui-control-sm pl-[calc(var(--ui-control-px)+14px)] text-right font-bold tabular-nums ${inputClassName}`}
        />
      </div>
    </div>
  );
};

export default CurrencyInput;
