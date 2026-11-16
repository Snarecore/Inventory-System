import React, { useState, useRef, useEffect } from "react";
import { getUserInfo, getActiveBranchId } from "@/utils/auth-storage";
import {
  getStoredBranches,
  isMultiBranch,
  switchBranch,
  filterBranchesByPermission,
} from "@/utils/branch-storage";
import { useBranchListQuery } from "@/hooks/useBranchQueries";
import { FaChevronDown, FaCheck, FaStar } from "react-icons/fa";

export const BranchSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Load live branches and strictly filter by user branch permission
  const { data: apiBranches = [] } = useBranchListQuery();
  const storedBranches = getStoredBranches();
  const rawBranches = apiBranches.length > 0 ? apiBranches.filter((b) => b.active) : storedBranches;
  const branches = filterBranchesByPermission(rawBranches);

  const userInfo = getUserInfo();
  const activeBranchId = getActiveBranchId();
  const multi = isMultiBranch() || branches.length > 1;

  const activeBranch = branches.find((b) => b.branchId === activeBranchId);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const displayName =
    activeBranch?.name ||
    userInfo?.businessName ||
    (activeBranchId ? `Branch #${activeBranchId}` : "Branch");

  if (!multi || branches.length <= 1) {
    return (
      <div
        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[var(--ui-surface-muted)] text-gray-700 dark:text-[var(--ui-text)] border border-gray-200 dark:border-[var(--ui-border)] text-xs font-semibold select-none shadow-2xs"
        title={displayName}
      >
        <span className="max-w-[130px] truncate">{displayName}</span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-gray-100 dark:bg-[var(--ui-surface-muted)] hover:bg-gray-200 dark:hover:bg-[var(--ui-surface-sunken)] border border-gray-200 dark:border-[var(--ui-border)] text-gray-700 dark:text-[var(--ui-text)] text-xs font-semibold transition-colors cursor-pointer shadow-2xs select-none"
        title="Switch active workspace branch"
      >
        <span className="max-w-[120px] truncate">{displayName}</span>
        <FaChevronDown
          className={`text-[9px] text-gray-500 dark:text-[var(--ui-text-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-[var(--ui-surface)] rounded-xl shadow-xl border border-gray-200 dark:border-[var(--ui-border)] p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-xs text-gray-800 dark:text-[var(--ui-text)] border-b border-gray-100 dark:border-[var(--ui-border)] mb-1">
            Switch Workspace Branch
          </div>

          <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
            {branches.map((b) => {
              const on = b.branchId === activeBranchId;
              return (
                <button
                  key={b.branchId}
                  type="button"
                  onClick={() => {
                    if (on) {
                      setOpen(false);
                    } else {
                      switchBranch(b.branchId);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    on
                      ? "bg-blue-50 dark:bg-blue-950/50 text-[var(--primary-color,#009fe3)]"
                      : "text-gray-700 dark:text-[var(--ui-text)] hover:bg-gray-100 dark:hover:bg-[var(--ui-surface-muted)]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`truncate ${on ? "font-semibold" : "font-normal"}`}>{b.name || `Branch #${b.branchId}`}</span>
                      {b.primary && <FaStar className="text-amber-400 text-[10px] flex-shrink-0" />}
                    </div>
                    {(b.code || b.address) && (
                      <div className="text-[10px] text-gray-500 dark:text-[var(--ui-text-muted)] font-normal truncate mt-0.5">
                        {[b.code, b.address].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  {on && <FaCheck className="text-[var(--primary-color,#009fe3)] text-[11px] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;
