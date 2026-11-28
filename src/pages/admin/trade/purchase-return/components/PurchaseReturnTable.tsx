import React from "react";
import TradeReturnTable from "@/components/trade/TradeReturnTable";
import type { PurchaseReturnItem, PartyItem } from "@/types";
import { exportPurchaseReturnToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface PurchaseReturnTableProps {
  returns: PurchaseReturnItem[];
  exportableReturns?: PurchaseReturnItem[];
  totalCount: number;
  isLoading?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  supplierFilter?: string;
  setSupplierFilter?: (supplierId: string) => void;
  suppliersList?: PartyItem[];
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  dateFilter?: string;
  setDateFilter?: (filter: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onResetFilters?: () => void;
  onView?: (item: PurchaseReturnItem) => void;
  onPrint: (item: PurchaseReturnItem) => void;
}

export const PurchaseReturnTable: React.FC<PurchaseReturnTableProps> = ({
  returns,
  exportableReturns,
  totalCount,
  isLoading,
  pageCount,
  currentPageNumber,
  setCurrentPageNumber,
  dataLimit,
  setDataLimit,
  handlePagination,
  searchQuery,
  setSearchQuery,
  supplierFilter,
  setSupplierFilter,
  suppliersList,
  paymentMethodFilter,
  setPaymentMethodFilter,
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  sortBy,
  setSortBy,
  onResetFilters,
  onView,
  onPrint,
}) => {
  const handleExport = (dataToExport: PurchaseReturnItem[]) => {
    try {
      exportPurchaseReturnToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} purchase return records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  return (
    <TradeReturnTable<PurchaseReturnItem>
      partyType="supplier"
      partyLabel="Supplier"
      storageKey="purchase_return_table_columns"
      returns={returns}
      exportableReturns={exportableReturns}
      totalCount={totalCount}
      isLoading={isLoading}
      pageCount={pageCount}
      currentPageNumber={currentPageNumber}
      setCurrentPageNumber={setCurrentPageNumber}
      dataLimit={dataLimit}
      setDataLimit={setDataLimit}
      handlePagination={handlePagination}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      partyFilter={supplierFilter}
      setPartyFilter={setSupplierFilter}
      partiesList={suppliersList}
      paymentMethodFilter={paymentMethodFilter}
      setPaymentMethodFilter={setPaymentMethodFilter}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
      sortBy={sortBy}
      setSortBy={setSortBy}
      onResetFilters={onResetFilters}
      onView={onView}
      onPrint={onPrint}
      onExportExcel={handleExport}
    />
  );
};

export default PurchaseReturnTable;
