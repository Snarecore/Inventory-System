import React, { useState, useRef, useEffect, useMemo } from "react";
import moment from "moment";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
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
  inputClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  required?: boolean;
  error?: string;
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
  inputClassName = "",
  align = "left",
  disabled = false,
  size = "md",
  label,
  required = false,
  error,
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
    { value: "30_days", label: "30 Days" },
    { value: "this_year", label: "This Year" },
  ];

  const emitChange = (start: string, end: string, label: string) => {
    if (onDateChange) {
      onDateChange(start ? moment(start).toDate() : "", end ? moment(end).toDate() : "", label);
    }
    if (onChange) {
      onChange({ startDate: start, endDate: end, label });
    }
  };

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
      case "30_days":
      case "last_30_days":
        start = today.clone().subtract(30, "days").format("YYYY-MM-DD");
        end = today.format("YYYY-MM-DD");
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

    emitChange(start, end, presetKey);
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
      emitChange(dayStr, "", "custom");
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

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
  let displayLabel = "All Dates";
  if (activePreset && activePreset !== "all" && activePreset !== "custom") {
    const found = presets.find((p) => p.value === activePreset);
    if (found) displayLabel = found.label;
  } else if (rangeStart && rangeEnd) {
    displayLabel = rangeStart === rangeEnd
      ? moment(rangeStart).format("D MMM YYYY")
      : `${moment(rangeStart).format("D MMM")} - ${moment(rangeEnd).format("D MMM")}`;
  } else if (rangeStart) {
    displayLabel = `From ${moment(rangeStart).format("D MMM")}`;
  } else if (rangeEnd) {
    displayLabel = `Until ${moment(rangeEnd).format("D MMM")}`;
  }

  // Size styling
  const sizeClasses: Record<string, string> = {
    xs: "ui-control-xs",
    sm: "ui-control-sm",
    md: "",
    lg: "h-[calc(var(--ui-control-h)+6px)] text-[calc(var(--ui-font-size)+1px)]",
  };

  const isFiltered = Boolean((activePreset && activePreset !== "all") || rangeStart || rangeEnd);

  return (
    <div className={`relative w-full ${label ? "ui-field" : ""} ${className}`} ref={containerRef}>
      {label && (
        <label className={`ui-label ${required ? "ui-label-required" : ""}`}>
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`ui-control flex w-full items-center justify-between cursor-pointer select-none ${
          sizeClasses[size] || ""
        } ${
          disabled
            ? "cursor-not-allowed bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]"
            : isOpen
            ? "border-[var(--primary-color)] shadow-[0_0_0_3px_var(--ui-focus-ring)]"
            : isFiltered
            ? "border-[var(--color-primary)] bg-[var(--primary-color-light)]/40 text-[var(--color-primary)] font-semibold"
            : ""
        } ${error ? "is-invalid" : ""} ${inputClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate mr-1">
          <FaCalendarAlt className="text-[var(--ui-text-subtle)] shrink-0 text-xs" />
          <span className="truncate text-xs text-[var(--ui-text)] font-medium">{displayLabel || placeholder}</span>
        </div>
        <FiChevronDown
          className={`text-[var(--ui-text-subtle)] shrink-0 text-xs transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {error && <p className="ui-error mt-0.5">{error}</p>}

      {/* Date Range Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-1 w-72 bg-[var(--ui-surface)] rounded-xl shadow-2xl border border-[var(--ui-border)] p-3 z-[99999] animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Quick Filters Header */}
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-bold text-[var(--ui-text)] uppercase tracking-wider">
              Quick Filters
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-semibold text-[var(--ui-danger)] hover:text-[var(--ui-danger-dark)] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick Filters Grid */}
          <div className="grid grid-cols-3 gap-1 mb-2.5">
            {presets.map((p) => {
              const isSelected = activePreset === p.value && !rangeStart && !rangeEnd;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleSelectPreset(p.value)}
                  className={`px-1.5 py-1 text-[10.5px] rounded-md text-center transition-all cursor-pointer font-medium truncate ${
                    isSelected
                      ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] border border-[var(--color-primary)] font-bold"
                      : "bg-[var(--ui-surface-muted)]/90 hover:bg-[var(--primary-color-light)] text-[var(--ui-text)] border border-[var(--ui-border)] hover:border-[var(--primary-color-muted)]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Dedicated Start Date & End Date Inputs Section */}
          <div className="pt-2 border-t border-[var(--ui-border)] mb-2.5">
            <div className="text-[10px] font-bold text-[var(--ui-text)] uppercase tracking-wider mb-1.5 px-0.5">
              Custom Date Range
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] font-medium text-[var(--ui-text)] block mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRangeStart(val);
                    setActivePreset("custom");
                    if (val && moment(val).isValid()) {
                      setViewDate(moment(val));
                    }
                    emitChange(val, rangeEnd, "custom");
                  }}
                  className="w-full px-2 py-1 text-xs border border-[var(--ui-border-strong)] rounded-md focus:outline-none focus:border-[var(--color-primary)] text-[var(--ui-text)] font-normal bg-[var(--ui-surface)]"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[var(--ui-text)] block mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={rangeEnd}
                  min={rangeStart || undefined}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRangeEnd(val);
                    setActivePreset("custom");
                    if (val && moment(val).isValid()) {
                      setViewDate(moment(val));
                    }
                    emitChange(rangeStart, val, "custom");
                  }}
                  className="w-full px-2 py-1 text-xs border border-[var(--ui-border-strong)] rounded-md focus:outline-none focus:border-[var(--color-primary)] text-[var(--ui-text)] font-normal bg-[var(--ui-surface)]"
                />
              </div>
            </div>
          </div>

          {/* Interactive Calendar Picker Section */}
          <div className="pt-2 border-t border-[var(--ui-border)]">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-xs font-bold text-[var(--ui-text)]">
                {viewDate.format("MMMM YYYY")}
              </span>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] rounded transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <FaChevronLeft size={9} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] rounded transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <FaChevronRight size={9} />
                </button>
              </div>
            </div>

            {/* Day Header (Su, Mo, Tu, We, Th, Fr, Sa) */}
            <div className="grid grid-cols-7 mb-0.5 text-center">
              {daysOfWeek.map((d) => (
                <span key={d} className="text-[10px] font-bold text-[var(--ui-text)] py-0.5">
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
                      isInRange ? "bg-[var(--primary-color-muted)]/70" : ""
                    } ${isStart && (rangeEnd || hoverDate) ? "rounded-l-md bg-[var(--primary-color-muted)]/70" : ""} ${
                      isEnd && rangeStart ? "rounded-r-md bg-[var(--primary-color-muted)]/70" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDayClick(dateStr)}
                      onMouseEnter={() => rangeStart && !rangeEnd && setHoverDate(dateStr)}
                      className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        isStart || isEnd
                          ? "bg-[var(--color-primary)] text-white font-bold shadow-xs z-10"
                          : isInRange
                          ? "text-[var(--ui-text)] font-semibold"
                          : isToday
                          ? "border border-[var(--color-primary)] text-[var(--ui-text)] font-bold hover:bg-[var(--primary-color-light)]"
                          : isCurrentMonth
                          ? "text-[var(--ui-text)] font-normal hover:bg-[var(--ui-surface-sunken)]"
                          : "text-[var(--ui-text-subtle)] hover:bg-[var(--ui-surface-muted)]"
                      }`}
                    >
                      {dayNum}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer: Clear & Apply buttons */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--ui-border)] text-xs font-semibold px-0.5">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer py-0.5 font-medium"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => {
                emitChange(rangeStart, rangeEnd, activePreset || "custom");
                setIsOpen(false);
              }}
              className="px-3 py-1 text-xs bg-[var(--ui-accent-2)] hover:bg-[var(--ui-accent-2)] text-[var(--ui-text)] rounded-lg font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
