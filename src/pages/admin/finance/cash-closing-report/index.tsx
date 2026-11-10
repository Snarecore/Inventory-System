import React, { useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCheckCircle,
  FaCoins,
  FaCashRegister,
  FaExclamationTriangle,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import RefreshButton from "@/components/table-components/RefreshButton";
import StatsCards, { type StatCardItem } from "@/components/common/StatsCards";
import { formatMoney } from "@/utils/formatters";
import { useReportDateRange } from "@/utils/trade-report-helpers";
import { useCashClosingReportQuery } from "@/hooks/useCashClosing";
import DenominationBreakdownModal from "@/pages/admin/finance/cash-closing/components/DenominationBreakdownModal";
import type { CashClosingData } from "@/types";
import CashClosingHistoryReportTable from "./components/CashClosingHistoryReportTable";
import CashClosingAuditTable from "./components/CashClosingAuditTable";
import {
  type CashClosingReportTab,
  computeCashClosingKpiTotals,
} from "./utils/cash-closing-report-helpers";

const CashClosingReportPage: React.FC = () => {
  const { dateRange, setDateRange, startDate, endDate, handleDateChange } =
    useReportDateRange();
  const [activeTab, setActiveTab] = useState<CashClosingReportTab>("history");

  // Denomination breakdown modal state (reuses existing cash-closing modal)
  const [selectedRecord, setSelectedRecord] = useState<CashClosingData | null>(
    null
  );
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);

  const {
    data: reportData,
    isLoading: isReportLoading,
    isFetching,
    refetch,
  } = useCashClosingReportQuery({
    startDate,
    endDate,
  });

  const records: CashClosingData[] = Array.isArray(reportData?.history)
    ? reportData.history
    : [];
  const isLoading = isReportLoading || isFetching;

  const kpis = computeCashClosingKpiTotals(records, reportData?.summary);

  const kpiCards: StatCardItem[] = [
    {
      title: "Total Deposit (Inflow)",
      value: `+৳ ${formatMoney(kpis.totalDeposits)}`,
      icon: FaArrowDown,
      color: "text-[var(--ui-success)]",
      bg: "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]",
      iconBg: "bg-[var(--ui-success-border)] text-[var(--ui-success)]",
    },
    {
      title: "Total Expense (Outflow)",
      value: `-৳ ${formatMoney(kpis.totalExpenses)}`,
      icon: FaArrowUp,
      color: "text-[var(--ui-danger)]",
      bg: "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)]",
      iconBg: "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]",
    },
    {
      title: "Reconciliation Health",
      value: `${kpis.matchedDays} / ${kpis.totalRecords} Matched`,
      icon: FaCheckCircle,
      color: "text-[var(--primary-color)]",
      bg: "bg-[var(--primary-color-light)]/60 border-[var(--primary-color-muted)]",
      iconBg: "bg-[var(--primary-color-muted)] text-[var(--primary-color)]",
    },
    {
      title: "Net Variance",
      value: `${kpis.totalDiff > 0 ? "+" : ""}৳ ${formatMoney(kpis.totalDiff)}`,
      icon: FaCoins,
      color:
        kpis.totalDiff === 0
          ? "text-[var(--ui-success)]"
          : kpis.totalDiff < 0
          ? "text-[var(--ui-danger)]"
          : "text-amber-600",
      bg:
        kpis.totalDiff === 0
          ? "bg-[var(--ui-success-light)]/60 border-[var(--ui-success-border)]"
          : kpis.totalDiff < 0
          ? "bg-[var(--ui-danger-light)]/60 border-[var(--ui-danger-border)]"
          : "bg-[var(--ui-warning-border)]/40 border-[var(--ui-warning-border)]",
      iconBg:
        kpis.totalDiff === 0
          ? "bg-[var(--ui-success-border)] text-[var(--ui-success)]"
          : kpis.totalDiff < 0
          ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger)]"
          : "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)]",
    },
  ];

  const handleViewDenominations = (record: CashClosingData) => {
    setSelectedRecord(record);
    setIsBreakdownOpen(true);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* ── Top Header & Global Period Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <PageHeader
          headerTitle="Cash Closing Report"
          headerDescription="Daily cash register reconciliation, variance audit, and denomination summary"
        />

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 self-start md:self-auto shrink-0">
          {/* Date Range Picker (Matches Sales & Purchase Reports) */}
          <div className="w-36 sm:w-40 shrink-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              selectedPreset={dateRange}
              onPresetChange={(r) => setDateRange(r)}
              onChange={handleDateChange}
              align="right"
              size="sm"
              inputClassName="h-8"
            />
          </div>

          {/* Refresh (Far Right) */}
          <RefreshButton onClick={() => refetch()} isLoading={isLoading} />
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <StatsCards cards={kpiCards} />

      {/* ── Unified Tab Switcher ── */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "history"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaCashRegister size={11} />
          <span>Closing History ({records.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "audit"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaExclamationTriangle size={11} />
          <span>Variance Audit ({kpis.mismatchedDays})</span>
        </button>
      </div>

      {/* ── Active Report Table ── */}
      <div className="w-full">
        {activeTab === "history" ? (
          <CashClosingHistoryReportTable
            records={records}
            isLoading={isLoading}
            startDate={startDate}
            endDate={endDate}
            onViewDenominations={handleViewDenominations}
          />
        ) : (
          <CashClosingAuditTable
            records={records}
            isLoading={isLoading}
            startDate={startDate}
            endDate={endDate}
            onViewDenominations={handleViewDenominations}
          />
        )}
      </div>

      {/* ── Denomination Notes Breakdown Modal (Reused) ── */}
      <DenominationBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => {
          setIsBreakdownOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
};

export default CashClosingReportPage;
