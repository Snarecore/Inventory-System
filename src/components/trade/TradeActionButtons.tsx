import React from "react";
import Button from "@/components/button/Button";

export interface TradeActionButtonsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  saveLabel: string; // e.g. "Sale" or "Purchase"
  saveAndPrintLabel?: string;
  onSave: () => void;
  onSaveAndPrint: () => void;
  saveColor?: string;
  saveAndPrintColor?: string;
  className?: string;
  disabled?: boolean;
}

export const TradeActionButtons: React.FC<TradeActionButtonsProps> = ({
  isSubmitting,
  isEditMode,
  saveLabel,
  saveAndPrintLabel = "Save & Print",
  onSave,
  onSaveAndPrint,
  saveColor = "var(--primary-color)",
  saveAndPrintColor = "#059669",
  className = "",
  disabled = false,
}) => {
  const mainLabel = isSubmitting
    ? "Saving..."
    : isEditMode
    ? `Update ${saveLabel}`
    : `Save ${saveLabel}`;

  return (
    <div className={`ui-card flex items-center gap-2 p-2 sm:p-2.5 ${className}`}>
      <Button
        label={mainLabel}
        onClick={onSave}
        color={saveColor}
        disabled={disabled || isSubmitting}
        buttonClass="flex-1 !w-auto justify-center !py-2 text-[length:var(--ui-font-size-sm)] font-semibold !text-white"
      />
      <Button
        label={saveAndPrintLabel}
        onClick={onSaveAndPrint}
        color={saveAndPrintColor}
        disabled={disabled || isSubmitting}
        buttonClass="flex-1 !w-auto justify-center !py-2 text-[length:var(--ui-font-size-sm)] font-semibold !text-white"
      />
    </div>
  );
};

export default TradeActionButtons;
