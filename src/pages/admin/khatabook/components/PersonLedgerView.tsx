import React, { useState, useMemo } from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import Button from "@/components/button/Button";
import ExcelExportButton from "@/components/table-components/ExcelExportButton";
import TableActionButtons from "@/components/table-components/TableActionButtons";
import {
  TableContainer,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
} from "@/components/common";
import type { LedgerPerson, LedgerTransaction } from "@/types";
import { useLedgerTransactionsQuery } from "@/hooks/useKhatabook";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel } from "@/utils/excel-export";
import {
  FaPhone,
  FaMapMarkerAlt,
  FaPlus,
  FaMinus,
  FaPrint,
  FaTrash,
  FaMoneyBillWave,
  FaUsers,
} from "react-icons/fa";

interface PersonLedgerViewProps {
  isOpen: boolean;
  onClose: () => void;
  person: LedgerPerson | null;
  onAddTransaction: (type: "PABO" | "DIBO") => void;
  onEditTransaction: (txn: LedgerTransaction) => void;
  onDeleteTransaction: (txn: LedgerTransaction) => void;
  onDeleteAllTransactions?: (person: LedgerPerson) => void;
}

export const PersonLedgerView: React.FC<PersonLedgerViewProps> = ({
  isOpen,
  onClose,
  person,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteAllTransactions,
}) => {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const personId = person?.id ? Number(person.id) : null;
  const { data, isLoading } = useLedgerTransactionsQuery(
    personId,
    { enabled: Boolean(isOpen && personId) }
  );

  const rawTransactions: LedgerTransaction[] = data?.data || [];

  // Compute chronological running balance, then display reverse chronological
  const transactionsWithRunningBalance = useMemo(() => {
    const sortedAsc = [...rawTransactions].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.createdDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.createdDate || 0).getTime();
      return timeA - timeB;
    });

    let running = 0;
    const enriched = sortedAsc.map((txn) => {
      const typeUpper = (txn.transactionType || "").toUpperCase();
      const isPabo = typeUpper.includes("PABO");
      const isDibo = typeUpper.includes("DIBO");
      const amt = Number(txn.amount) || 0;

      if (isPabo) {
        running += amt;
      } else if (isDibo) {
        running -= amt;
      }

      return {
        ...txn,
        runningBalance: running,
      };
    });

    return enriched.reverse();
  }, [rawTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let list = transactionsWithRunningBalance;

    if (typeFilter !== "ALL") {
      list = list.filter((t) => {
        const typeUpper = (t.transactionType || "").toUpperCase();
        if (typeFilter === "PABO") return typeUpper.includes("PABO");
        if (typeFilter === "DIBO") return typeUpper.includes("DIBO");
        if (typeFilter === "OPENING") return typeUpper.includes("OPENING");
        return true;
      });
    }

    return list;
  }, [transactionsWithRunningBalance, typeFilter]);

  // Overall totals for this person
  const { totalPabo, totalDibo, netBalance } = useMemo(() => {
    let pabo = 0;
    let dibo = 0;
    for (const t of rawTransactions) {
      const typeUpper = (t.transactionType || "").toUpperCase();
      const amt = Number(t.amount) || 0;
      if (typeUpper.includes("PABO")) pabo += amt;
      else if (typeUpper.includes("DIBO")) dibo += amt;
    }
    return {
      totalPabo: pabo,
      totalDibo: dibo,
      netBalance: pabo - dibo,
    };
  }, [rawTransactions]);

  const handleExportExcel = () => {
    if (!person || filteredTransactions.length === 0) return;

    const rows = filteredTransactions.map((t, idx) => {
      const typeUpper = (t.transactionType || "").toUpperCase();
      const isPabo = typeUpper.includes("PABO");
      const isDibo = typeUpper.includes("DIBO");
      const amt = Number(t.amount) || 0;

      return {
        "SL": idx + 1,
        "Date": t.createdAt || t.createdDate || "-",
        "Description": t.note || "-",
        "Reference": t.refNo || "-",
        "Tender": t.paymentType || "CASH",
        "Transaction Type": t.transactionType || "-",
        "Receivable (BDT)": isPabo ? amt : 0,
        "Payable (BDT)": isDibo ? amt : 0,
        "Commission (BDT)": Number(t.commission) || 0,
        "Running Balance (BDT)": t.runningBalance ?? 0,
      };
    });

    const totalRow = {
      "SL": "Total",
      "Date": "-",
      "Description": "-",
      "Reference": "-",
      "Tender": "-",
      "Transaction Type": "-",
      "Receivable (BDT)": totalPabo,
      "Payable (BDT)": totalDibo,
      "Commission (BDT)": "-",
      "Running Balance (BDT)": netBalance,
    };

    buildAndDownloadExcel(rows, totalRow, {
      fileName: `Ledger_${person.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Ledger",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!person) return null;

  return (
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ledger Statement — ${person.name}`}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-2.5">
        {/* Header Profile & Quick Action Strip */}
        <div className="p-3 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center font-bold text-base shrink-0 border border-[var(--primary-color-muted,#bae6fd)] shadow-xs">
              {(person.name || "P").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--ui-text)] truncate" title={person.name}>
                  {person.name}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                    (person.status || "").toLowerCase() === "active"
                      ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                      : "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                  }`}
                >
                  {person.status || "Active"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ui-text-muted)] mt-1">
                <span className="flex items-center gap-1.5">
                  <FaPhone className="text-[var(--ui-text-subtle)] text-[10px]" />
                  <span>{person.phone || "-"}</span>
                </span>
                {person.address && (
                  <span className="flex items-center gap-1.5 truncate max-w-[280px]" title={person.address}>
                    <FaMapMarkerAlt className="text-[var(--ui-text-subtle)] text-[10px] shrink-0" />
                    <span className="truncate">{person.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons (Pabo & Dibo) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => onAddTransaction("PABO")}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FaPlus className="text-[10px]" />
              <span>Record Pabo</span>
            </button>
            <button
              type="button"
              onClick={() => onAddTransaction("DIBO")}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FaMinus className="text-[10px]" />
              <span>Record Dibo</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Cards matching design system */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Total Receivable (Pabo) */}
          <div className="p-2.5 rounded-xl border bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] flex items-center justify-between shadow-xs">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-[var(--ui-success-dark,#047857)] uppercase tracking-wider truncate">
                Receivable (Pabo)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[var(--ui-success)] mt-0.5 truncate">
                ৳ {formatMoney(totalPabo)}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[var(--ui-success-border)] text-[var(--ui-success)] shrink-0">
              <FaMoneyBillWave size={14} />
            </div>
          </div>

          {/* 2. Total Payable (Dibo) */}
          <div className="p-2.5 rounded-xl border bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] flex items-center justify-between shadow-xs">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-[var(--ui-danger-dark,#b91c1c)] uppercase tracking-wider truncate">
                Payable (Dibo)
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[var(--ui-danger)] mt-0.5 truncate">
                ৳ {formatMoney(totalDibo)}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[var(--ui-danger-border)] text-[var(--ui-danger)] shrink-0">
              <FaMoneyBillWave size={14} />
            </div>
          </div>

          {/* 3. Net Balance */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between shadow-xs ${
              netBalance > 0
                ? "bg-[var(--ui-success-light)]/80 border-[var(--ui-success-border)]"
                : netBalance < 0
                ? "bg-[var(--ui-danger-light)]/80 border-[var(--ui-danger-border)]"
                : "bg-[var(--ui-surface-sunken)] border-[var(--ui-border)]"
            }`}
          >
            <div className="flex flex-col min-w-0">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                  netBalance > 0
                    ? "text-[var(--ui-success-dark,#047857)]"
                    : netBalance < 0
                    ? "text-[var(--ui-danger-dark,#b91c1c)]"
                    : "text-[var(--ui-text-muted)]"
                }`}
              >
                {netBalance > 0
                  ? "Net Receivable (Pabo)"
                  : netBalance < 0
                  ? "Net Payable (Dibo)"
                  : "Settled (Balanced)"}
              </span>
              <span
                className={`text-sm sm:text-base font-extrabold mt-0.5 truncate ${
                  netBalance > 0
                    ? "text-[var(--ui-success)]"
                    : netBalance < 0
                    ? "text-[var(--ui-danger)]"
                    : "text-[var(--ui-text)]"
                }`}
              >
                ৳ {formatMoney(Math.abs(netBalance))}
              </span>
            </div>
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                netBalance > 0
                  ? "bg-[var(--ui-success-border)] text-[var(--ui-success)]"
                  : netBalance < 0
                  ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]"
                  : "bg-[var(--ui-border)] text-[var(--ui-text-muted)]"
              }`}
            >
              <FaUsers size={14} />
            </div>
          </div>
        </div>

        {/* Unified Toolbar: Filter Tabs on Left, Search & Actions on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--ui-border)]">
          {/* Segmented Filter Tabs */}
          <div className="inline-flex items-center rounded-lg border border-[var(--ui-border)] p-0.5 bg-[var(--ui-surface-sunken)] h-8 self-start sm:self-auto overflow-x-auto scrollbar-none">
            {[
              { id: "ALL", label: `All (${rawTransactions.length})` },
              { id: "PABO", label: "Receivable" },
              { id: "DIBO", label: "Payable" },
              { id: "OPENING", label: "Opening" },
            ].map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`h-7 px-2.5 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    active
                      ? "bg-[var(--ui-surface)] text-[var(--primary-color)] shadow-xs font-bold border border-[var(--primary-color)]/20"
                      : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Controls: Excel + Print + Delete All */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ExcelExportButton
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0}
              title="Export Ledger to Excel"
            />

            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-2.5 text-xs font-medium text-[var(--ui-text)] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Print Statement"
            >
              <FaPrint className="text-[var(--ui-text-subtle)] text-xs" />
              <span>Print</span>
            </button>

            {onDeleteAllTransactions && rawTransactions.length > 0 && (
              <button
                type="button"
                onClick={() => onDeleteAllTransactions(person)}
                className="h-8 px-2.5 text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-surface)] border border-[var(--ui-danger-border)] hover:bg-[var(--ui-danger-light)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Delete all transactions of this person"
              >
                <FaTrash className="text-xs" />
                <span>Delete All</span>
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <TableContainer className="w-full">
          <TableScroll>
            {isLoading ? (
              <div className="p-4">
                <TableSkeleton columnCount={7} />
              </div>
            ) : (
              <Table className="table-fixed min-w-[750px]">
                <TableHead>
                  <TableTh width="16%">Date & Time</TableTh>
                  <TableTh width="24%">Description & Ref</TableTh>
                  <TableTh width="12%">Method</TableTh>
                  <TableTh width="14%" align="right">Receivable (+)</TableTh>
                  <TableTh width="14%" align="right">Payable (-)</TableTh>
                  <TableTh width="14%" align="right">Balance</TableTh>
                  <TableTh width="8%" align="right">Actions</TableTh>
                </TableHead>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <EmptyState
                          title="No transactions found"
                          description="No transactions recorded for this filter category."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => {
                      const typeUpper = (t.transactionType || "").toUpperCase();
                      const isPabo = typeUpper.includes("PABO");
                      const isDibo = typeUpper.includes("DIBO");
                      const isOpening = typeUpper.includes("OPENING");
                      const amt = Number(t.amount) || 0;

                      const dateStr = t.createdAt || t.createdDate || t.transactionDate || "";
                      let formattedDate = "-";
                      if (dateStr) {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                          formattedDate = d.toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                        }
                      }

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-[var(--ui-text-muted)] text-[11px]">
                            {formattedDate}
                          </td>

                          {/* Note & Ref (Single line) */}
                          <td className="py-2.5 px-3 truncate whitespace-nowrap">
                            <span
                              className="font-semibold text-xs text-[var(--ui-text)] inline-flex items-center gap-1 truncate"
                              title={`${t.note || (isOpening ? "Opening Balance" : "General Transaction")}${t.refNo ? ` (Ref: ${t.refNo})` : ""}${t.commission ? ` [Commission: ৳${t.commission}]` : ""}`}
                            >
                              <span>{t.note || (isOpening ? "Opening Balance" : "General Transaction")}</span>
                              {t.refNo && (
                                <span className="text-[10px] text-[var(--ui-text-subtle)] font-normal">
                                  ({t.refNo})
                                </span>
                              )}
                              {t.commission != null && Number(t.commission) > 0 && (
                                <span className="text-[10px] text-[var(--ui-info-dark,#0284c7)] bg-[var(--ui-info-light,#e0f2fe)] px-1.5 py-0.5 rounded font-medium border border-[var(--ui-info-border,#bae6fd)]">
                                  কমিশন: ৳{Number(t.commission).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Payment Type */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border-[var(--ui-border)]">
                              {t.paymentType || "CASH"}
                            </span>
                          </td>

                          {/* Pabo */}
                          <td className="py-2.5 px-3 text-right font-normal text-xs text-[var(--ui-success)] whitespace-nowrap">
                            {isPabo ? `৳${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                          </td>

                          {/* Dibo */}
                          <td className="py-2.5 px-3 text-right font-normal text-xs text-[var(--ui-danger)] whitespace-nowrap">
                            {isDibo ? `৳${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                          </td>

                          {/* Running Balance */}
                          <td className="py-2.5 px-3 text-right font-semibold text-xs whitespace-nowrap">
                            {t.runningBalance !== undefined && (
                              <span
                                className={
                                  t.runningBalance > 0
                                    ? "text-[var(--ui-success)]"
                                    : t.runningBalance < 0
                                    ? "text-[var(--ui-danger)]"
                                    : "text-[var(--ui-text-muted)]"
                                }
                              >
                                ৳{Math.abs(t.runningBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
                                <span className="text-[9px] font-normal">
                                  {t.runningBalance > 0 ? "(Pabo)" : t.runningBalance < 0 ? "(Dibo)" : ""}
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Actions matching TableActionButtons */}
                          <td className="py-2 px-3 text-right">
                            <TableActionButtons
                              onEdit={() => onEditTransaction(t)}
                              editTitle="Edit Transaction"
                              onDelete={() => onDeleteTransaction(t)}
                              deleteTitle="Delete Transaction"
                              className="justify-end"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </TableScroll>
        </TableContainer>
      </div>
    </DrawerModal>
  );
};

export default PersonLedgerView;
