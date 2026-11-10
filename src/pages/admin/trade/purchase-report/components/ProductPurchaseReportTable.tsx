import React from "react";
import type { PurchaseItem } from "@/types";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";
import ProductTradeReportTable from "@/components/reports/ProductTradeReportTable";
import {
  exportFilteredPurchaseProductsExcel,
  downloadFilteredPurchaseProductsPdf,
} from "../utils/purchase-report-helpers";

interface ProductPurchaseReportTableProps extends ReportDateFilterProps {
  transactions: PurchaseItem[];
  isLoading?: boolean;
}

export const ProductPurchaseReportTable: React.FC<
  ProductPurchaseReportTableProps
> = ({ transactions, isLoading, ...dateFilterProps }) => (
  <ProductTradeReportTable
    domain="purchase"
    transactions={transactions}
    isLoading={isLoading}
    {...dateFilterProps}
    onExportExcel={exportFilteredPurchaseProductsExcel}
    onDownloadPdf={downloadFilteredPurchaseProductsPdf}
    excelSuccessText={(count) => `Exported ${count} products to Excel!`}
    pdfSuccessText="Product purchase report PDF downloaded!"
  />
);

export default ProductPurchaseReportTable;
