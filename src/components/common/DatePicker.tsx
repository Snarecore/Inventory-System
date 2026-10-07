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
  error?: string;
  format?: string; // Internal value format, default "YYYY-MM-DD"
  displayFormat?: string; // Format to display in input, default "YYYY-MM-DD"
  isClearable?: boolean;
  size?: "sm" | "md" | "lg";
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
  error,
  format = "YYYY-MM-DD",
  displayFormat,
  isClearable = true,
  size = "md",
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
  const displayText = useMemo(() => {
    if (!selectedMoment) return "";
    return selectedMoment.format(displayFormat || format);
  }, [selectedMoment, displayFormat, format]);

  // Size styling
  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    md: "h-9 px-2.5 text-xs",
    lg: "h-10 px-3 text-sm",
  };

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-black mb-1">
          {label}
        </label>
      )}

      {/* Input Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-lg bg-white transition-all cursor-pointer select-none ${
          disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : isOpen
            ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15"
            : error
            ? "border-rose-400 focus:border-rose-500"
            : "border-gray-300 hover:border-gray-400"
        } ${sizeClasses[size]} ${inputClassName}`}
      >
        <div className="flex items-center gap-2 truncate flex-1 mr-1">
          <FaCalendarAlt className="text-gray-500 shrink-0 text-xs" />
          <span className={`truncate font-semibold ${displayText ? "text-black" : "text-gray-400"}`}>
            {displayText || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isClearable && displayText && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Clear date"
            >
              <FaTimes size={10} />
            </button>
          )}
          <FiChevronDown
            className={`text-gray-500 text-xs transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {error && <span className="text-[11px] text-rose-500 mt-0.5 block">{error}</span>}

      {/* Custom Modern Calendar Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2.5 z-[99999] animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
            {/* Month & Year Trigger */}
            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === "days" ? "months" : prev === "months" ? "years" : "days"))
              }
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
            >
              <span>
                {viewMode === "days" && viewDate.format("MMMM YYYY")}
                {viewMode === "months" && viewDate.format("YYYY")}
                {viewMode === "years" && `${yearsList[0]} - ${yearsList[yearsList.length - 1]}`}
              </span>
              <FiChevronDown size={11} className="text-black" />
            </button>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
                title="Previous"
              >
                <FaChevronLeft size={8} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-black hover:bg-gray-100 rounded transition-colors cursor-pointer"
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
                        ? "bg-[#0F365C] text-white font-bold"
                        : "text-black hover:bg-sky-50 hover:text-[var(--color-primary)] border border-gray-100"
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
                        ? "bg-[#0F365C] text-white font-bold"
                        : "text-black hover:bg-sky-50 hover:text-[var(--color-primary)] border border-gray-100"
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
                  <span key={d} className="text-[10px] font-bold text-black py-0.5">
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
                            ? "text-gray-300 cursor-not-allowed"
                            : isSelected
                            ? "bg-[#0F365C] text-white font-bold shadow-xs scale-105"
                            : isToday
                            ? "border border-[#0F365C] text-black font-bold hover:bg-sky-50"
                            : isCurrentMonth
                            ? "text-black font-semibold hover:bg-gray-100 cursor-pointer"
                            : "text-gray-300 hover:bg-gray-50 cursor-pointer"
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
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 text-xs font-semibold px-0.5">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-gray-700 hover:text-rose-600 transition-colors cursor-pointer py-0.5"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] text-black hover:text-[var(--color-primary)] font-bold transition-colors cursor-pointer py-0.5"
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
