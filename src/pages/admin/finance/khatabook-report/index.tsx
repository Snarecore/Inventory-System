import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaReceipt,
  FaUserFriends,
  FaArrowDown,
  FaArrowUp,
  FaBalanceScale,
  FaPercent,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import StatsCards, { type StatCardItem } from "@/components/common/StatsCards";
import { formatMoney } from "@/utils/formatters";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import { useKhatabookDashboardQuery } from "@/hooks/useKhatabook";
import KhatabookTransactionReportTable from "./components/KhatabookTransactionReportTable";
import KhatabookPersonSummaryReportTable from "./components/KhatabookPersonSummaryReportTable";
import {
  type KhatabookReportTab,
  normalizeKhatabookTransactions,
  computeKhatabookReportKpis,
} from "./utils/khatabook-report-helpers";

export const KhatabookReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { startDate, endDate, datePickerProps } = useReportDateRange();
  const [activeTab, setActiveTab] = useState<KhatabookReportTab>("transactions");

  const {
    persons = [],
    allTransactions = [],
    isLoading,
    isFetching,
    refetch,
  } = useKhatabookDashboardQuery("ALL");

  // Normalize transactions filtered by date range
  const normalizedTransactions = useMemo(() => {
    return normalizeKhatabookTransactions(
      allTransactions,
      persons,
      startDate,
      endDate
    );
  }, [allTransactions, persons, startDate, endDate]);

  // Compute live KPIs
  const kpis = useMemo(() => {
    return computeKhatabookReportKpis(normalizedTransactions, persons);
  }, [normalizedTransactions, persons]);

  const kpiCards: StatCardItem[] = [
    {
      title: "Total Receivable (Pabo)",
      value: `৳ ${formatMoney(kpis.totalPabo)}`,
      icon: FaArrowDown,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Total Payable (Dibo)",
      value: `-৳ ${formatMoney(kpis.totalDibo)}`,
      icon: FaArrowUp,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
    {
      title: "Net Balance",
      value: `${kpis.netBalance < 0 ? "- " : ""}৳ ${formatMoney(Math.abs(kpis.netBalance))}`,
      icon: FaBalanceScale,
      color:
        kpis.netBalance > 0
          ? "text-[var(--ui-success)]"
          : kpis.netBalance < 0
          ? "text-[var(--ui-danger)]"
          : "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Total Commission",
      value: `৳ ${formatMoney(kpis.totalCommission)}`,
      icon: FaPercent,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40",
      iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300",
    },
  ];

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Page Header & Top Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle={t("Dena Pawna Report")}
          headerDescription={t(
            "Transaction ledger history, date-wise debit/credit breakdown, and person account summaries"
          )}
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          <RefreshButton
            onClick={() => refetch()}
            isLoading={isLoading || isFetching}
          />
        </div>
      </div>

      {/* KPI Stats Cards */}
      <StatsCards cards={kpiCards} />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "transactions"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaReceipt size={11} />
          <span>
            {t("Transaction Ledger")} ({normalizedTransactions.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("persons")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "persons"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaUserFriends size={11} />
          <span>
            {t("Person-Wise Summary")} ({persons.length})
          </span>
        </button>
      </div>

      {/* Table Content */}
      <div className="w-full">
        {activeTab === "transactions" && (
          <KhatabookTransactionReportTable
            transactions={normalizedTransactions}
            persons={persons}
            isLoading={isLoading || isFetching}
            {...datePickerProps}
          />
        )}

        {activeTab === "persons" && (
          <KhatabookPersonSummaryReportTable
            persons={persons}
            isLoading={isLoading || isFetching}
          />
        )}
      </div>
    </div>
  );
};

export default KhatabookReportPage;
