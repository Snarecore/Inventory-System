import React from "react";

interface AccountStatusBadgeProps {
  status: string;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

/**
 * Senior Developer Standard: Shared Account Status Badge
 * Used across Bank, MFS, and Financial account listings to keep status toggling DRY and consistent.
 */
export const AccountStatusBadge: React.FC<AccountStatusBadgeProps> = ({
  status,
  onToggle,
  disabled = false,
  className = "",
  title,
}) => {
  const isActive = (status || "").toLowerCase() === "active";
  const defaultTitle = onToggle
    ? `Click to switch to ${isActive ? "Inactive" : "Active"}`
    : `Status: ${status || "Inactive"}`;

  const baseClasses = `inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
    isActive
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : "bg-rose-100 text-rose-800 border-rose-300"
  } ${className}`;

  if (!onToggle) {
    return (
      <span className={baseClasses} title={title || defaultTitle}>
        {status || "Inactive"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`${baseClasses} cursor-pointer hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed`}
      title={title || defaultTitle}
    >
      {status || "Inactive"}
    </button>
  );
};

export default AccountStatusBadge;
