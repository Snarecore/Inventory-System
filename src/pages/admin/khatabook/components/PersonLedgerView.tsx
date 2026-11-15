import React, { useState, useMemo } from "react";
import DrawerModal from "@/components/modal/DrawerModal";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import Button from "@/components/button/Button";
import ExcelExportButton from "@/components/table-components/ExcelExportButton";
import TableActionButtons from "@/components/table-components/TableActionButtons";
import Search from "@/components/table-components/Search";
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
  const [searchTerm, setSearchTerm] = useState("");
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

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          (t.note || "").toLowerCase().includes(q) ||
          (t.refNo || "").toLowerCase().includes(q) ||
          (t.paymentType || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [transactionsWithRunningBalance, typeFilter, searchTerm]);

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
        {/* Person Info & Net Balance Card matching design system */}
        <div className="p-3 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--ui-text)]">{person.name}</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--ui-text-muted)] mt-0.5">
              <span className="flex items-center gap-1.5">
                <FaPhone className="text-[var(--ui-text-subtle)] text-[10px]" /> {person.phone}
              </span>
              {person.address && (
                <span className="flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-[var(--ui-text-subtle)] text-[10px]" /> {person.address}
                </span>
              )}
            </div>
          </div>

          {/* Balance Banner */}
          <div
            className={`px-4 py-2 rounded-xl border flex flex-col items-center md:items-end justify-center ${
              netBalance > 0
                ? "bg-[var(--ui-success-light)]/70 border-[var(--ui-success-border)] text-[var(--ui-success-dark)]"
                : netBalance < 0
                ? "bg-[var(--ui-danger-light)]/70 border-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]"
                : "bg-[var(--ui-surface)] border-[var(--ui-border)] text-[var(--ui-text)]"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {netBalance > 0
                ? "You'll Receive (Receivable)"
                : netBalance < 0
                ? "You'll Pay (Payable)"
                : "Settled (Balanced)"}
            </span>
            <span className="text-xl font-bold">
              ৳ {formatMoney(Math.abs(netBalance))}
            </span>
            <div className="flex items-center gap-3 text-[11px] mt-0.5 text-[var(--ui-text-muted)]">
              <span>
                Receivable: <strong className="text-[var(--ui-success)]">৳{formatMoney(totalPabo)}</strong>
              </span>
              <span>•</span>
              <span>
                Payable: <strong className="text-[var(--ui-danger)]">৳{formatMoney(totalDibo)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              label="Record Receivable (Pabo)"
              onClick={() => onAddTransaction("PABO")}
              color="#059669"
              hoverColor="#047857"
              icon={<FaPlus className="text-white text-xs" />}
              size="sm"
            />
            <Button
              label="Record Payable (Dibo)"
              onClick={() => onAddTransaction("DIBO")}
              color="#dc2626"
              hoverColor="#b91c1c"
              icon={<FaMinus className="text-white text-xs" />}
              size="sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <ExcelExportButton
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0}
              title="Export Ledger to Excel"
            />
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-2.5 text-xs font-medium text-[var(--ui-text)] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print Statement"
            >
              <FaPrint className="text-[var(--ui-text-subtle)] text-xs" />
              <span>Print</span>
            </button>
            {onDeleteAllTransactions && rawTransactions.length > 0 && (
              <button
                type="button"
                onClick={() => onDeleteAllTransactions(person)}
                className="h-8 px-2.5 text-xs font-medium text-[var(--ui-danger)] bg-[var(--ui-surface)] border border-[var(--ui-danger-border)] hover:bg-[var(--ui-danger-light)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete all transactions of this person"
              >
                <FaTrash className="text-xs" />
                <span>Delete All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          {/* Segmented Tabs */}
          <div className="inline-flex items-center rounded-lg border border-[var(--ui-border)] p-0.5 bg-[var(--ui-surface-sunken)] h-8">
            {[
              { id: "ALL", label: "All Transactions" },
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
                  className={`h-7 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
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

          {/* Search Box */}
          <div className="w-full sm:w-60">
            <Search
              searchQuery={searchTerm}
              onSearchChange={(v) => setSearchTerm(v)}
              placeholder="Search note, ref..."
            />
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
                          description={
                            searchTerm
                              ? "No transactions match your search criteria."
                              : "No transactions recorded for this person yet."
                          }
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
