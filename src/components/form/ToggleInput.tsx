import React from 'react';

export interface ToggleInputProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

const ToggleInput: React.FC<ToggleInputProps> = ({
  label,
  checked,
  onChange,
  name,
  disabled = false,
  className = "",
  size = "md",
}) => {
  const handleSwitchChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const isSm = size === "sm";

  const toggleSwitch = (
    <label
      className={`relative inline-flex items-center ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={handleSwitchChange}
        className="sr-only peer"
        disabled={disabled}
      />
      <div
        className={`${
          isSm ? "w-8 h-4.5" : "w-10 h-5"
        } peer rounded-full bg-[var(--ui-border-strong)] transition-colors peer-checked:bg-[var(--primary-color)] peer-focus-visible:shadow-[0_0_0_3px_var(--ui-focus-ring)]`}
      >
        <div
          className={`absolute top-[2px] left-[2px] ${
            isSm ? "w-3.5 h-3.5" : "w-4 h-4"
          } bg-[var(--ui-surface)] rounded-full transition-all duration-200 ${
            checked ? (isSm ? "translate-x-3.5" : "translate-x-5") : ""
          }`}
        />
      </div>
    </label>
  );

  if (!label) {
    return <div className={`inline-flex items-center ${className}`}>{toggleSwitch}</div>;
  }

  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="ui-label">{label}</span>
      {toggleSwitch}
    </div>
  );
};

export default ToggleInput;
