import React from "react";
import type { SaleItem } from "@/types";
import PartyTradeReportTable from "@/components/reports/PartyTradeReportTable";
import {
  exportFilteredCustomersExcel,
  downloadFilteredCustomersPdf,
} from "../utils/sales-report-helpers";

interface CustomerSalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

export const CustomerSalesReportTable: React.FC<
  CustomerSalesReportTableProps
> = ({ transactions, isLoading, startDate, endDate }) => (
  <PartyTradeReportTable
    domain="sale"
    transactions={transactions}
    isLoading={isLoading}
    startDate={startDate}
    endDate={endDate}
    onExportExcel={exportFilteredCustomersExcel}
    onDownloadPdf={downloadFilteredCustomersPdf}
    excelSuccessText={(count) => `Exported ${count} customers to Excel!`}
    pdfSuccessText="Customer sales report PDF downloaded!"
  />
);

export default CustomerSalesReportTable;
