import React, { useRef } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { FaPrint, FaFileExcel, FaTimes } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import { getUserInfo } from "@/utils/auth-storage";
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import { getFileViewUrl } from "@/services/file-upload-service";
import { exportSalesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import moment from "moment";
import type { SaleItem } from "@/types";

interface PrintableSalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  transactions: SaleItem[];
  stats: {
    totalSalesVolume: number;
    totalCollected: number;
    totalDue: number;
    totalInvoices: number;
    cashCollected: number;
    mfsCollected: number;
    bankCollected: number;
    totalDiscount: number;
  };
}

export const PrintableSalesReportModal: React.FC<PrintableSalesReportModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  transactions,
  stats,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();
  const { data: businessProfile } = useBusinessProfileQuery();

  // Business Profile Info & Logo
  const businessName =
    businessProfile?.businessName ||
    userInfo?.orgName ||
    userInfo?.businessName ||
    "Cash Boi Trade Ltd";
  const businessAddress = businessProfile?.address || "";
  const businessPhone = businessProfile?.businessPhone1 || "";
  const logoKey = businessProfile?.businessLogo || businessProfile?.businessLogoRefNo || "";
  const businessLogoUrl =
    businessProfile?.businessLogoUrl || (logoKey ? getFileViewUrl(logoKey) : "");

  // Computed Totals for summary footer
  const totalSubtotal = transactions.reduce((acc, t: any) => {
    const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
    return acc + Number(t.totalAmount ?? t.total_amount ?? gt);
  }, 0);

  const totalVat = transactions.reduce((acc, t: any) => acc + Number(t.vat ?? 0), 0);

  const totalItemsCount = transactions.reduce((acc, t: any) => {
    const details = t.salesDetails || t.saleDetails || t.details || t.items || [];
    return acc + (Array.isArray(details) && details.length > 0 ? details.length : Number(t.itemsCount || 1));
  }, 0);

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (!transactions || transactions.length === 0) {
      showErrorToast("No sales records available to export");
      return;
    }
    try {
      await exportSalesToExcel(transactions, {
        fileName: `Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
        sheetName: "Sales Report",
        businessName,
        businessAddress,
        businessPhone,
        businessLogoUrl,
        startDate,
        endDate,
      });
      showSuccessToast(`Exported ${transactions.length} sales to Excel!`);
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  // High-Resolution Print / PDF Generation
  const handlePrint = () => {
    const primaryColor =
      getComputedStyle(document.documentElement).getPropertyValue("--primary-color")?.trim() ||
      "#009fe3";

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    const printDate = moment().format("DD-MMM-YYYY").toUpperCase();
    const fromStr = startDate ? moment(startDate).format("DD-MMM-YYYY").toUpperCase() : "01-JAN-2020";
    const toStr = endDate ? moment(endDate).format("DD-MMM-YYYY").toUpperCase() : printDate;

    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sales_Report_${moment().format("YYYY-MM-DD")}</title>
          <style>
            @page {
              size: landscape;
              margin: 6mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: 4px;
              color: #0f172a;
              background: #ffffff;
            }
            .header-row {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              padding-bottom: 2px;
              margin-bottom: 0px;
            }
            .company-info {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .company-logo {
              height: 36px;
              max-width: 120px;
              object-fit: contain;
            }
            .company-name {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.15;
            }
            .company-sub {
              font-size: 10px;
              color: #475569;
              line-height: 1.2;
              margin-top: 1px;
            }
            .print-date {
              font-size: 10px;
              font-weight: 700;
              color: #0f172a;
              text-align: right;
              padding-top: 2px;
            }
            .report-title {
              font-size: 14px;
              font-weight: 800;
              text-align: center;
              text-transform: uppercase;
              margin: 2px 0 3px 0;
              color: #0f172a;
              letter-spacing: 0.5px;
              line-height: 1.2;
            }
            .filter-row {
              font-size: 10px;
              font-weight: 600;
              color: #334155;
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 3px;
              margin-bottom: 4px;
              line-height: 1.2;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 2px;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              border: 1px solid #94a3b8;
              padding: 4px 5px;
              font-size: 9.5px;
            }
            th {
              background-color: ${primaryColor} !important;
              color: #ffffff !important;
              font-weight: 700;
              text-align: left;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            tfoot {
              display: table-row-group !important;
            }
            .total-row {
              background-color: #f1f5f9 !important;
              font-weight: 800;
              border-top: 2px solid #64748b;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .signatures {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #475569;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .sig-block {
              text-align: center;
              width: 140px;
            }
            .sig-line {
              border-bottom: 1px solid #94a3b8;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header-row">
            <div class="company-info">
              ${
                businessLogoUrl
                  ? `<img src="${businessLogoUrl}" class="company-logo" crossOrigin="anonymous" />`
                  : ""
              }
              <div>
                <div class="company-name">${businessName}</div>
                ${businessAddress ? `<div class="company-sub">${businessAddress}</div>` : ""}
                ${businessPhone ? `<div class="company-sub">Phone: ${businessPhone}</div>` : ""}
              </div>
            </div>
            <div class="print-date">
              Print Date: ${printDate}
            </div>
          </div>

          <div class="report-title">Sales Report</div>

          <div class="filter-row">
            <div>
              From Date: <b>${fromStr}</b> &nbsp;&nbsp; To Date: <b>${toStr}</b>
            </div>
            <div>
              Total Invoices: <b>${transactions.length}</b>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 32px;">SL</th>
                <th>Order ID</th>
                <th class="text-center">Date</th>
                <th>Customer Name</th>
                <th class="text-center">Phone</th>
                <th class="text-center" style="width: 40px;">Items</th>
                <th class="text-right">Subtotal (৳)</th>
                <th class="text-right">Discount (৳)</th>
                <th class="text-right">VAT (৳)</th>
                <th class="text-right">Grand Total (৳)</th>
                <th class="text-right">Paid (৳)</th>
                <th class="text-right">Due (৳)</th>
                <th class="text-center">Method</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map((t: any, idx: number) => {
                  const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
                  const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);
                  const due = Number(t.dueAmount ?? t.due_amount ?? Math.max(0, gt - paid));
                  const sub = Number(t.totalAmount ?? t.total_amount ?? gt);
                  const disc = Number(t.discount ?? 0);
                  const vat = Number(t.vat ?? 0);
                  const pType = String(t.paymentType || t.payment_type || "CASH").toUpperCase();
                  const details = t.salesDetails || t.saleDetails || t.details || t.items || [];
                  const itemsCount = Array.isArray(details) && details.length > 0 ? details.length : Number(t.itemsCount || 1);
                  const status = due <= 0 && gt > 0 ? "PAID" : due > 0 && paid > 0 ? "PARTIAL" : "DUE";
                  const dateStr = t.salesDate || t.date ? moment(t.salesDate || t.date).format("DD-MMM-YYYY").toUpperCase() : "-";

                  return `
                    <tr>
                      <td class="text-center">${idx + 1}</td>
                      <td class="font-bold">${t.orderNo || t.invoiceNo || `ORD-${t.id || idx + 1}`}</td>
                      <td class="text-center">${dateStr}</td>
                      <td>${t.customerName || t.customer_name || "Walk-in Customer"}</td>
                      <td class="text-center">${t.customerPhone || t.customer_phone || "-"}</td>
                      <td class="text-center">${itemsCount}</td>
                      <td class="text-right">${formatMoney(sub)}</td>
                      <td class="text-right">${disc > 0 ? formatMoney(disc) : "-"}</td>
                      <td class="text-right">${vat > 0 ? formatMoney(vat) : "-"}</td>
                      <td class="text-right font-bold">${formatMoney(gt)}</td>
                      <td class="text-right font-bold" style="color: #047857;">${formatMoney(paid)}</td>
                      <td class="text-right font-bold" style="color: #b91c1c;">${due > 0 ? formatMoney(due) : "-"}</td>
                      <td class="text-center">${pType}</td>
                      <td class="text-center font-bold">${status}</td>
                    </tr>
                  `;
                })
                .join("")}
              <tr class="total-row">
                <td colspan="5" class="text-center font-bold">TOTAL SUMMARY (${transactions.length} Invoices)</td>
                <td class="text-center">${totalItemsCount}</td>
                <td class="text-right">${formatMoney(totalSubtotal)}</td>
                <td class="text-right">${stats.totalDiscount > 0 ? formatMoney(stats.totalDiscount) : "-"}</td>
                <td class="text-right">${totalVat > 0 ? formatMoney(totalVat) : "-"}</td>
                <td class="text-right font-bold" style="color: ${primaryColor};">${formatMoney(stats.totalSalesVolume)}</td>
                <td class="text-right font-bold" style="color: #047857;">${formatMoney(stats.totalCollected)}</td>
                <td class="text-right font-bold" style="color: #b91c1c;">${stats.totalDue > 0 ? formatMoney(stats.totalDue) : "-"}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <span>Prepared By</span>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <span>Checked By</span>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <span>Authorized Signatory</span>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.error("Print trigger error:", err);
      }
    }, 450);
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Report — Print & PDF Preview"
      size="2xl"
    >
      <div className="flex flex-col gap-4 max-h-[82vh] overflow-y-auto px-1">
        {/* Top Actions in Modal Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">
              Total Records: <span className="text-[var(--primary-color,#009fe3)]">{transactions.length}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-2xs cursor-pointer"
              title="Download Designed Excel Report"
            >
              <FaFileExcel className="text-emerald-600 text-xs" />
              <span>Download Excel</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[var(--primary-color,#009fe3)] hover:opacity-90 rounded-lg transition-all shadow-2xs cursor-pointer"
              title="Print or Save as PDF"
            >
              <FaPrint className="text-xs" />
              <span>Print / Save as PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (matches user's reference design) */}
        <div
          ref={printRef}
          className="bg-white p-3.5 sm:p-4 border border-gray-300 rounded-lg text-gray-900 font-sans shadow-xs"
        >
          {/* Header Row: Left = Logo + Company Name + Address, Right = Print Date */}
          <div className="flex items-start justify-between gap-3 pb-1">
            <div className="flex items-center gap-2.5">
              {businessLogoUrl ? (
                <img
                  src={businessLogoUrl}
                  alt="Business Logo"
                  className="h-9 sm:h-10 w-auto max-w-[120px] object-contain shrink-0"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-9 h-9 rounded-md bg-[var(--primary-color,#009fe3)]/10 text-[var(--primary-color,#009fe3)] font-black text-xs flex items-center justify-center shrink-0 border border-[var(--primary-color,#009fe3)]/20">
                  {(businessName || "CB").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight leading-tight">
                  {businessName}
                </h1>
                {businessAddress && (
                  <p className="text-[10px] text-gray-600 font-medium leading-tight mt-0.5">
                    {businessAddress}
                  </p>
                )}
                {businessPhone && (
                  <p className="text-[10px] text-gray-500 font-medium leading-tight">
                    Phone: {businessPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Print Date (Right Aligned) */}
            <div className="text-right shrink-0 pt-0.5">
              <span className="text-[11px] font-bold text-gray-900">
                Print Date: {moment().format("DD-MMM-YYYY").toUpperCase()}
              </span>
            </div>
          </div>

          {/* Centered Report Title */}
          <div className="text-center my-1">
            <h2 className="text-xs sm:text-sm font-black uppercase text-gray-900 tracking-wide leading-tight">
              Sales Report
            </h2>
          </div>

          {/* Subtitle / Filter Row (Left-aligned) */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 pb-1 mb-1.5 border-b border-gray-200 leading-tight">
            <div>
              <span>From Date: </span>
              <span className="font-bold text-gray-900">
                {startDate ? moment(startDate).format("DD-MMM-YYYY").toUpperCase() : "01-JAN-2020"}
              </span>
              <span className="mx-2">To Date: </span>
              <span className="font-bold text-gray-900">
                {endDate ? moment(endDate).format("DD-MMM-YYYY").toUpperCase() : moment().format("DD-MMM-YYYY").toUpperCase()}
              </span>
            </div>
            <div className="text-gray-500 font-normal">
              Total Invoices: <b className="text-gray-900">{transactions.length}</b>
            </div>
          </div>

          {/* Table with Dynamic Global Color Header & Clear Grid Borders */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-[var(--table-header-bg,var(--primary-color,#009fe3))] text-white font-bold">
                  <th className="py-1.5 px-2 text-center border border-gray-300 w-10">SL</th>
                  <th className="py-1.5 px-2 border border-gray-300 whitespace-nowrap">Order ID</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-center whitespace-nowrap">Date</th>
                  <th className="py-1.5 px-2 border border-gray-300">Customer Name</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-center whitespace-nowrap">Phone</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-center w-12">Items</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-right whitespace-nowrap">Subtotal (৳)</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-right whitespace-nowrap">Discount (৳)</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-right whitespace-nowrap">VAT (৳)</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-right whitespace-nowrap">Grand Total (৳)</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-right whitespace-nowrap">Paid (৳)</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-right whitespace-nowrap">Due (৳)</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-center whitespace-nowrap">Method</th>
                  <th className="py-1.5 px-2 border border-gray-300 text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((t: any, idx: number) => {
                  const gt = Number(t.grandTotal ?? t.grand_total ?? t.totalAmount ?? 0);
                  const paid = Number(t.paidAmount ?? t.paid_amount ?? 0);
                  const due = Number(t.dueAmount ?? t.due_amount ?? Math.max(0, gt - paid));
                  const sub = Number(t.totalAmount ?? t.total_amount ?? gt);
                  const disc = Number(t.discount ?? 0);
                  const vat = Number(t.vat ?? 0);
                  const pType = String(t.paymentType || t.payment_type || "CASH").toUpperCase();
                  const details = t.salesDetails || t.saleDetails || t.details || t.items || [];
                  const itemsCount = Array.isArray(details) && details.length > 0 ? details.length : Number(t.itemsCount || 1);
                  const status = due <= 0 && gt > 0 ? "PAID" : due > 0 && paid > 0 ? "PARTIAL" : "DUE";

                  return (
                    <tr key={idx} className="hover:bg-gray-50/80">
                      <td className="py-1 px-2 text-center border border-gray-300">{idx + 1}</td>
                      <td className="py-1 px-2 font-semibold border border-gray-300 whitespace-nowrap">
                        {t.orderNo || t.invoiceNo || `ORD-${t.id || idx + 1}`}
                      </td>
                      <td className="py-1 px-2 text-center text-gray-600 border border-gray-300 whitespace-nowrap">
                        {t.salesDate || t.date ? moment(t.salesDate || t.date).format("DD-MMM-YYYY").toUpperCase() : "-"}
                      </td>
                      <td className="py-1 px-2 border border-gray-300 truncate max-w-[150px]">
                        {t.customerName || t.customer_name || "Walk-in Customer"}
                      </td>
                      <td className="py-1 px-2 text-center text-gray-600 border border-gray-300 whitespace-nowrap">
                        {t.customerPhone || t.customer_phone || "-"}
                      </td>
                      <td className="py-1 px-2 text-center border border-gray-300">{itemsCount}</td>
                      <td className="py-1 px-2 text-right border border-gray-300 font-medium">
                        {formatMoney(sub)}
                      </td>
                      <td className="py-1 px-2 text-right border border-gray-300 text-gray-600">
                        {disc > 0 ? formatMoney(disc) : "-"}
                      </td>
                      <td className="py-1 px-2 text-right border border-gray-300 text-gray-600">
                        {vat > 0 ? formatMoney(vat) : "-"}
                      </td>
                      <td className="py-1 px-2 text-right border border-gray-300 font-bold text-gray-900">
                        {formatMoney(gt)}
                      </td>
                      <td className="py-1 px-2 text-right border border-gray-300 text-emerald-700 font-bold">
                        {formatMoney(paid)}
                      </td>
                      <td className="py-1 px-2 text-right border border-gray-300 text-rose-700 font-bold">
                        {due > 0 ? formatMoney(due) : "-"}
                      </td>
                      <td className="py-1 px-2 text-center border border-gray-300 font-medium text-[11px]">
                        {pType}
                      </td>
                      <td className="py-1 px-2 text-center border border-gray-300">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Total Summary Row - renders once at the end of all items (Last Page) */}
                <tr className="bg-gray-100 font-black text-gray-900 border-t-2 border-gray-400">
                  <td colSpan={5} className="py-1.5 px-2 text-center border border-gray-300 font-bold">
                    TOTAL SUMMARY ({transactions.length} Invoices)
                  </td>
                  <td className="py-1.5 px-2 text-center border border-gray-300 font-bold">{totalItemsCount}</td>
                  <td className="py-1.5 px-2 text-right border border-gray-300">{formatMoney(totalSubtotal)}</td>
                  <td className="py-1.5 px-2 text-right border border-gray-300">
                    {stats.totalDiscount > 0 ? formatMoney(stats.totalDiscount) : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-right border border-gray-300">
                    {totalVat > 0 ? formatMoney(totalVat) : "-"}
                  </td>
                  <td className="py-1.5 px-2 text-right border border-gray-300 font-black text-[var(--primary-color,#009fe3)]">
                    {formatMoney(stats.totalSalesVolume)}
                  </td>
                  <td className="py-1.5 px-2 text-right border border-gray-300 text-emerald-700 font-black">
                    {formatMoney(stats.totalCollected)}
                  </td>
                  <td className="py-1.5 px-2 text-right border border-gray-300 text-rose-700 font-black">
                    {stats.totalDue > 0 ? formatMoney(stats.totalDue) : "-"}
                  </td>
                  <td colSpan={2} className="border border-gray-300"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-gray-300 flex items-center justify-between text-xs text-gray-600">
            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1"></div>
              <span>Prepared By</span>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1"></div>
              <span>Checked By</span>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1"></div>
              <span>Authorized Signatory</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose} size="sm">
            Close
          </Button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            <FaFileExcel className="text-emerald-600 text-xs" />
            <span>Download Excel</span>
          </button>
          <Button variant="primary" onClick={handlePrint} size="sm">
            <FaPrint className="mr-1.5" />
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrintableSalesReportModal;
