import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { TenderBreakdown } from "@/hooks/useMultiTenderSettlement";

export interface TenderBreakdownPortalProps {
  tenderBreakdown?: TenderBreakdown;
  title?: string;
  totalLabel?: string;
}

export const TenderBreakdownPortal: React.FC<TenderBreakdownPortalProps> = ({
  tenderBreakdown,
  title = "Payment Breakdown",
  totalLabel = "Total Paying:",
}) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    isPlacementTop: boolean;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = () => {
    const targetEl = buttonRef.current;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const dropdownWidth = 250;
    const estimatedHeight = 118;

    const modalEl =
      targetEl.closest(".bg-white.rounded-xl") || document.querySelector(".bg-white.rounded-xl");
    const modalRect = modalEl?.getBoundingClientRect();

    const buttonCenter = rect.left + rect.width / 2;
    let left = buttonCenter - dropdownWidth / 2;

    if (modalRect) {
      left = Math.max(modalRect.left + 8, Math.min(left, modalRect.right - dropdownWidth - 8));
    } else {
      const maxLeft = typeof window !== "undefined" ? window.innerWidth - dropdownWidth - 10 : 0;
      left = Math.max(10, Math.min(left, maxLeft));
    }

    let top = rect.bottom + 4;
    let isPlacementTop = false;

    if (modalRect) {
      const spaceBelow = modalRect.bottom - rect.bottom;
      const spaceAbove = rect.top - modalRect.top;

      if (spaceBelow < estimatedHeight + 8 && spaceAbove >= estimatedHeight) {
        top = rect.top - estimatedHeight - 4;
        isPlacementTop = true;
      } else {
        if (top + estimatedHeight > modalRect.bottom - 8) {
          top = modalRect.bottom - estimatedHeight - 8;
        }
      }
      if (top < modalRect.top + 8) {
        top = modalRect.top + 8;
      }
    }

    setDropdownCoords({
      top,
      left,
      arrowLeft: Math.max(12, Math.min(dropdownWidth - 16, buttonCenter - left)),
      isPlacementTop,
    });
  };

  const handleToggleBreakdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBreakdownOpen) {
      setIsBreakdownOpen(false);
    } else {
      updateDropdownPosition();
      setIsBreakdownOpen(true);
    }
  };

  useEffect(() => {
    if (!isBreakdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        breakdownRef.current &&
        !breakdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsBreakdownOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      if (breakdownRef.current && breakdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsBreakdownOpen(false);
    };
    const handleResize = () => {
      setIsBreakdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isBreakdownOpen]);

  const cashAmount = tenderBreakdown?.cash || 0;
  const bankAmount = tenderBreakdown?.bank || 0;
  const mfsAmount = tenderBreakdown?.mfs || 0;
  const totalAmount = cashAmount + bankAmount + mfsAmount;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleBreakdown}
        className={`p-0.5 rounded transition-colors cursor-pointer inline-flex items-center justify-center ${
          isBreakdownOpen
            ? "bg-black text-white"
            : "hover:bg-gray-200 text-gray-700 hover:text-black"
        }`}
        title="Click to view payment breakdown (Cash, Bank, MFS)"
      >
        <RiArrowDropDownLine
          className={`text-lg leading-none transition-transform duration-150 ${
            isBreakdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isBreakdownOpen &&
        dropdownCoords &&
        createPortal(
          <div
            ref={breakdownRef}
            style={{
              position: "fixed",
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              zIndex: 99999,
              width: "250px",
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl p-2 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Tooltip Arrow */}
            <div
              style={{ left: `${dropdownCoords.arrowLeft}px` }}
              className={`absolute -translate-x-1/2 w-2 h-2 bg-white border-gray-200 transform rotate-45 pointer-events-none ${
                dropdownCoords.isPlacementTop
                  ? "-bottom-1 border-b border-r"
                  : "-top-1 border-t border-l"
              }`}
            />

            <div className="flex items-center justify-between pb-1 mb-1 border-b border-gray-100 font-semibold text-gray-800">
              <span>{title}</span>
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {/* Cash Leg */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <FaMoneyBillWave className="text-emerald-600" size={11} />
                  Cash:
                </span>
                <span className="font-semibold text-black">
                  ৳ {formatMoney(cashAmount)}
                </span>
              </div>

              {/* Bank Leg */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50">
                <span
                  className="flex items-center gap-1.5 text-gray-600 truncate max-w-[140px]"
                  title={tenderBreakdown?.bankName}
                >
                  <FaCreditCard className="text-sky-600 shrink-0" size={11} />
                  <span className="truncate">Bank:</span>
                </span>
                <span className="font-semibold text-black">
                  ৳ {formatMoney(bankAmount)}
                </span>
              </div>

              {/* MFS Leg */}
              <div className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-gray-50">
                <span
                  className="flex items-center gap-1.5 text-gray-600 truncate max-w-[140px]"
                  title={tenderBreakdown?.mfsName}
                >
                  <FaMobileAlt className="text-purple-600 shrink-0" size={11} />
                  <span className="truncate">MFS:</span>
                </span>
                <span className="font-semibold text-black">
                  ৳ {formatMoney(mfsAmount)}
                </span>
              </div>

              {/* Total Row */}
              <div className="pt-1 mt-1 border-t border-gray-100 flex items-center justify-between font-bold text-black">
                <span>{totalLabel}</span>
                <span>৳ {formatMoney(totalAmount)}</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default TenderBreakdownPortal;
