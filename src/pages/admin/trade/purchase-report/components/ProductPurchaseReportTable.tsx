import React from "react";
import type { PurchaseItem } from "@/types";
import ProductTradeReportTable from "@/components/reports/ProductTradeReportTable";
import {
  exportFilteredPurchaseProductsExcel,
  downloadFilteredPurchaseProductsPdf,
} from "../utils/purchase-report-helpers";

interface ProductPurchaseReportTableProps {
  transactions: PurchaseItem[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

export const ProductPurchaseReportTable: React.FC<
  ProductPurchaseReportTableProps
> = ({ transactions, isLoading, startDate, endDate }) => (
  <ProductTradeReportTable
    domain="purchase"
    transactions={transactions}
    isLoading={isLoading}
    startDate={startDate}
    endDate={endDate}
    onExportExcel={exportFilteredPurchaseProductsExcel}
    onDownloadPdf={downloadFilteredPurchaseProductsPdf}
    excelSuccessText={(count) => `Exported ${count} products to Excel!`}
    pdfSuccessText="Product purchase report PDF downloaded!"
  />
);

export default ProductPurchaseReportTable;
