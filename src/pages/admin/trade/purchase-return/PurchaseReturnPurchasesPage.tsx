import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { FaUndoAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PurchaseStats from "@/pages/admin/trade/purchases/components/PurchaseStats";
import PurchaseReturnPurchaseTable from "./components/PurchaseReturnPurchaseTable";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import apiConfig from "@/config/api.json";
import { partyListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { PurchaseItem, PartyItem } from "@/types";
import {
  usePurchasesQuery,
  usePurchaseAndReturnsQuery,
  extractReturnedInvoiceKeysSet,
} from "./hooks/usePurchaseReturnQueries";
import { usePurchaseTableFilter } from "@/pages/admin/trade/purchases/hooks/usePurchaseTableFilter";

/**
 * Dedicated Purchase Orders page for Purchase Return workflow
 * URL: /admin/purchase-return-purchases
 * Allows viewing purchase orders and initiating returns directly.
 */
const PurchaseReturnPurchasesPage: React.FC = () => {
  const navigate = useNavigate();

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [selectedPurchaseForInvoice, setSelectedPurchaseForInvoice] = useState<PurchaseItem | null>(null);

  // 1. Fetch Suppliers
  const { data: rawSupplierData } = useQuery({
    queryKey: [partyListQueryKey, "SUPPLIER"],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.party.partyListUrl,
        body: { accessUser },
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Purchases & Returns from unified cache to cross-reference already returned orders
  const { data: purchaseAndReturnData } = usePurchaseAndReturnsQuery();

  const returnedInvoiceSet = useMemo(() => {
    return extractReturnedInvoiceKeysSet(purchaseAndReturnData || []);
  }, [purchaseAndReturnData]);

  // 3. Fetch Purchases from Backend API (Shared TanStack Query cache with main Purchase Return & Purchases pages)
  const {
    data: purchasesData,
    isLoading,
    isFetching,
    refetch,
  } = usePurchasesQuery();

  const rawPurchases: PurchaseItem[] = useMemo(() => {
    if (Array.isArray(purchasesData)) return purchasesData;
    if (purchasesData && typeof purchasesData === "object") {
      const raw = purchasesData as any;
      const list =
        raw.purchaseList ||
        raw.purchasesList ||
        raw.purchases ||
        raw.purchaseListDetails ||
        raw.purchaseInfoList ||
        raw.purchase_list ||
        (Array.isArray(raw.data) ? raw.data : raw.data?.purchaseList || raw.data?.purchases) ||
        [];
      if (Array.isArray(list)) return list;
    }
    return [];
  }, [purchasesData]);

  // Dedicated filtering, sorting, pagination, and KPI calculations hook
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    supplierFilter,
    setSupplierFilter,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    sortBy,
    setSortBy,
    currentPageNumber,
    setCurrentPageNumber,
    dataLimit,
    setDataLimit,
    pageCount,
    totalCount,
    suppliersList,
    filteredPurchases,
    sortedPurchases,
    paginatedPurchases,
    stats,
    handlePagination,
  } = usePurchaseTableFilter({ purchases: rawPurchases, rawPartyData: rawSupplierData });

  // Actions
  const handleView = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsInvoiceModalOpen(true);
  };

  const handleReturn = (purchase: PurchaseItem) => {
    navigate("/admin/create-purchase-return", {
      state: { purchase },
    });
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Purchase Orders (Return)"
          headerDescription="View and select purchase orders to initiate supplier returns or check return eligibility"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />
          <Button
            label="Create Return"
            onClick={() => navigate("/admin/create-purchase-return")}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            icon={<FaUndoAlt className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <PurchaseStats
        totalCount={stats.totalCount}
        totalAmount={stats.totalAmount}
        totalPaid={stats.totalPaid}
        totalDue={stats.totalDue}
      />

      {/* Main Table */}
      <PurchaseReturnPurchaseTable
        purchases={paginatedPurchases}
        exportablePurchases={sortedPurchases}
        totalCount={totalCount}
        isLoading={isLoading}
        isFetching={isFetching}
        pageCount={pageCount}
        currentPageNumber={currentPageNumber}
        setCurrentPageNumber={setCurrentPageNumber}
        dataLimit={dataLimit}
        setDataLimit={setDataLimit}
        handlePagination={handlePagination}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        suppliersList={suppliersList}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        sortBy={sortBy}
        setSortBy={setSortBy}
        returnedInvoiceSet={returnedInvoiceSet}
        onReturn={handleReturn}
        onView={handleView}
        onPrint={handlePrint}
      />

      {/* Printable Invoice Modal */}
      <PurchaseInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedPurchaseForInvoice(null);
        }}
        purchase={selectedPurchaseForInvoice}
      />
    </div>
  );
};

export default PurchaseReturnPurchasesPage;
