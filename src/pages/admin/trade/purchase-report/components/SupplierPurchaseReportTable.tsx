import React from "react";
import type { PurchaseItem } from "@/types";
import PartyTradeReportTable from "@/components/reports/PartyTradeReportTable";
import {
  exportFilteredSuppliersExcel,
  downloadFilteredSuppliersPdf,
} from "../utils/purchase-report-helpers";

interface SupplierPurchaseReportTableProps {
  transactions: PurchaseItem[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

export const SupplierPurchaseReportTable: React.FC<
  SupplierPurchaseReportTableProps
> = ({ transactions, isLoading, startDate, endDate }) => (
  <PartyTradeReportTable
    domain="purchase"
    transactions={transactions}
    isLoading={isLoading}
    startDate={startDate}
    endDate={endDate}
    onExportExcel={exportFilteredSuppliersExcel}
    onDownloadPdf={downloadFilteredSuppliersPdf}
    excelSuccessText={(count) => `Exported ${count} suppliers to Excel!`}
    pdfSuccessText="Supplier purchase report PDF downloaded!"
  />
);

export default SupplierPurchaseReportTable;
