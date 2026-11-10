import React from "react";
import type { SaleItem } from "@/types";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";
import ProductTradeReportTable from "@/components/reports/ProductTradeReportTable";
import {
  exportFilteredProductsExcel,
  downloadFilteredProductsPdf,
} from "../utils/sales-report-helpers";

interface ProductSalesReportTableProps extends ReportDateFilterProps {
  transactions: SaleItem[];
  isLoading?: boolean;
}

export const ProductSalesReportTable: React.FC<ProductSalesReportTableProps> = ({
  transactions,
  isLoading,
  ...dateFilterProps
}) => (
  <ProductTradeReportTable
    domain="sale"
    transactions={transactions}
    isLoading={isLoading}
    {...dateFilterProps}
    onExportExcel={exportFilteredProductsExcel}
    onDownloadPdf={downloadFilteredProductsPdf}
    excelSuccessText={(count) => `Exported ${count} products to Excel!`}
    pdfSuccessText="Product sales report PDF downloaded!"
  />
);

export default ProductSalesReportTable;
