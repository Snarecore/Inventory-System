import React, { useState, useRef, useEffect, useMemo } from "react";
import moment from "moment";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label?: string;
}

export interface DateRangePickerProps {
  onDateChange?: (startDate: Date | string, endDate: Date | string, label?: string) => void;
  onChange?: (range: DateRange) => void;
  initialStartDate?: Date | string | null;
  initialEndDate?: Date | string | null;
  startDate?: string;
  endDate?: string;
  selectedPreset?: string;
  onPresetChange?: (preset: string) => void;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  onDateChange,
  onChange,
  initialStartDate,
  initialEndDate,
  startDate,
  endDate,
  selectedPreset = "all",
  onPresetChange,
  placeholder = "Select date range...",
  className = "",
  align = "left",
  disabled = false,
  size = "md",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Range state
  const [rangeStart, setRangeStart] = useState<string>(() => {
    if (startDate) return moment(startDate).format("YYYY-MM-DD");
    if (initialStartDate) return moment(initialStartDate).format("YYYY-MM-DD");
    return "";
  });

  const [rangeEnd, setRangeEnd] = useState<string>(() => {
    if (endDate) return moment(endDate).format("YYYY-MM-DD");
    if (initialEndDate) return moment(initialEndDate).format("YYYY-MM-DD");
    return "";
  });

  const [activePreset, setActivePreset] = useState<string>(selectedPreset);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sync external props
  useEffect(() => {
    if (startDate !== undefined) {
      setRangeStart(startDate ? moment(startDate).format("YYYY-MM-DD") : "");
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate !== undefined) {
      setRangeEnd(endDate ? moment(endDate).format("YYYY-MM-DD") : "");
    }
  }, [endDate]);

  useEffect(() => {
    if (selectedPreset) {
      setActivePreset(selectedPreset);
    }
  }, [selectedPreset]);

