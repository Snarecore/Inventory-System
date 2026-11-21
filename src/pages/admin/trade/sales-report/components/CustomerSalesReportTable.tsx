import React from "react";
import type { SaleItem } from "@/types";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";
import PartyTradeReportTable from "@/components/reports/PartyTradeReportTable";
import {
  exportFilteredCustomersExcel,
  downloadFilteredCustomersPdf,
  exportCustomerSalesInvoicesExcel,
  downloadCustomerSalesInvoicesPdf,
} from "../utils/sales-report-helpers";

interface CustomerSalesReportTableProps extends ReportDateFilterProps {
  transactions: SaleItem[];
  isLoading?: boolean;
  onView?: (item: SaleItem) => void;
}

export const CustomerSalesReportTable: React.FC<
  CustomerSalesReportTableProps
> = ({ transactions, isLoading, onView, ...dateFilterProps }) => (
  <PartyTradeReportTable
    domain="sale"
    transactions={transactions}
    isLoading={isLoading}
    {...dateFilterProps}
    onExportExcel={exportFilteredCustomersExcel}
    onDownloadPdf={downloadFilteredCustomersPdf}
    onExportPartyInvoicesExcel={exportCustomerSalesInvoicesExcel}
    onDownloadPartyInvoicesPdf={downloadCustomerSalesInvoicesPdf}
    onViewInvoice={onView}
    excelSuccessText={(count) => `Exported ${count} customers to Excel!`}
    pdfSuccessText="Customer sales register PDF downloaded!"
  />
);

export default CustomerSalesReportTable;
