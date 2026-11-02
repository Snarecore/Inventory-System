import React, { useState, useRef, useEffect, useMemo } from "react";
import moment from "moment";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";

export interface DatePickerProps {
  value?: string | Date | null;
  onChange: (dateStr: string, dateObj: Date | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  minDate?: string | Date;
  maxDate?: string | Date;
  label?: string;
  required?: boolean;
  error?: string;
  format?: string; 
  displayFormat?: string; 
  isClearable?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  align?: "left" | "right";
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date...",
  className = "",
  inputClassName = "",
  disabled = false,
  minDate,
  maxDate,
  label,
  required = false,
  error,
  format = "YYYY-MM-DD",
  displayFormat,
  isClearable = true,
  size = "md",
  align = "left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalized selected date as moment
  const selectedMoment = useMemo(() => {
    if (!value) return null;
    const m = moment(value);
    return m.isValid() ? m : null;
  }, [value]);

  // View state for browsing months/years in calendar
  const [viewDate, setViewDate] = useState<moment.Moment>(() => {
    return selectedMoment ? selectedMoment.clone() : moment();
  });

  // Mode: "days" | "months" | "years"
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  // Sync viewDate when value changes from outside
  useEffect(() => {
    if (selectedMoment) {
      setViewDate(selectedMoment.clone());
    }
  }, [selectedMoment]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode("days");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate((prev) => prev.clone().subtract(1, "month"));
    } else if (viewMode === "years") {
      setViewDate((prev) => prev.clone().subtract(12, "year"));
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === "days") {
      setViewDate((prev) => prev.clone().add(1, "month"));
    } else if (viewMode === "years") {
      setViewDate((prev) => prev.clone().add(12, "year"));
    }
  };

  // Day selection
  const handleSelectDay = (dayMoment: moment.Moment) => {
    onChange(dayMoment.format(format), dayMoment.toDate());
    setIsOpen(false);
  };

