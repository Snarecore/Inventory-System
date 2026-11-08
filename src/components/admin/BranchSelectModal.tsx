import React, { useState, useMemo, useEffect } from "react";
import { getUserInfo, removeStoredUser } from "@/utils/auth-storage";
import {
  getStoredBranches,
  setStoredBranches,
  switchBranch,
  filterBranchesByPermission,
} from "@/utils/branch-storage";
import { useBranchListQuery } from "@/hooks/useBranchQueries";
import { FaBuilding, FaStar, FaSignOutAlt, FaCheck } from "react-icons/fa";

interface BranchSelectModalProps {
  onSelected?: (branchId: number) => void;
}

export const BranchSelectModal: React.FC<BranchSelectModalProps> = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: apiBranches = [], isLoading, isError } = useBranchListQuery();
  const storedBranches = getStoredBranches();

  // Prioritize live API branches. Sync with localStorage as soon as live branches arrive.
  const rawBranches = useMemo(() => {
    if (apiBranches && apiBranches.length > 0) {
      return apiBranches.filter((b) => b.active);
    }
    // If API failed or is empty and not loading, fall back to stored branches
    if (isError || (!isLoading && storedBranches.length > 0)) {
      return storedBranches;
    }
    return [];
  }, [apiBranches, isError, isLoading, storedBranches]);

  // Strictly filter branches by user's assigned permissions
  const branches = useMemo(() => {
    return filterBranchesByPermission(rawBranches);
  }, [rawBranches]);

  // Keep localStorage updated with only permitted active branches
  useEffect(() => {
    if (apiBranches && apiBranches.length > 0) {
      const active = apiBranches.filter((b) => b.active);
      const permitted = filterBranchesByPermission(active);
      if (permitted.length > 0) {
        setStoredBranches(permitted);
      }
    }
  }, [apiBranches]);

  // If user only has access to a single branch, auto-select it immediately
  useEffect(() => {
    if (branches.length === 1 && !selectedId) {
      handleSelect(branches[0].branchId);
    }
  }, [branches, selectedId]);

  const userInfo = getUserInfo();

  const handleSelect = (branchId: number) => {
    setSelectedId(branchId);
    switchBranch(branchId);
  };

  const handleLogout = () => {
    removeStoredUser();
    window.location.href = "/login";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans"
    >
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base">
              <FaBuilding />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Select Active Branch</h2>
              <p className="text-xs text-white/70 mt-0.5">
                {userInfo?.businessName || "Your Organization"}
                {isLoading ? " · checking branches..." : ` · ${branches.length} active locations`}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/80 mt-3 leading-relaxed">
            Please choose the branch you are working in. All entries, transactions, and reports will be scoped to this branch. You can switch branches anytime from the top bar.
          </p>
        </div>

        {/* Modal List */}
        <div className="p-3.5 overflow-y-auto flex flex-col gap-2 max-h-[360px]">
          {isLoading && branches.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[var(--primary-color,#009fe3)] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500">Checking accessible branches...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No active branch found for this account.
            </div>
          ) : (
            branches.map((b) => {
              const isSelected = selectedId === b.branchId;
              return (
                <button
                  key={b.branchId}
                  type="button"
                  disabled={selectedId !== null}
                  onClick={() => handleSelect(b.branchId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-[var(--primary-color,#009fe3)] bg-blue-50/60 dark:bg-blue-950/40 text-[var(--primary-color,#009fe3)] shadow-xs"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 bg-gray-50/50 dark:bg-gray-900/30 text-gray-800 dark:text-gray-100"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(b.name || "B").trim().charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs truncate">
                        {b.name || `Branch #${b.branchId}`}
                      </span>
                      {b.primary && <FaStar className="text-amber-400 text-[10px] flex-shrink-0" />}
                    </div>
                    {(b.code || b.address) && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {[b.code, b.address].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  {isSelected && <FaCheck className="text-[var(--primary-color,#009fe3)] text-xs flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            A branch selection is required to proceed.
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors cursor-pointer"
          >
            <FaSignOutAlt className="text-xs" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchSelectModal;
