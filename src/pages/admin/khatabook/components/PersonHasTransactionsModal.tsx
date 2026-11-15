import React from "react";
import { useTranslation } from "react-i18next";
import { FiAlertTriangle, FiTrash2, FiEye, FiCheck } from "react-icons/fi";
import type { LedgerPerson } from "@/types";

export interface PersonHasTransactionsModalProps {
  isOpen: boolean;
  person: LedgerPerson | null;
  onClose: () => void;
  onViewLedger: (person: LedgerPerson) => void;
  onDeleteAllTransactions: (person: LedgerPerson) => void;
  isDeletingTxns?: boolean;
}

export const PersonHasTransactionsModal: React.FC<PersonHasTransactionsModalProps> = ({
  isOpen,
  person,
  onClose,
  onViewLedger,
  onDeleteAllTransactions,
  isDeletingTxns = false,
}) => {
  const { t } = useTranslation();
  if (!isOpen || !person) return null;

  const txnCount = person.transactionCount ?? 0;
  const pabo = Number(person.totalPabo ?? 0);
  const dibo = Number(person.totalDibo ?? 0);
  const net = Number(person.netBalance ?? 0);

  return (
    <div className="ui-modal-backdrop fixed inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-text)_72%,transparent)] bg-opacity-50 z-[9999] p-3">
      <div
        className="ui-modal-panel bg-[var(--ui-surface)] rounded-xl shadow-2xl w-full max-w-[440px] p-5 sm:p-6 border border-[var(--ui-border)] relative"
        role="dialog"
        aria-labelledby="txn-warning-title"
      >
        <div className="flex flex-col items-center text-center">
          <div className="bg-[var(--ui-danger-light,#fee2e2)] p-3 rounded-full mb-3 text-[var(--ui-danger,#ef4444)]">
            <FiAlertTriangle className="text-2xl" />
          </div>

          <h3 id="txn-warning-title" className="text-sm sm:text-base font-bold text-[var(--ui-text)]">
            {t("Cannot Delete Person Directly")}
          </h3>

          <p className="text-xs text-[var(--ui-text-muted)] mt-1.5 leading-relaxed">
            <span className="font-semibold text-[var(--ui-text)]">"{person.name}"</span> এর সাথে{" "}
            <span className="font-bold text-[var(--ui-danger)]">{txnCount} টি লেনদেন</span> বিদ্যমান।
            ব্যাকএন্ডের নিয়ম অনুযায়ী কোনো ব্যক্তিকে ডিলিট করার আগে তার সমস্ত লেনদেন ডিলিট করতে হবে।
          </p>
        </div>

        {/* Transaction Summary Box */}
        <div className="my-3.5 p-3 rounded-lg bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] text-xs flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[var(--ui-text-muted)]">
            <span>{t("Phone")}:</span>
            <span className="font-semibold text-[var(--ui-text)]">{person.phone || "-"}</span>
          </div>
          {person.address && (
            <div className="flex justify-between items-center text-[var(--ui-text-muted)]">
              <span>{t("Address")}:</span>
              <span className="font-semibold text-[var(--ui-text)] truncate max-w-[220px]" title={person.address}>
                {person.address}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-[var(--ui-text-muted)]">
            <span>{t("Total Receivable")}:</span>
            <span className="font-semibold text-[var(--ui-success)]">
              ৳{pabo.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center text-[var(--ui-text-muted)]">
            <span>{t("Total Payable")}:</span>
            <span className="font-semibold text-[var(--ui-danger)]">
              ৳{dibo.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border-t border-[var(--ui-border)] pt-1.5 flex justify-between items-center font-bold">
            <span className="text-[var(--ui-text)]">{t("Net Balance")}:</span>
            <span
              className={
                net > 0
                  ? "text-[var(--ui-success)]"
                  : net < 0
                  ? "text-[var(--ui-danger)]"
                  : "text-[var(--ui-text-muted)]"
              }
            >
              ৳{Math.abs(net).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
              <span className="text-[10px] font-normal">
                {net > 0 ? ` (${t("Pabo")})` : net < 0 ? ` (${t("Dibo")})` : ""}
              </span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewLedger(person);
            }}
            disabled={isDeletingTxns}
            className="w-full py-2 px-3 bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--primary-color,#009fe3)] border border-[var(--primary-color,#009fe3)]/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <FiEye className="text-sm" />
            <span>লেনদেন স্টেটমেন্ট দেখুন ও মুছুন (View Ledger)</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteAllTransactions(person)}
            disabled={isDeletingTxns}
            className="w-full py-2 px-3 bg-[var(--ui-danger,#ef4444)] hover:bg-[var(--ui-danger-dark,#dc2626)] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FiTrash2 className="text-sm" />
            <span>
              {isDeletingTxns
                ? "লেনদেনগুলো ডিলিট হচ্ছে..."
                : `এই ব্যক্তির সকল (${txnCount}টি) লেনদেন একবারে মুছুন`}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeletingTxns}
            className="w-full py-1.5 px-3 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] rounded-lg text-xs font-medium transition cursor-pointer mt-0.5"
          >
            বাতিল (Cancel)
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonHasTransactionsModal;
