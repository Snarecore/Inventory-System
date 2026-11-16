import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RefreshButton from "@/components/table-components/RefreshButton";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import ExcelExportButton from "@/components/table-components/ExcelExportButton";
import TableActionButtons from "@/components/table-components/TableActionButtons";
import DeleteModal from "@/components/modal/DeleteModal";
import { TransactionFormModal } from "./components/TransactionFormModal";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TablePaginationFooter,
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
  const { t } = useTranslation();
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

  // Filter & Pagination state
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Tab counts for status tabs
  const tabCounts = useMemo(() => {
    let pabo = 0;
    let dibo = 0;
    let opening = 0;
    for (const txn of rawTransactions) {
      const typeUpper = (txn.transactionType || "").toUpperCase();
      if (typeUpper.includes("OPENING")) opening++;
      else if (typeUpper.includes("PABO")) pabo++;
      else if (typeUpper.includes("DIBO")) dibo++;
    }
    return {
      all: rawTransactions.length,
      pabo,
      dibo,
      opening,
    };
  }, [rawTransactions]);

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
    return chronologicalTransactions.map((txn) => {
      const typeUpper = (txn.transactionType || "").toUpperCase();
      const isPabo = typeUpper.includes("PABO");
      const isDibo = typeUpper.includes("DIBO");
      const amt = Number(txn.amount) || 0;

      if (isPabo) {
        runningBalance += amt;
      } else if (isDibo) {
        runningBalance -= amt;
      }

      return {
        ...txn,
        runningBalance,
      };
    });
  }, [chronologicalTransactions]);

  const filteredTransactions = useMemo(() => {
    return [...transactionsWithBalance]
      .reverse() // Reverse chronological: newest first
      .filter((txn) => {
        const typeUpper = (txn.transactionType || "").toUpperCase();
        if (typeFilter === "PABO") return typeUpper.includes("PABO");
        if (typeFilter === "DIBO") return typeUpper.includes("DIBO");
        if (typeFilter === "OPENING") return typeUpper.includes("OPENING");
        return true;
      });
  }, [transactionsWithBalance, typeFilter]);

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  // Aggregate stats
  const { totalPabo, totalDibo, totalCommission, netBalance } = useMemo(() => {
    let pabo = 0;
    let dibo = 0;
    let comm = 0;
    for (const txn of rawTransactions) {
      const amt = Number(txn.amount) || 0;
      const typeUpper = (txn.transactionType || "").toUpperCase();
      if (typeUpper.includes("PABO")) pabo += amt;
      else if (typeUpper.includes("DIBO")) dibo += amt;
      if (txn.commission) comm += Number(txn.commission);
    }
    return {
      totalPabo: pabo,
      totalDibo: dibo,
      totalCommission: comm,
      netBalance: pabo - dibo,
    };
  }, [rawTransactions]);

  const handleExportExcel = () => {
    if (!person || filteredTransactions.length === 0) return;

    const rows = filteredTransactions.map((txn, idx) => {
      const typeUpper = (txn.transactionType || "").toUpperCase();
      const isPabo = typeUpper.includes("PABO");
      const isDibo = typeUpper.includes("DIBO");
      const isOpening = typeUpper.includes("OPENING");
      const amt = Number(txn.amount) || 0;

      const dateStr = txn.createdAt || txn.createdDate || txn.transactionDate || "";
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
        "Description": txn.note || (isOpening ? "Opening Balance" : "General Transaction"),
        "Reference": txn.refNo || "-",
        "Tender": (txn.paymentMethod || txn.tender || "CASH").toUpperCase(),
        "Transaction Type": txn.transactionType || "-",
        "Receivable (BDT)": isPabo ? amt : 0,
        "Payable (BDT)": isDibo ? amt : 0,
        "Commission (BDT)": txn.commission ? Number(txn.commission) : 0,
        "Running Balance (BDT)": txn.runningBalance,
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
      "Commission (BDT)": totalCommission > 0 ? totalCommission : "-",
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
          <p className="text-base font-bold text-[var(--ui-text)]">{t("Person Not Found")}</p>
          <p className="text-xs text-[var(--ui-text-muted)]">
            {t("The person with ID #{id} was not found in Khatabook or may have been deleted.")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/khatabook")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-color,#009fe3)] hover:opacity-90 text-white rounded-lg text-xs font-semibold cursor-pointer transition-opacity"
          >
            <FiArrowLeft />
            <span>{t("Back to Khatabook")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Top Bar: Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-0.5">
        {/* Left: Breadcrumbs / Back button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/khatabook")}
            className="h-8 px-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs group"
            title={t("Back to Khatabook")}
          >
            <FiArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>{t("Back to Khatabook")}</span>
          </button>
          <span className="text-[var(--ui-text-subtle)] text-xs">/</span>
          <span className="text-xs font-medium text-[var(--ui-text-muted)]">{t("Ledger Statement")}</span>
        </div>

        {/* Right: Actions (Refresh, Receive, Prodan) */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <RefreshButton
            onClick={() => {
              refetchTxns();
              refetchDashboard();
            }}
            isLoading={isTxnsLoading || isTxnsFetching}
          />

          {canCreate("khatabook") && (
            <>
              <button
                type="button"
                onClick={() => {
                  setTxnToEdit(null);
                  setTxnDefaultType("PABO");
                  setIsTxnModalOpen(true);
                }}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <FaPlus className="text-[10px]" />
                <span>{t("Receive")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxnToEdit(null);
                  setTxnDefaultType("DIBO");
                  setIsTxnModalOpen(true);
                }}
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <FaMinus className="text-[10px]" />
                <span>{t("Prodan")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Unified Hero Card: Person Identity (Left) & Financial Balance KPI (Right) */}
      <div className="bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl p-2.5 sm:p-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Person Name, Phone & Address in ONE single line */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-[var(--ui-text)] truncate shrink-0" title={person.name}>
            {person.name}
          </h1>

          {person.phone && (
            <a
              href={`tel:${person.phone}`}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] transition-colors shrink-0"
              title="Click to call"
            >
              <FaPhone className="text-[10px] text-[var(--ui-text-subtle)]" />
              <span className="font-medium">{person.phone}</span>
            </a>
          )}

          {person.address && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)] truncate max-w-[320px]"
              title={person.address}
            >
              <FaMapMarkerAlt className="text-[10px] text-[var(--ui-text-subtle)] shrink-0" />
              <span className="truncate">{person.address}</span>
            </span>
          )}
        </div>

        {/* Right: Balanced KPI Cards (with Commission card if commission exists) */}
        <div className="shrink-0 w-full lg:w-auto lg:border-l lg:border-[var(--ui-border)] lg:pl-4">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              totalCommission > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"
            } gap-2 sm:gap-2.5`}
          >
            {/* Card 1: Receivable (Pabo) */}
            <div className="p-2 sm:px-3 sm:py-2 rounded-lg border bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)] flex items-center justify-between gap-3 shadow-2xs sm:min-w-[145px]">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-[var(--ui-success-dark)] truncate">
                  {t("Receivable (Pabo)")}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[var(--ui-success)] mt-0.5 truncate">
                  ৳ {formatMoney(totalPabo)}
                </span>
              </div>
              <div className="p-1.5 rounded-md bg-[var(--ui-success-border)] text-[var(--ui-success)] shrink-0">
                <FaMoneyBillWave size={13} />
              </div>
            </div>

            {/* Card 2: Payable (Dibo) */}
            <div className="p-2 sm:px-3 sm:py-2 rounded-lg border bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)] flex items-center justify-between gap-3 shadow-2xs sm:min-w-[145px]">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-[var(--ui-danger-dark)] truncate">
                  {t("Payable (Dibo)")}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[var(--ui-danger)] mt-0.5 truncate">
                  ৳ {formatMoney(totalDibo)}
                </span>
              </div>
              <div className="p-1.5 rounded-md bg-[var(--ui-danger-border)] text-[var(--ui-danger)] shrink-0">
                <FaMoneyBillWave size={13} />
              </div>
            </div>

            {/* Card 3: Net Balance */}
            <div
              className={`p-2 sm:px-3 sm:py-2 rounded-lg border flex items-center justify-between gap-3 shadow-2xs sm:min-w-[145px] ${
                netBalance > 0
                  ? "bg-[var(--ui-success-light)]/80 border-[var(--ui-success-border)]"
                  : netBalance < 0
                  ? "bg-[var(--ui-danger-light)]/80 border-[var(--ui-danger-border)]"
                  : "bg-[var(--ui-surface-sunken)] border-[var(--ui-border)]"
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-[11px] font-semibold truncate ${
                    netBalance > 0
                      ? "text-[var(--ui-success-dark)]"
                      : netBalance < 0
                      ? "text-[var(--ui-danger-dark)]"
                      : "text-[var(--ui-text-muted)]"
                  }`}
                >
                  {netBalance > 0
                    ? t("Net Receivable")
                    : netBalance < 0
                    ? t("Net Payable")
                    : t("Settled (Balance)")}
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
                className={`p-1.5 rounded-md shrink-0 ${
                  netBalance > 0
                    ? "bg-[var(--ui-success-border)] text-[var(--ui-success)]"
                    : netBalance < 0
                    ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]"
                    : "bg-[var(--ui-border)] text-[var(--ui-text-muted)]"
                }`}
              >
                <FaUsers size={13} />
              </div>
            </div>

            {/* Card 4: Total Commission (when commission exists) */}
            {totalCommission > 0 && (
              <div className="p-2 sm:px-3 sm:py-2 rounded-lg border bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between gap-3 shadow-2xs sm:min-w-[145px]">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 truncate">
                    {t("Commission")}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                    ৳ {formatMoney(totalCommission)}
                  </span>
                </div>
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 shrink-0">
                  <FaMoneyBillWave size={12} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table Card Container */}
      <TableContainer className="w-full shadow-xs">
        {/* Table Toolbar matching Cash-Boi design system */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
            {/* Left: Filter Tabs with count badges */}
            <div className="inline-flex items-center rounded-lg border border-[var(--ui-border)] p-0.5 bg-[var(--ui-surface-sunken)] h-8 self-start sm:self-auto overflow-x-auto scrollbar-none">
              {[
                { id: "ALL", label: t("All"), count: tabCounts.all },
                { id: "PABO", label: t("Receivable"), count: tabCounts.pabo },
                { id: "DIBO", label: t("Payable"), count: tabCounts.dibo },
                { id: "OPENING", label: t("Opening"), count: tabCounts.opening },
              ].map((tab) => {
                const active = typeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setTypeFilter(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`h-7 px-2.5 sm:px-3 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      active
                        ? "bg-[var(--ui-surface)] text-[var(--primary-color)] shadow-xs font-bold"
                        : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        active
                          ? "bg-[var(--primary-color-light)] text-[var(--primary-color)]"
                          : "bg-[var(--ui-border)] text-[var(--ui-text-muted)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Excel Export + Print + Delete All */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <ExcelExportButton
                onClick={handleExportExcel}
                disabled={filteredTransactions.length === 0}
                title={t("Export Ledger to Excel")}
              />

              <button
                type="button"
                onClick={handlePrint}
                disabled={filteredTransactions.length === 0}
                className="h-8 px-2.5 sm:px-3 text-xs font-semibold text-[var(--ui-text)] bg-[var(--ui-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-surface-sunken)] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                title={t("Print Statement")}
              >
                <FaPrint className="text-[var(--ui-text-subtle)] text-xs" />
                <span>{t("Print")}</span>
              </button>

              {canDelete("khatabook") && rawTransactions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(true)}
                  className="h-8 px-2.5 sm:px-3 text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-surface)] border border-[var(--ui-danger-border)] hover:bg-[var(--ui-danger-light)] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95"
                  title={t("Delete all transactions of this person")}
                >
                  <FaTrash className="text-xs" />
                  <span>{t("Delete All")}</span>
                </button>
              )}
            </div>
          </div>
        </TableToolbar>

        {/* Table Content */}
        <TableScroll>
          {isTxnsLoading ? (
            <div className="p-4">
              <TableSkeleton columnCount={8} rowCount={6} />
            </div>
          ) : (
            <Table className="table-fixed min-w-[800px]">
              <TableHead>
                <TableTh width="4%" align="center">SL</TableTh>
                <TableTh width="15%">{t("Date & Time")}</TableTh>
                <TableTh width="20%">{t("Description & Ref")}</TableTh>
                <TableTh width="10%">{t("Method")}</TableTh>
                <TableTh width="12%" align="right">{t("Receivable (+)")}</TableTh>
                <TableTh width="12%" align="right">{t("Payable (-)")}</TableTh>
                <TableTh width="11%" align="right">{t("Commission")}</TableTh>
                <TableTh width="11%" align="right">{t("Balance")}</TableTh>
                <TableTh width="5%" align="right">{t("Actions")}</TableTh>
              </TableHead>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <EmptyState
                        title={
                          typeFilter !== "ALL"
                            ? t("No transactions matching filter")
                            : t("No transactions recorded yet")
                        }
                        description={
                          typeFilter !== "ALL"
                            ? t("Try selecting 'All' tab to see all transactions for this account.")
                            : t("Click 'Receive' or 'Prodan' above to record the first transaction.")
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((txn, idx) => {
                    const typeUpper = (txn.transactionType || "").toUpperCase();
                    const isPabo = typeUpper.includes("PABO");
                    const isDibo = typeUpper.includes("DIBO");
                    const isOpening = typeUpper.includes("OPENING");
                    const amt = Number(txn.amount) || 0;

                    const dateStr = txn.createdAt || txn.createdDate || txn.transactionDate || "";
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
                        key={txn.id}
                        className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                      >
                        {/* SL */}
                        <td className="py-1 px-2.5 text-center text-[var(--ui-text-muted)] text-[11px] tabular-nums">
                          {startIndex + idx + 1}
                        </td>

                        {/* Date */}
                        <td className="py-1 px-2.5 whitespace-nowrap text-[var(--ui-text-muted)] text-[11px]">
                          {formattedDate}
                        </td>

                        {/* Note & Ref */}
                        <td className="py-1 px-2.5 truncate whitespace-nowrap">
                          <span
                            className="font-semibold text-xs text-[var(--ui-text)] inline-flex items-center gap-1 truncate"
                            title={`${txn.note || (isOpening ? "Opening Balance" : "General Transaction")}${txn.refNo ? ` (Ref: ${txn.refNo})` : ""}`}
                          >
                            <span>{txn.note || (isOpening ? t("Opening Balance") : t("General Transaction"))}</span>
                            {txn.refNo && (
                              <span className="text-[10px] text-[var(--ui-text-subtle)] font-normal">
                                ({txn.refNo})
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Tender / Payment Method badge */}
                        <td className="py-1 px-2.5 whitespace-nowrap">
                          {(() => {
                            const method = (txn.paymentMethod || txn.tender || "CASH").toUpperCase();
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
                        <td className="py-1 px-2.5 whitespace-nowrap text-right font-bold text-xs text-[var(--ui-success)]">
                          {isPabo ? `৳${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>

                        {/* Payable (Dibo) */}
                        <td className="py-1 px-2.5 whitespace-nowrap text-right font-bold text-xs text-[var(--ui-danger)]">
                          {isDibo ? `৳${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                        </td>

                        {/* Commission */}
                        <td className="py-1 px-2.5 whitespace-nowrap text-right text-xs">
                          {txn.commission != null && Number(txn.commission) > 0 ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              ৳{Number(txn.commission).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-[var(--ui-text-muted)]">-</span>
                          )}
                        </td>

                        {/* Running Balance */}
                        <td className="py-1 px-2.5 whitespace-nowrap text-right text-xs">
                          <span
                            className={
                              txn.runningBalance > 0
                                ? "text-[var(--ui-success)]"
                                : txn.runningBalance < 0
                                ? "text-[var(--ui-danger)]"
                                : "text-[var(--ui-text)]"
                            }
                          >
                            ৳{Math.abs(txn.runningBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-1 px-2.5 text-right whitespace-nowrap">
                          {isOpening ? (
                            <span className="text-[10px] text-[var(--ui-text-subtle)] italic">
                              {t("Opening")}
                            </span>
                          ) : (
                            <TableActionButtons
                              onEdit={
                                canUpdate("khatabook")
                                  ? () => {
                                      setTxnToEdit(txn);
                                      setIsTxnModalOpen(true);
                                    }
                                  : undefined
                              }
                              editTitle={t("Edit Transaction")}
                              onDelete={
                                canDelete("khatabook")
                                  ? () => {
                                      setTxnToDelete(txn);
                                      setIsDeleteTxnModalOpen(true);
                                    }
                                  : undefined
                              }
                              deleteTitle={t("Delete Transaction")}
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

        {/* Pagination Footer */}
        {!isTxnsLoading && totalItems > 0 && (
          <TablePaginationFooter
            totalCount={totalItems}
            pageCount={totalPages}
            currentPageNumber={safeCurrentPage}
            dataLimit={pageSize}
            setDataLimit={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            setCurrentPageNumber={setCurrentPage}
            handlePagination={(d) => setCurrentPage(d.selected + 1)}
            entityLabel="transactions"
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
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
