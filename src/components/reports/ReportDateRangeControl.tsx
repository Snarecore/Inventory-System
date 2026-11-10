import React from "react";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";

interface ReportDateRangeControlProps extends ReportDateFilterProps {
  onAfterChange?: () => void;
  className?: string;
}

/**
 * Shared toolbar DateRangePicker wrapper aligned cleanly next to table Search controls
 */
export const ReportDateRangeControl: React.FC<ReportDateRangeControlProps> = ({
  startDate,
  endDate,
  dateRange = "this_month",
  onPresetChange,
  onDateChange,
  onAfterChange,
  className = "w-full sm:w-40 lg:w-44 shrink-0 z-50",
}) => {
  if (!onDateChange) return null;

  return (
    <div className={className}>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        selectedPreset={dateRange}
        onPresetChange={(preset) => {
          onPresetChange?.(preset);
          onAfterChange?.();
        }}
        onChange={(range) => {
          onDateChange(range);
          onAfterChange?.();
        }}
        align="left"
        size="sm"
        inputClassName="h-[32px]"
      />
    </div>
  );
};

export default ReportDateRangeControl;
