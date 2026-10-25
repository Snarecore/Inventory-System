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
      {label && <label className="text-[11px] text-black font-semibold truncate">{label}</label>}
      <div className="relative w-32 sm:w-36 shrink-0">
        <span className="absolute left-2.5 top-1.5 text-black text-xs font-bold pointer-events-none select-none">
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
          className={`w-full pl-6 pr-2.5 py-1 text-xs border border-gray-300 rounded-lg text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all bg-white disabled:bg-gray-100 disabled:opacity-60 ${inputClassName}`}
        />
      </div>
    </div>
  );
};

export default CurrencyInput;
