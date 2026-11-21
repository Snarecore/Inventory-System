import React from "react";
import type { PurchaseItem } from "@/types";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";
import PartyTradeReportTable from "@/components/reports/PartyTradeReportTable";
import {
  exportFilteredSuppliersExcel,
  downloadFilteredSuppliersPdf,
  exportSupplierPurchasesExcel,
  downloadSupplierPurchasesPdf,
} from "../utils/purchase-report-helpers";

interface SupplierPurchaseReportTableProps extends ReportDateFilterProps {
  transactions: PurchaseItem[];
  isLoading?: boolean;
  onView?: (item: PurchaseItem) => void;
}

export const SupplierPurchaseReportTable: React.FC<
  SupplierPurchaseReportTableProps
> = ({ transactions, isLoading, onView, ...dateFilterProps }) => (
  <PartyTradeReportTable
    domain="purchase"
    transactions={transactions}
    isLoading={isLoading}
    {...dateFilterProps}
    onExportExcel={exportFilteredSuppliersExcel}
    onDownloadPdf={downloadFilteredSuppliersPdf}
    onExportPartyInvoicesExcel={exportSupplierPurchasesExcel}
    onDownloadPartyInvoicesPdf={downloadSupplierPurchasesPdf}
    onViewInvoice={onView}
    excelSuccessText={(count) => `Exported ${count} suppliers to Excel!`}
    pdfSuccessText="Supplier purchase register PDF downloaded!"
  />
);

export default SupplierPurchaseReportTable;