  // Quick Today button
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = moment();
    onChange(today.format(format), today.toDate());
    setViewDate(today.clone());
    setIsOpen(false);
  };

  // Clear button
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", null);
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const calendarGrid = useMemo(() => {
    const startOfMonth = viewDate.clone().startOf("month");
    const endOfMonth = viewDate.clone().endOf("month");
    const startDate = startOfMonth.clone().startOf("week");
    const endDate = endOfMonth.clone().endOf("week");

    const days: Array<{
      date: moment.Moment;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const curr = startDate.clone();
    while (curr.isBefore(endDate, "day") || curr.isSame(endDate, "day")) {
      const isCurrentMonth = curr.isSame(viewDate, "month");
      const isSelected = Boolean(selectedMoment && curr.isSame(selectedMoment, "day"));
      const isToday = curr.isSame(moment(), "day");

      let isDisabled = false;
      if (minDate && curr.isBefore(moment(minDate), "day")) isDisabled = true;
      if (maxDate && curr.isAfter(moment(maxDate), "day")) isDisabled = true;

      days.push({
        date: curr.clone(),
        isCurrentMonth,
        isSelected,
        isToday,
        isDisabled,
      });

      curr.add(1, "day");
    }

    return days;
  }, [viewDate, selectedMoment, minDate, maxDate]);

  // Months list for quick month selector
  const monthsList = moment.monthsShort();

  // Years list for quick year selector
  const yearsList = useMemo(() => {
    const startYear = Math.floor(viewDate.year() / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  }, [viewDate]);

  // Display text in input
  const displayText = selectedMoment ? selectedMoment.format(displayFormat || format) : "";

  // Size styling
  const sizeClasses: Record<string, string> = {
    xs: "ui-control-xs",
    sm: "ui-control-sm",
    md: "",
    lg: "h-[calc(var(--ui-control-h)+6px)] text-[calc(var(--ui-font-size)+1px)]",
  };

  return (
    <div className={`relative w-full ${label ? "ui-field" : ""} ${className}`} ref={containerRef}>
      {label && (
        <label className={`ui-label ${required ? "ui-label-required" : ""}`}>
          {label}
        </label>
      )}

      {/* Input Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`ui-control flex w-full cursor-pointer select-none items-center justify-between ${
          sizeClasses[size] || ""
        } ${
          disabled
            ? "cursor-not-allowed bg-[var(--ui-surface-sunken)] text-[var(--ui-text-subtle)]"
            : isOpen
            ? "border-[var(--primary-color)] shadow-[0_0_0_3px_var(--ui-focus-ring)]"
            : error
            ? "is-invalid"
            : ""
        } ${inputClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 mr-1">
          <FaCalendarAlt className={`shrink-0 text-xs ${displayText ? "text-[var(--ui-text)]" : "text-[var(--ui-text-subtle)]"}`} />
          <span className={`truncate text-xs font-medium ${displayText ? "text-[var(--ui-text)]" : "text-[var(--ui-text-subtle)]"}`}>
            {displayText || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isClearable && displayText && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text-muted)] rounded transition-colors cursor-pointer"
              title="Clear date"
            >
              <FaTimes size={10} />
            </button>
          )}
          <FiChevronDown
            className={`text-xs transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            } ${displayText ? "text-[var(--ui-text)]" : "text-[var(--ui-text-subtle)]"}`}
          />
        </div>
      </div>

      {error && <p className="ui-error mt-0.5">{error}</p>}

      {/* Custom Modern Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-1 w-64 bg-[var(--ui-surface)] rounded-xl shadow-xl border border-[var(--ui-border)] p-2.5 z-[99999] animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--ui-border)]">
            {/* Month & Year Trigger */}
            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === "days" ? "months" : prev === "months" ? "years" : "days"))
              }
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] rounded transition-colors cursor-pointer"
            >
              <span>
                {viewMode === "days" && viewDate.format("MMMM YYYY")}
                {viewMode === "months" && viewDate.format("YYYY")}
                {viewMode === "years" && `${yearsList[0]} - ${yearsList[yearsList.length - 1]}`}
              </span>
              <FiChevronDown size={11} className="text-[var(--ui-text)]" />
            </button>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] rounded transition-colors cursor-pointer"
                title="Previous"
              >
                <FaChevronLeft size={8} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] rounded transition-colors cursor-pointer"
                title="Next"
              >
                <FaChevronRight size={8} />
              </button>
            </div>
          </div>

          {/* Month Selection Mode */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-1 py-1">
              {monthsList.map((month, idx) => {
                const isSelectedMonth = viewDate.month() === idx;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      setViewDate((prev) => prev.clone().month(idx));
                      setViewMode("days");
                    }}
                    className={`py-1.5 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                      isSelectedMonth
                        ? "bg-[var(--primary-color)] text-white font-bold"
                        : "text-[var(--ui-text)] hover:bg-[var(--primary-color-light)] hover:text-[var(--color-primary)] border border-[var(--ui-border)]"
                    }`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          )}

          {/* Year Selection Mode */}
          {viewMode === "years" && (
            <div className="grid grid-cols-3 gap-1 py-1">
              {yearsList.map((yr) => {
                const isSelectedYr = viewDate.year() === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setViewDate((prev) => prev.clone().year(yr));
                      setViewMode("months");
                    }}
                    className={`py-1.5 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                      isSelectedYr
                        ? "bg-[var(--primary-color)] text-white font-bold"
                        : "text-[var(--ui-text)] hover:bg-[var(--primary-color-light)] hover:text-[var(--color-primary)] border border-[var(--ui-border)]"
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {/* Days Grid Mode */}
          {viewMode === "days" && (
            <>
              {/* Day Headers (Su, Mo, Tu, We, Th, Fr, Sa) */}
              <div className="grid grid-cols-7 mb-0.5 text-center">
                {daysOfWeek.map((d) => (
                  <span key={d} className="text-[10px] font-bold text-[var(--ui-text)] py-0.5">
                    {d}
                  </span>
                ))}
              </div>

              {/* Day Numbers Grid */}
              <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
                {calendarGrid.map((item, idx) => {
                  const { date, isCurrentMonth, isSelected, isToday, isDisabled } = item;

                  return (
                    <div key={idx} className="flex items-center justify-center p-0">
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleSelectDay(date)}
                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-medium transition-all ${
                          isDisabled
                            ? "text-[var(--ui-text-subtle)] cursor-not-allowed"
                            : isSelected
                            ? "bg-[var(--primary-color)] text-white font-bold shadow-xs scale-105"
                            : isToday
                            ? "border border-[var(--primary-color)] text-[var(--ui-text)] font-bold hover:bg-[var(--primary-color-light)]"
                            : isCurrentMonth
                            ? "text-[var(--ui-text)] font-semibold hover:bg-[var(--ui-surface-sunken)] cursor-pointer"
                            : "text-[var(--ui-text-subtle)] hover:bg-[var(--ui-surface-muted)] cursor-pointer"
                        }`}
                      >
                        {date.date()}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Calendar Footer */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--ui-border)] text-xs font-semibold px-0.5">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-[var(--ui-text)] hover:text-[var(--ui-danger)] transition-colors cursor-pointer py-0.5"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] text-[var(--ui-text)] hover:text-[var(--color-primary)] font-bold transition-colors cursor-pointer py-0.5"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
