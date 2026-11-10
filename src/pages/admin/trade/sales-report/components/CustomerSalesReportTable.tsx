import React from "react";
import type { SaleItem } from "@/types";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";
import PartyTradeReportTable from "@/components/reports/PartyTradeReportTable";
import {
  exportFilteredCustomersExcel,
  downloadFilteredCustomersPdf,
} from "../utils/sales-report-helpers";

interface CustomerSalesReportTableProps extends ReportDateFilterProps {
  transactions: SaleItem[];
  isLoading?: boolean;
}

export const CustomerSalesReportTable: React.FC<
  CustomerSalesReportTableProps
> = ({ transactions, isLoading, ...dateFilterProps }) => (
  <PartyTradeReportTable
    domain="sale"
    transactions={transactions}
    isLoading={isLoading}
    {...dateFilterProps}
    onExportExcel={exportFilteredCustomersExcel}
    onDownloadPdf={downloadFilteredCustomersPdf}
    excelSuccessText={(count) => `Exported ${count} customers to Excel!`}
    pdfSuccessText="Customer sales report PDF downloaded!"
  />
);

export default CustomerSalesReportTable;