  // Calendar View month (browsing)
  const [viewDate, setViewDate] = useState<moment.Moment>(() => {
    if (rangeStart && moment(rangeStart).isValid()) {
      return moment(rangeStart);
    }
    return moment();
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Navigation
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => prev.clone().subtract(1, "month"));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => prev.clone().add(1, "month"));
  };

  // Presets definition
  const presets = [
    { value: "all", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "this_year", label: "This Year" },
  ];

  const handleSelectPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (onPresetChange) onPresetChange(presetKey);

    let start = "";
    let end = "";

    const today = moment();
    switch (presetKey) {
      case "today":
        start = today.format("YYYY-MM-DD");
        end = today.format("YYYY-MM-DD");
        break;
      case "tomorrow":
        start = today.clone().add(1, "day").format("YYYY-MM-DD");
        end = today.clone().add(1, "day").format("YYYY-MM-DD");
        break;
      case "yesterday":
        start = today.clone().subtract(1, "day").format("YYYY-MM-DD");
        end = today.clone().subtract(1, "day").format("YYYY-MM-DD");
        break;
      case "this_week":
        start = today.clone().startOf("week").format("YYYY-MM-DD");
        end = today.clone().endOf("week").format("YYYY-MM-DD");
        break;
      case "this_month":
        start = today.clone().startOf("month").format("YYYY-MM-DD");
        end = today.clone().endOf("month").format("YYYY-MM-DD");
        break;
      case "last_month":
        start = today.clone().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
        end = today.clone().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
        break;
      case "this_year":
        start = today.clone().startOf("year").format("YYYY-MM-DD");
        end = today.clone().endOf("year").format("YYYY-MM-DD");
        break;
      case "all":
      default:
        start = "";
        end = "";
        break;
    }

    setRangeStart(start);
    setRangeEnd(end);

    if (start && moment(start).isValid()) {
      setViewDate(moment(start));
    }

    if (onDateChange) {
      onDateChange(start ? moment(start).toDate() : "", end ? moment(end).toDate() : "", presetKey);
    }
    if (onChange) {
      onChange({ startDate: start, endDate: end, label: presetKey });
    }

    setIsOpen(false);
  };

  // Calendar Day Click (Range Selection)
  const handleDayClick = (dayStr: string) => {
    setActivePreset("custom");
    if (onPresetChange) onPresetChange("custom");

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start a new range
      setRangeStart(dayStr);
      setRangeEnd("");
    } else if (rangeStart && !rangeEnd) {
      // Complete range
      if (dayStr < rangeStart) {
        setRangeStart(dayStr);
        setRangeEnd(rangeStart);
        emitChange(dayStr, rangeStart, "custom");
      } else {
        setRangeEnd(dayStr);
        emitChange(rangeStart, dayStr, "custom");
      }
      setIsOpen(false);
    }
  };

  const emitChange = (start: string, end: string, label: string) => {
    if (onDateChange) {
      onDateChange(start ? moment(start).toDate() : "", end ? moment(end).toDate() : "", label);
    }
    if (onChange) {
      onChange({ startDate: start, endDate: end, label });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRangeStart("");
    setRangeEnd("");
    setActivePreset("all");
    if (onPresetChange) onPresetChange("all");
    emitChange("", "", "all");
    setIsOpen(false);
  };

  // Calendar grid computation
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const calendarGrid = useMemo(() => {
    const startOfMonth = viewDate.clone().startOf("month");
    const endOfMonth = viewDate.clone().endOf("month");
    const startDateCal = startOfMonth.clone().startOf("week");
    const endDateCal = endOfMonth.clone().endOf("week");

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isStart: boolean;
      isEnd: boolean;
      isInRange: boolean;
      isToday: boolean;
    }> = [];

    const curr = startDateCal.clone();
    const effectiveEnd = rangeEnd || (hoverDate && rangeStart && hoverDate >= rangeStart ? hoverDate : "");

    while (curr.isBefore(endDateCal, "day") || curr.isSame(endDateCal, "day")) {
      const dStr = curr.format("YYYY-MM-DD");
      const isCurrentMonth = curr.isSame(viewDate, "month");
      const isStart = rangeStart === dStr;
      const isEnd = (rangeEnd || effectiveEnd) === dStr;
      const isInRange = Boolean(
        rangeStart && effectiveEnd && dStr > rangeStart && dStr < effectiveEnd
      );
      const isToday = curr.isSame(moment(), "day");

      days.push({
        dateStr: dStr,
        dayNum: curr.date(),
        isCurrentMonth,
        isStart,
        isEnd,
        isInRange,
        isToday,
      });

      curr.add(1, "day");
    }

    return days;
  }, [viewDate, rangeStart, rangeEnd, hoverDate]);

  // Display label on trigger
  const displayLabel = useMemo(() => {
    if (activePreset && activePreset !== "all" && activePreset !== "custom") {
      const found = presets.find((p) => p.value === activePreset);
      if (found) return found.label;
    }

    if (rangeStart && rangeEnd) {
      if (rangeStart === rangeEnd) {
        return moment(rangeStart).format("D MMM YYYY");
      }
      return `${moment(rangeStart).format("D MMM")} - ${moment(rangeEnd).format("D MMM")}`;
    }

    if (rangeStart) return `From ${moment(rangeStart).format("D MMM")}`;
    if (rangeEnd) return `Until ${moment(rangeEnd).format("D MMM")}`;

    return "All Dates";
  }, [activePreset, rangeStart, rangeEnd]);

  // Size styling
  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    md: "h-8 px-2.5 text-xs",
    lg: "h-9 px-3 text-sm",
  };

  const isFiltered = Boolean((activePreset && activePreset !== "all") || rangeStart || rangeEnd);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg transition-all cursor-pointer select-none ${
          disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : isFiltered
            ? "border-[var(--color-primary)] bg-sky-50/70 text-[var(--color-primary)] font-semibold"
            : "border-gray-200 bg-gray-50/50 hover:bg-white text-black font-medium focus:border-[var(--color-primary)]"
        } ${sizeClasses[size]}`}
      >
        <div className="flex items-center gap-1.5 truncate mr-1">
          <FaCalendarAlt className="text-gray-600 shrink-0 text-[11px]" />
          <span className="truncate text-black font-medium">{displayLabel || placeholder}</span>
        </div>
        <FiChevronDown
          className={`text-gray-500 shrink-0 text-xs transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Date Range Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2.5 z-[99999] animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Presets Header */}
          <div className="text-[10px] font-bold text-black uppercase tracking-wider mb-1.5 px-0.5">
            Quick Filters
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            {presets.map((p) => {
              const isSelected = activePreset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSelectPreset(p.value)}
                  className={`px-2 py-1 text-[11px] rounded-md text-left transition-all cursor-pointer font-semibold ${
                    isSelected
                      ? "bg-sky-50 text-[var(--color-primary)] border border-[var(--color-primary)]"
                      : "bg-gray-50/80 hover:bg-sky-50/60 text-black border border-gray-200 hover:border-sky-300 hover:text-[var(--color-primary)]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Calendar Picker Section */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-xs font-bold text-black">
                {viewDate.format("MMMM YYYY")}
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <FaChevronLeft size={8} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <FaChevronRight size={8} />
                </button>
              </div>
            </div>

            {/* Day Header (Su, Mo, Tu, We, Th, Fr, Sa) */}
            <div className="grid grid-cols-7 mb-0.5 text-center">
              {daysOfWeek.map((d) => (
                <span key={d} className="text-[10px] font-bold text-black py-0.5">
                  {d}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
              {calendarGrid.map((item, idx) => {
                const { dateStr, dayNum, isCurrentMonth, isStart, isEnd, isInRange, isToday } = item;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center p-0 relative ${
                      isInRange ? "bg-sky-100/70" : ""
                    } ${isStart && (rangeEnd || hoverDate) ? "rounded-l-md bg-sky-100/70" : ""} ${
                      isEnd && rangeStart ? "rounded-r-md bg-sky-100/70" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(dateStr)}
                      onMouseEnter={() => rangeStart && !rangeEnd && setHoverDate(dateStr)}
                      className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        isStart || isEnd
                          ? "bg-[#0F365C] text-white font-bold shadow-xs z-10"
                          : isInRange
                          ? "text-black font-semibold"
                          : isToday
                          ? "border border-[#0F365C] text-black font-bold hover:bg-sky-50"
                          : isCurrentMonth
                          ? "text-black font-semibold hover:bg-gray-100"
                          : "text-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {dayNum}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer: Clear & Selected status */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 text-xs font-semibold px-0.5">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-gray-700 hover:text-rose-600 transition-colors cursor-pointer py-0.5"
            >
              Clear
            </button>
            <span className="text-[11px] text-black font-bold truncate max-w-[150px]">
              {rangeStart && !rangeEnd ? "Select end date" : displayLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
