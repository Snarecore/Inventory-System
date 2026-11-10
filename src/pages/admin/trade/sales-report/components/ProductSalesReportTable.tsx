import React from "react";
import type { SaleItem } from "@/types";
import ProductTradeReportTable from "@/components/reports/ProductTradeReportTable";
import {
  exportFilteredProductsExcel,
  downloadFilteredProductsPdf,
} from "../utils/sales-report-helpers";

interface ProductSalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

export const ProductSalesReportTable: React.FC<ProductSalesReportTableProps> = ({
  transactions,
  isLoading,
  startDate,
  endDate,
}) => (
  <ProductTradeReportTable
    domain="sale"
    transactions={transactions}
    isLoading={isLoading}
    startDate={startDate}
    endDate={endDate}
    onExportExcel={exportFilteredProductsExcel}
    onDownloadPdf={downloadFilteredProductsPdf}
    excelSuccessText={(count) => `Exported ${count} products to Excel!`}
    pdfSuccessText="Product sales report PDF downloaded!"
  />
);

export default ProductSalesReportTable;
