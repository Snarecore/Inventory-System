import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import ExcelExportButton from "@/components/table-components/ExcelExportButton";
import TableActionButtons from "@/components/table-components/TableActionButtons";
import DeleteModal from "@/components/modal/DeleteModal";
import { TransactionFormModal } from "./components/TransactionFormModal";
import {
  TableContainer,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
} from "@/components/common";
import type { LedgerPerson, LedgerTransaction } from "@/types";
import {
  useKhatabookDashboardQuery,
  useLedgerTransactionsQuery,
  useDeleteLedgerTransactionMutation,
  useDeleteAllTransactionsOfPersonMutation,
} from "@/hooks/useKhatabook";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel } from "@/utils/excel-export";
import { usePermission } from "@/hooks/usePermission";
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
import { FiArrowLeft } from "react-icons/fi";

export const PersonLedgerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { canCreate, canUpdate, canDelete } = usePermission();

  const personId = id ? Number(id) : null;

  // 1. Fetch Persons data
  const { persons, isLoading: isPersonsLoading, refetch: refetchDashboard } = useKhatabookDashboardQuery();

  // Pick person from location.state if passed, else search in persons list
  const statePerson = (location.state as { person?: LedgerPerson } | undefined)?.person;
  const person: LedgerPerson | null = useMemo(() => {
    if (statePerson && Number(statePerson.id) === personId) {
      return statePerson;
    }
    return persons.find((p) => Number(p.id) === personId) || null;
  }, [statePerson, persons, personId]);

  // 2. Fetch Transactions for this person
  const {
    data: txnsData,
    isLoading: isTxnsLoading,
    isFetching: isTxnsFetching,
    refetch: refetchTxns,
  } = useLedgerTransactionsQuery(personId, {
    enabled: Boolean(personId),
  });

  const rawTransactions: LedgerTransaction[] = txnsData?.data || [];

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modals state
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [txnDefaultType, setTxnDefaultType] = useState<"PABO" | "DIBO">("PABO");
  const [txnToEdit, setTxnToEdit] = useState<LedgerTransaction | null>(null);

  const [isDeleteTxnModalOpen, setIsDeleteTxnModalOpen] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<LedgerTransaction | null>(null);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  // Mutations
  const deleteTxnMutation = useDeleteLedgerTransactionMutation({
    onSuccess: () => {
      setIsDeleteTxnModalOpen(false);
      setTxnToDelete(null);
      refetchTxns();
      refetchDashboard();
    },
  });

  const deleteAllTxnsMutation = useDeleteAllTransactionsOfPersonMutation({
    onSuccess: () => {
      setIsDeleteAllModalOpen(false);
      refetchTxns();
      refetchDashboard();
    },
  });

  // Compute chronological running balance, then display reverse chronological
  const chronologicalTransactions = useMemo(() => {
    return [...rawTransactions].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.createdDate || a.transactionDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.createdDate || b.transactionDate || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  }, [rawTransactions]);

  const transactionsWithBalance = useMemo(() => {
    let runningBalance = 0;
    return chronologicalTransactions.map((t) => {
      const typeUpper = (t.transactionType || "").toUpperCase();
      const isPabo = typeUpper.includes("PABO");
      const isDibo = typeUpper.includes("DIBO");
      const amt = Number(t.amount) || 0;

      if (isPabo) {
        runningBalance += amt;
      } else if (isDibo) {
        runningBalance -= amt;
      }

      return {
        ...t,
        runningBalance,
      };
    });
  }, [chronologicalTransactions]);

  const filteredTransactions = useMemo(() => {
    return [...transactionsWithBalance]
      .reverse() // Reverse chronological: newest first
      .filter((t) => {
        const typeUpper = (t.transactionType || "").toUpperCase();
        if (typeFilter === "PABO") return typeUpper.includes("PABO");
        if (typeFilter === "DIBO") return typeUpper.includes("DIBO");
        if (typeFilter === "OPENING") return typeUpper.includes("OPENING");
        return true;
      });
  }, [transactionsWithBalance, typeFilter]);

  // Aggregate stats
  const { totalPabo, totalDibo, netBalance } = useMemo(() => {
    let pabo = 0;
    let dibo = 0;
    for (const t of rawTransactions) {
      const amt = Number(t.amount) || 0;
      const typeUpper = (t.transactionType || "").toUpperCase();
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

      return {
        "SL": idx + 1,
        "Date & Time": formattedDate,
        "Description": t.note || (isOpening ? "Opening Balance" : "General Transaction"),
        "Reference": t.refNo || "-",
        "Tender": (t.paymentMethod || t.tender || "CASH").toUpperCase(),
        "Transaction Type": t.transactionType || "-",
        "Receivable (BDT)": isPabo ? amt : 0,
        "Payable (BDT)": isDibo ? amt : 0,
        "Commission (BDT)": t.commission ? Number(t.commission) : 0,
        "Running Balance (BDT)": t.runningBalance,
      };
    });

    const totalRow = {
      "SL": "TOTAL",
      "Date & Time": "-",
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

  // Loading state when dashboard is loading and person not resolved yet
  if (isPersonsLoading && !person) {
    return (
      <div className="flex flex-col gap-3 px-2.5 py-2 sm:px-4 sm:py-3 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/khatabook")}
            className="p-1.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] transition-colors cursor-pointer"
          >
            <FiArrowLeft size={16} />
          </button>
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <TableSkeleton columnCount={7} rowCount={8} />
      </div>
    );
  }

  // Not found state
  if (!person) {
    return (
      <div className="flex flex-col gap-3 px-2.5 py-4 max-w-[1600px] mx-auto w-full">
        <div className="p-8 text-center bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl max-w-md mx-auto space-y-4 shadow-xs">
          <p className="text-base font-bold text-[var(--ui-text)]">Person Not Found</p>
          <p className="text-xs text-[var(--ui-text-muted)]">
            The person with ID #{id} was not found in Khatabook or may have been deleted.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/khatabook")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-color,#009fe3)] hover:opacity-90 text-white rounded-lg text-xs font-semibold cursor-pointer transition-opacity"
          >
            <FiArrowLeft />
            <span>Back to Khatabook</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Page Header with Back button */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/admin/khatabook")}
            className="h-8 px-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 shadow-xs"
            title="Back to Khatabook"
          >
            <FiArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Khatabook</span>
          </button>
          <PageHeader
            headerTitle={`${person.name} — Detailed Ledger`}
            headerDescription="Detailed debit & credit transaction history, statement balances, and receipts"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <RefreshButton
            onClick={() => {
              refetchTxns();
              refetchDashboard();
            }}
            isLoading={isTxnsLoading || isTxnsFetching}
          />
        </div>
      </div>

      {/* Header Profile & Quick Action Strip */}
      <div className="p-3 bg-[var(--ui-surface-sunken)]/60 border border-[var(--ui-border)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
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

        {/* Quick Action Buttons (Receive & Prodan) */}
        {canCreate("khatabook") && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setTxnToEdit(null);
                setTxnDefaultType("PABO");
                setIsTxnModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FaPlus className="text-[10px]" />
              <span>Receive</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTxnToEdit(null);
                setTxnDefaultType("DIBO");
                setIsTxnModalOpen(true);
              }}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FaMinus className="text-[10px]" />
              <span>Prodan</span>
            </button>
          </div>
        )}
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

      {/* Unified Toolbar: Filter Tabs on Left, Action Controls on Right */}
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
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <ExcelExportButton
            onClick={handleExportExcel}
            disabled={filteredTransactions.length === 0}
            title="Export Ledger to Excel"
          />

          <button
            type="button"
            onClick={handlePrint}
            className="h-8 px-2.5 text-xs font-medium text-[var(--ui-text)] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
            title="Print Statement"
          >
            <FaPrint className="text-[var(--ui-text-subtle)] text-xs" />
            <span>Print</span>
          </button>

          {canDelete("khatabook") && rawTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="h-8 px-2.5 text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-surface)] border border-[var(--ui-danger-border)] hover:bg-[var(--ui-danger-light)] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              title="Delete all transactions of this person"
            >
              <FaTrash className="text-xs" />
              <span>Delete All</span>
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <TableContainer className="w-full shadow-xs">
        <TableScroll>
          {isTxnsLoading ? (
            <div className="p-4">
              <TableSkeleton columnCount={7} rowCount={6} />
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

                        {/* Note & Ref */}
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
                          </span>
                        </td>

                        {/* Tender / Payment Method badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {(() => {
                            const method = (t.paymentMethod || t.tender || "CASH").toUpperCase();
                            const isCash = method === "CASH";
                            const isBank = method === "BANK";
                            const isMfs = method === "MFS";

                            return (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${
                                  isCash
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isBank
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : isMfs
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                              >
                                {method}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Receivable (Pabo) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-bold text-xs text-[var(--ui-success)]">
                          {isPabo ? `৳${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>

                        {/* Payable (Dibo) */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right font-bold text-xs text-[var(--ui-danger)]">
                          {isDibo ? `৳${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>

                        {/* Running Balance */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right text-xs">
                          <span
                            className={`font-extrabold ${
                              t.runningBalance > 0
                                ? "text-[var(--ui-success)]"
                                : t.runningBalance < 0
                                ? "text-[var(--ui-danger)]"
                                : "text-[var(--ui-text)]"
                            }`}
                          >
                            ৳{Math.abs(t.runningBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-[var(--ui-text-muted)] ml-1 font-normal">
                            {t.runningBalance > 0 ? "(Pabo)" : t.runningBalance < 0 ? "(Dibo)" : ""}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {isOpening ? (
                            <span className="text-[10px] text-[var(--ui-text-subtle)] italic">
                              Opening
                            </span>
                          ) : (
                            <TableActionButtons
                              onEdit={
                                canUpdate("khatabook")
                                  ? () => {
                                      setTxnToEdit(t);
                                      setIsTxnModalOpen(true);
                                    }
                                  : undefined
                              }
                              editTitle="Edit Transaction"
                              onDelete={
                                canDelete("khatabook")
                                  ? () => {
                                      setTxnToDelete(t);
                                      setIsDeleteTxnModalOpen(true);
                                    }
                                  : undefined
                              }
                              deleteTitle="Delete Transaction"
                              className="justify-end flex-nowrap shrink-0 gap-1"
                            />
                          )}
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

      {/* Transaction Form Modal (Create / Edit) */}
      <TransactionFormModal
        isOpen={isTxnModalOpen}
        onClose={() => {
          setIsTxnModalOpen(false);
          setTxnToEdit(null);
        }}
        defaultPersonId={person.id}
        defaultType={txnDefaultType}
        transactionToEdit={txnToEdit}
      />

      {/* Delete Single Transaction Modal */}
      <DeleteModal
        isOpen={isDeleteTxnModalOpen}
        title="Delete Transaction Confirmation"
        message={`Are you sure you want to delete this transaction (${txnToDelete?.transactionType} - ৳${txnToDelete?.amount})? Deleting it will restore the corresponding balance.`}
        onClose={() => {
          setIsDeleteTxnModalOpen(false);
          setTxnToDelete(null);
        }}
        onDelete={() => {
          if (txnToDelete?.id) {
            deleteTxnMutation.mutate(txnToDelete.id);
          }
        }}
        isDeleting={deleteTxnMutation.isPending}
      />

      {/* Delete All Transactions Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteAllModalOpen}
        title="Delete All Transactions Confirmation"
        message={`Are you sure you want to delete ALL (${rawTransactions.length}) transactions for "${person.name}"? This action will reset the person's transactions balance.`}
        onClose={() => {
          setIsDeleteAllModalOpen(false);
        }}
        onDelete={() => {
          if (person.id) {
            deleteAllTxnsMutation.mutate(person.id);
          }
        }}
        isDeleting={deleteAllTxnsMutation.isPending}
      />
    </div>
  );
};

export default PersonLedgerPage;
