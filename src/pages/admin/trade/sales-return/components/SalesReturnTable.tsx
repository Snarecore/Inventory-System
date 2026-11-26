import React from "react";
import TradeReturnTable from "@/components/trade/TradeReturnTable";
import type { SalesReturnItem, PartyItem } from "@/types";
import { exportSalesReturnToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface SalesReturnTableProps {
  returns: SalesReturnItem[];
  exportableReturns?: SalesReturnItem[];
  totalCount: number;
  rawCount?: number;
  isLoading?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  customerFilter?: string;
  setCustomerFilter?: (customerId: string) => void;
  customersList?: PartyItem[];
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
  onPrint: (item: SalesReturnItem) => void;
}

export const SalesReturnTable: React.FC<SalesReturnTableProps> = ({
  returns,
  exportableReturns,
  totalCount,
  rawCount,
  isLoading,
  pageCount,
  currentPageNumber,
  setCurrentPageNumber,
  dataLimit,
  setDataLimit,
  handlePagination,
  searchQuery,
  setSearchQuery,
  customerFilter,
  setCustomerFilter,
  customersList,
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
  onPrint,
}) => {
  const handleExport = (dataToExport: SalesReturnItem[]) => {
    try {
      exportSalesReturnToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} sales return records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  return (
    <TradeReturnTable<SalesReturnItem>
      partyType="customer"
      partyLabel="Customer"
      storageKey="sales_return_table_columns"
      returns={returns}
      exportableReturns={exportableReturns}
      totalCount={totalCount}
      rawCount={rawCount}
      isLoading={isLoading}
      pageCount={pageCount}
      currentPageNumber={currentPageNumber}
      setCurrentPageNumber={setCurrentPageNumber}
      dataLimit={dataLimit}
      setDataLimit={setDataLimit}
      handlePagination={handlePagination}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      partyFilter={customerFilter}
      setPartyFilter={setCustomerFilter}
      partiesList={customersList}
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
      onPrint={onPrint}
      onExportExcel={handleExport}
    />
  );
};

export default SalesReturnTable;
