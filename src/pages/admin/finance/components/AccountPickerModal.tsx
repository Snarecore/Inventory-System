import React, { useState, useMemo } from "react";
import { Modal } from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import type { BankAccountItem, MfsUserItem } from "@/types";
import { FaLandmark, FaMobileAlt, FaSearch, FaCheckCircle, FaTimes } from "react-icons/fa";

interface AccountPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "BANK" | "MFS";
  banks: BankAccountItem[];
  wallets: MfsUserItem[];
  selectedBankId?: number | null;
  selectedWalletId?: number | null;
  onSelectBank: (bank: BankAccountItem) => void;
  onSelectWallet: (wallet: MfsUserItem) => void;
}

export const AccountPickerModal: React.FC<AccountPickerModalProps> = ({
  isOpen,
  onClose,
  type,
  banks,
  wallets,
  selectedBankId,
  selectedWalletId,
  onSelectBank,
  onSelectWallet,
}) => {
  const [search, setSearch] = useState("");

  const filteredBanks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = banks.filter((b) => b.status.toLowerCase() === "active");
    if (!q) return active;
    return active.filter(
      (b) =>
        b.bankName.toLowerCase().includes(q) ||
        b.accountNo.toLowerCase().includes(q) ||
        (b.branchName && b.branchName.toLowerCase().includes(q))
    );
  }, [banks, search]);

  const filteredWallets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = wallets.filter((w) => w.status.toLowerCase() === "active");
    if (!q) return active;
    return active.filter(
      (w) =>
        w.method.toLowerCase().includes(q) ||
        w.phoneNumber.toLowerCase().includes(q) ||
        (w.name && w.name.toLowerCase().includes(q))
    );
  }, [wallets, search]);

  const title = type === "BANK" ? "Select Bank Account" : "Select MFS Wallet";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="w-full max-w-lg">
      <div className="flex flex-col gap-3 py-1">
        {/* Search Input */}
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              type === "BANK"
                ? "Search bank name, account number..."
                : "Search bKash, Nagad, mobile number..."
            }
            className="w-full pl-9 pr-9 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors focus:ring-2 focus:ring-[var(--color-primary)]/20"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>

        {/* List of Accounts */}
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {type === "BANK" ? (
            filteredBanks.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 flex flex-col items-center gap-1.5">
                <FaLandmark className="text-2xl text-gray-300" />
                <span>{search ? `No bank account matching "${search}"` : "No active bank accounts found."}</span>
              </div>
            ) : (
              filteredBanks.map((b) => {
                const isSelected = b.bankId === selectedBankId;
                return (
                  <div
                    key={b.bankId}
                    onClick={() => {
                      onSelectBank(b);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-sky-50/70 ring-1 ring-[var(--color-primary)] shadow-xs"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[var(--color-primary)] text-white" : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        <FaLandmark className="text-sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-black truncate">
                          {b.bankName}
                        </div>
                        <div className="text-[11px] text-gray-700 truncate mt-0.5">
                          A/C: <span className="font-bold text-black">{b.accountNo}</span>
                          {b.branchName ? ` · ${b.branchName}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs sm:text-sm font-bold text-black">
                        ৳ {formatMoney(b.currentBalance)}
                      </div>
                      <div className="text-[10px] text-gray-700 font-medium mt-0.5">Available Balance</div>
                    </div>
                  </div>
                );
              })
            )
          ) : filteredWallets.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500 font-medium flex flex-col items-center gap-1.5">
              <FaMobileAlt className="text-2xl text-gray-300" />
              <span>{search ? `No MFS wallet matching "${search}"` : "No active MFS wallets found."}</span>
            </div>
          ) : (
            filteredWallets.map((w) => {
              const isSelected = w.id === selectedWalletId;
              const upperMethod = w.method.toUpperCase();
              const badgeStyle = upperMethod.includes("BKASH")
                ? "bg-pink-100 text-pink-700"
                : upperMethod.includes("NAGAD")
                ? "bg-amber-100 text-amber-700"
                : upperMethod.includes("ROCKET")
                ? "bg-purple-100 text-purple-700"
                : "bg-emerald-100 text-emerald-700";

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    onSelectWallet(w);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-sky-50/70 ring-1 ring-[var(--color-primary)] shadow-xs"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badgeStyle}`}>
                      <FaMobileAlt className="text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-black truncate flex items-center gap-1.5">
                        <span>{w.method}</span>
                        {w.name && <span className="text-gray-600 font-normal">({w.name})</span>}
                        {isSelected && <FaCheckCircle className="text-[var(--color-primary)] text-xs" />}
                      </div>
                      <div className="text-[11px] text-gray-700 font-medium truncate mt-0.5">
                        {w.phoneNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xs sm:text-sm font-bold text-black">
                      ৳ {formatMoney(w.currentBalance)}
                    </div>
                    <div className="text-[10px] text-gray-700 font-medium mt-0.5">Available Balance</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AccountPickerModal;
