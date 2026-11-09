import React, { useState, useMemo } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import {
  Button,
  RefreshButton,
  StatsCards,
  DrawerModal,
  EmptyState,
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/common";
import {
  useCategoryListQuery,
  useInsertCategoryMutation,
} from "@/hooks/useCategoryQueries";
import { useCashBalanceQuery } from "@/hooks/useCashBalance";
import { useFinancialTransactionsQuery } from "@/hooks/useFinanceQueries";
import { useQueryClient } from "@tanstack/react-query";
import {
  categoryListQueryKey,
  cashBalanceQueryKey,
  cashClosingQueryKey,
  cashClosingReportQueryKey,
  financialTransactionQueryKey,
} from "@/config/query-key";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast } from "@/utils/toast-utils";
import type { CategoryItem, InsertCategoryPayload } from "@/types";
import { FaCoins, FaMoneyBillWave, FaCalendarAlt, FaCheckCircle, FaPlus } from "react-icons/fa";
import moment from "moment";
import { usePermission } from "@/hooks/usePermission";

export const OpeningCashBalancePage: React.FC = () => {
  const { canCreate } = usePermission();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [dateInput, setDateInput] = useState(moment().format("YYYY-MM-DDTHH:mm"));

  // Fetch categories, live cash balance, and financial transactions from backend
  const { data: catData, isLoading: isCatLoading, refetch: refetchCats } = useCategoryListQuery();
  const { data: liveCash = 0, isLoading: isCashLoading, refetch: refetchCash } = useCashBalanceQuery();
  const {
    data: transactions = [],
    isLoading: isTxnLoading,
    refetch: refetchTxns,
  } = useFinancialTransactionsQuery({ type: "INCOME" });

  // Map categoryId -> transactionDate from financial transactions
  const txnDateMap = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(transactions)) {
      transactions.forEach((t) => {
        const catId = String(t.categoryId || "").trim();
        const date = t.transactionDate || t.createdDate;
        if (catId && date && !map.has(catId)) {
          map.set(catId, date);
        }
      });
    }
    return map;
  }, [transactions]);

  // Filter and enrich all cash opening records from backend with their transaction date
  const cashRecords = useMemo<CategoryItem[]>(() => {
    const list =
      catData?.categoryList?.filter((c) => {
        const t = String(c.type || "").trim().toLowerCase();
        const name = String(c.categoryName || "").trim().toLowerCase();
        return t === "cash" || name === "cash";
      }) || [];

    // Attach true transaction date
    const enriched = list.map((c) => {
      const catIdStr = String(c.categoryId || "").trim();
      let matchedDate = txnDateMap.get(catIdStr);

      if (!matchedDate && Array.isArray(transactions)) {
        // Fallback: match from opening cash transaction by amount
        const match = transactions.find((t) => {
          const isOpening = String(t.head || "").toLowerCase().includes("opening");
          return isOpening && Number(t.amount) === Number(c.openingBalance);
        });
        if (match?.transactionDate || match?.createdDate) {
          matchedDate = match.transactionDate || match.createdDate;
        }
      }

      return {
        ...c,
        transactionDate: matchedDate || c.transactionDate || (c as any)?.createdDate,
      };
    });

    // Sort newest first by date or categoryId
    return enriched.sort((a, b) => {
      const timeA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const timeB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeB - timeA;
      }
      return (Number(b.categoryId) || 0) - (Number(a.categoryId) || 0);
    });
  }, [catData, txnDateMap, transactions]);

  // Total opening cash recorded across all entries
  const totalOpeningCash = useMemo(() => {
    return cashRecords.reduce((sum, item) => sum + (Number(item.openingBalance) || 0), 0);
  }, [cashRecords]);

  // Mutation to insert new opening cash entry (always creates backend transaction & updates balance)
  const insertMutation = useInsertCategoryMutation();
  const isSaving = insertMutation.isPending;

  // Open modal for a new opening cash entry
  const handleOpenNewModal = () => {
    setBalanceInput("");
    setDateInput(moment().format("YYYY-MM-DDTHH:mm"));
    setIsModalOpen(true);
  };

  // Submit handler - records a new opening cash entry in backend
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!canCreate("opening_cash")) {
      showErrorToast("You do not have permission to record opening cash balance.");
      return;
    }

    const num = Number(balanceInput);
    if (balanceInput === "" || isNaN(num) || num <= 0) {
      showErrorToast("Please enter a valid opening balance (> 0)");
      return;
    }

    const formattedDate = moment(dateInput).format("YYYY-MM-DDTHH:mm:ss.SSS");

    const onComplete = () => {
      setIsModalOpen(false);
      setBalanceInput("");
      // Invalidate all related financial & cash-closing queries so backend recalculates everything
      queryClient.invalidateQueries({ queryKey: [categoryListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashClosingQueryKey] });
      queryClient.invalidateQueries({ queryKey: [cashClosingReportQueryKey] });
      queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey] });
    };

    const payload: InsertCategoryPayload = {
      categoryName: "Cash",
      categoryType: "Cash",
      openingBalance: num,
      transactionDate: formattedDate,
    };
    insertMutation.mutate(payload, { onSuccess: onComplete });
  };

  const latestRecord = cashRecords[0];
  const rawDate =
    latestRecord?.transactionDate ||
    (latestRecord as any)?.createdDate ||
    (latestRecord as any)?.createdAt ||
    (latestRecord as any)?.date;
  const formattedDate =
    rawDate && moment(rawDate).isValid()
      ? moment(rawDate).format("DD MMM, YYYY hh:mm A")
      : "Not Set";

  // KPI cards
  const statCards = [
    {
      title: "Total Opening Cash",
      value: `৳ ${formatMoney(totalOpeningCash)}`,
      icon: FaCoins,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-300 hover:border-emerald-400",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Current Cash in Hand",
      value: `৳ ${formatMoney(liveCash)}`,
      icon: FaMoneyBillWave,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-300 hover:border-blue-400",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Latest Entry Date",
      value: cashRecords.length > 0 ? formattedDate : "Not Set",
      icon: FaCalendarAlt,
      color: "text-purple-600",
      bg: "bg-purple-50/60 border-purple-300 hover:border-purple-400",
      iconBg: "bg-purple-100 text-purple-600",
    },
    {
      title: "Register Status",
      value: cashRecords.length > 0 ? "Active" : "Uninitialized",
      icon: FaCheckCircle,
      color: "text-teal-600",
      bg: "bg-teal-50/60 border-teal-300 hover:border-teal-400",
      iconBg: "bg-teal-100 text-teal-600",
    },
  ];

  return (
    <div className="flex flex-col gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Opening Cash Balance"
          headerDescription="Manage and record starting cash entries in register for financial accounting"
        />
        <div className="flex items-center gap-2">
          <RefreshButton
            onClick={() => {
              refetchCats();
              refetchCash();
              refetchTxns();
            }}
            isLoading={isCatLoading || isCashLoading || isTxnLoading}
          />
          {canCreate("opening_cash") && (
            <Button
              label="New Opening Cash"
              onClick={handleOpenNewModal}
              color="var(--color-primary)"
              hoverColor="var(--color-primary-hover)"
              icon={<FaPlus className="text-white text-xs" />}
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <StatsCards cards={statCards} />

      {/* Cash Record Table */}
      <TableContainer>
        <TableToolbar
          title="Cash Register Entries"
          totalCount={cashRecords.length}
          countLabel={cashRecords.length === 1 ? "Entry" : "Entries"}
        />
        <TableScroll>
          <Table minWidth={750}>
            <TableHead>
              <TableTh width={60} align="center">SL</TableTh>
              <TableTh>Account / Category</TableTh>
              <TableTh width={140}>Type</TableTh>
              <TableTh width={180} align="right">Opening Balance</TableTh>
              <TableTh width={200}>Transaction Date</TableTh>
              <TableTh width={120} align="center">Status</TableTh>
            </TableHead>
            <TableBody>
              {cashRecords.length > 0 ? (
                cashRecords.map((item, index) => {
                  const itemAmount = Number(item.openingBalance ?? 0);
                  const rawItemDate =
                    item.transactionDate ||
                    (item as any)?.createdDate ||
                    (item as any)?.createdAt ||
                    (item as any)?.date;
                  const formattedItemDate =
                    rawItemDate && moment(rawItemDate).isValid()
                      ? moment(rawItemDate).format("DD MMM, YYYY hh:mm A")
                      : "—";

                  return (
                    <TableRow key={item.categoryId || index}>
                      <TableCell align="center" className="text-black font-medium whitespace-nowrap">
                        {index + 1}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                            <FaMoneyBillWave size={12} />
                          </div>
                          <span className="font-semibold text-black text-xs">
                            {item.categoryName || "Cash"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <FaCoins size={10} />
                          {item.type || "Cash"}
                        </span>
                      </TableCell>
                      <TableCell align="right" className="whitespace-nowrap">
                        <span className="font-bold text-emerald-700 text-xs">
                          ৳ {formatMoney(itemAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                        {formattedItemDate}
                      </TableCell>
                      <TableCell align="center" className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          <FaCheckCircle className="text-emerald-500" size={10} />
                          {item.status || "Active"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <EmptyState
                  colSpan={6}
                  title="No Opening Cash Balance Found"
                  description="No opening cash balance recorded yet. Click 'New Opening Cash' to initialize your starting cash in hand."
                  actionLabel={canCreate("opening_cash") ? "New Opening Cash" : undefined}
                  onAction={canCreate("opening_cash") ? handleOpenNewModal : undefined}
                />
              )}
            </TableBody>
          </Table>
        </TableScroll>
      </TableContainer>

      {/* Opening Cash Drawer Modal */}
      <DrawerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Opening Cash"
        icon={<FaCoins size={14} className="text-emerald-500" />}
        maxWidth="max-w-[340px]"
        contentKey="new-opening-cash"
        onSubmit={handleSubmit}
        footerButtons={
          <>
            <Button
              label="Cancel"
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              disabled={isSaving}
              buttonClass="!bg-white hover:!bg-gray-50 !border-gray-300 !text-gray-700 font-medium !rounded-md !py-[0.4rem] !px-4 text-xs"
            />
            <Button
              label="Save Balance"
              type="submit"
              color="var(--color-primary)"
              hoverColor="var(--color-primary-hover)"
              isLoading={isSaving}
              disabled={isSaving}
            />
          </>
        }
      >
        <div className="flex flex-col gap-3 py-1 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Opening Balance (৳) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">৳</span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Enter cash amount to record as new starting cash in hand.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Transaction Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </DrawerModal>
    </div>
  );
};

export default OpeningCashBalancePage;
