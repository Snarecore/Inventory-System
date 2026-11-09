import React, { useState, useEffect, useMemo } from "react";
import moment from "moment";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import DatePicker from "@/components/common/DatePicker";
import { FaCashRegister, FaHistory, FaCalendarCheck } from "react-icons/fa";
import {
  useCashClosingQuery,
  useCashClosingReportQuery,
  useInsertCashClosingMutation,
} from "@/hooks/useCashClosing";
import { BANGLADESH_DENOMINATIONS, type DenominationItem, type CashClosingData } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { usePermission } from "@/hooks/usePermission";
import CashClosingKpiCards from "./components/CashClosingKpiCards";
import CashDenominationTable from "./components/CashDenominationTable";
import CashClosingSummaryCard from "./components/CashClosingSummaryCard";
import CashClosingReportTable from "./components/CashClosingReportTable";
import DenominationBreakdownModal from "./components/DenominationBreakdownModal";

type TabMode = "DAILY" | "HISTORY";

export const CashClosingPage: React.FC = () => {
  const { canCreate, canUpdate } = usePermission();
  const canClose = canCreate("cash_closing") || canUpdate("cash_closing");
  const [activeTab, setActiveTab] = useState<TabMode>("DAILY");
  const [selectedDate, setSelectedDate] = useState<string>(moment().format("YYYY-MM-DD"));

  // Month & Year state for Reconciliation Report
  const [selectedMonth, setSelectedMonth] = useState<string>(moment().format("MM"));
  const [selectedYear, setSelectedYear] = useState<string>(moment().format("YYYY"));

  // Breakdown modal state
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<CashClosingData | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState<boolean>(false);

  // Form State
  const [differenceReason, setDifferenceReason] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Initialize empty denomination items
  const initialDenominations: DenominationItem[] = useMemo(() => {
    return BANGLADESH_DENOMINATIONS.map((d) => ({
      denomination: d,
      quantity: 0,
      amount: 0,
    }));
  }, []);

  const [denominations, setDenominations] = useState<DenominationItem[]>(initialDenominations);

  // TanStack Queries
  const {
    data: closingData,
    isLoading: isClosingLoading,
    refetch: refetchClosing,
  } = useCashClosingQuery(selectedDate);

  const {
    data: reportData,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = useCashClosingReportQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  const insertClosingMutation = useInsertCashClosingMutation({
    onSuccess: () => {
      refetchClosing();
      refetchReport();
    },
  });

  // Populate or reset state when closingData or selectedDate changes
  useEffect(() => {
    if (closingData) {
      if (Array.isArray(closingData.denominations) && closingData.denominations.length > 0) {
        // Map existing notes into standard order
        const map = new Map<number, number>();
        closingData.denominations.forEach((d) => {
          map.set(Number(d.denomination), Number(d.quantity || 0));
        });

        const merged: DenominationItem[] = BANGLADESH_DENOMINATIONS.map((denom) => {
          const qty = map.get(denom) || 0;
          return {
            denomination: denom,
            quantity: qty,
            amount: denom * qty,
          };
        });

        setDenominations(merged);
      } else {
        setDenominations(initialDenominations);
      }

      setDifferenceReason(closingData.differenceReason || "");
      setRemarks(closingData.remarks || "");
    } else {
      setDenominations(initialDenominations);
      setDifferenceReason("");
      setRemarks("");
    }
  }, [closingData, initialDenominations]);

  // Handle note quantity change
  const handleChangeQuantity = (denom: number, qty: number) => {
    setDenominations((prev) =>
      prev.map((item) =>
        item.denomination === denom
          ? {
              ...item,
              quantity: qty,
              amount: denom * qty,
            }
          : item
      )
    );
  };

  // Reset all note quantities
  const handleResetAll = () => {
    setDenominations(initialDenominations);
  };

  // Calculations
  const openingCash = Number(closingData?.openingCash ?? 0);
  const todayDeposit = Number(closingData?.todayDeposit ?? 0);
  const todayExpense = Number(closingData?.todayExpense ?? 0);
  const expectedCash = Number(
    closingData?.expectedCash ?? openingCash + todayDeposit - todayExpense
  );

  const countedCash = useMemo(() => {
    return denominations.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [denominations]);

  const differenceAmount = useMemo(() => {
    return countedCash - expectedCash;
  }, [countedCash, expectedCash]);

  const isClosed = closingData?.status?.toLowerCase() === "closed";
  const isReadOnly = isClosed || !canClose;

  // Handle Submit Closing
  const handleSubmitClosing = () => {
    if (isClosed) {
      showErrorToast("This date's cash register is already closed and cannot be modified.");
      return;
    }
    if (!canClose) {
      showErrorToast("You do not have permission to close the cash register.");
      return;
    }

    insertClosingMutation.mutate({
      closingDate: selectedDate,
      openingCash,
      todayDeposit,
      todayExpense,
      expectedCash,
      countedCash,
      differenceAmount,
      differenceReason: differenceAmount !== 0 ? differenceReason : "",
      remarks: remarks.trim(),
      status: "Closed",
      denominations,
    });
  };

  // View historical denomination breakdown
  const handleViewDenominations = (record: CashClosingData) => {
    setSelectedRecordForModal(record);
    setIsBreakdownModalOpen(true);
  };

  const handleRefresh = () => {
    if (activeTab === "DAILY") {
      refetchClosing();
    } else {
      refetchReport();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Daily Cash Closing"
          headerDescription="Daily cash register reconciliation, denomination counting and variance settlement"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker (visible in DAILY tab) */}
          {activeTab === "DAILY" && (
            <div className="w-36">
              <DatePicker
                date={selectedDate}
                setDate={(dateStr) => setSelectedDate(dateStr)}
              />
            </div>
          )}

          <RefreshButton
            onClick={handleRefresh}
            isLoading={isClosingLoading || isReportLoading}
          />

          {/* Tab Switcher Pills */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/60 h-8">
            <button
              type="button"
              onClick={() => setActiveTab("DAILY")}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "DAILY"
                  ? "bg-[var(--ui-surface)] text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
              }`}
            >
              <FaCashRegister size={12} />
              <span>Daily Closing</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("HISTORY")}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "HISTORY"
                  ? "bg-[var(--ui-surface)] text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
              }`}
            >
              <FaHistory size={12} />
              <span>Closing History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "DAILY" ? (
        <div className="flex flex-col gap-2.5">
          {/* KPI Cards Row */}
          <CashClosingKpiCards
            openingCash={openingCash}
            todayDeposit={todayDeposit}
            todayExpense={todayExpense}
            expectedCash={expectedCash}
            countedCash={countedCash}
            differenceAmount={differenceAmount}
            isClosed={isClosed}
          />

          {/* Split Layout: Denomination Table (Left) + Closing Settlement Card (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
            {/* Left 7 Columns: Physical Cash Denomination Counter */}
            <div className="lg:col-span-7 h-full">
              <CashDenominationTable
                denominations={denominations}
                onChangeQuantity={handleChangeQuantity}
                onResetAll={handleResetAll}
                isReadOnly={isReadOnly}
              />
            </div>

            {/* Right 5 Columns: Settlement & Submission */}
            <div className="lg:col-span-5 h-full">
              <CashClosingSummaryCard
                closingDate={selectedDate}
                openingCash={openingCash}
                todayDeposit={todayDeposit}
                todayExpense={todayExpense}
                expectedCash={expectedCash}
                countedCash={countedCash}
                differenceAmount={differenceAmount}
                differenceReason={differenceReason}
                setDifferenceReason={setDifferenceReason}
                remarks={remarks}
                setRemarks={setRemarks}
                status={closingData?.status || "Open"}
                onSubmitClosing={handleSubmitClosing}
                isSubmitting={insertClosingMutation.isPending}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Reconciliation History & Report */
        <CashClosingReportTable
          history={reportData?.history || []}
          summary={reportData?.summary}
          monthString={reportData?.month}
          isLoading={isReportLoading}
          onViewDenominations={handleViewDenominations}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />
      )}

      {/* Denomination Notes Breakdown Modal */}
      <DenominationBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => {
          setIsBreakdownModalOpen(false);
          setSelectedRecordForModal(null);
        }}
        record={selectedRecordForModal}
      />
    </div>
  );
};

export default CashClosingPage;
