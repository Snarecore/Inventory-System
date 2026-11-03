import React, { useRef } from "react";
import { FiPrinter } from "react-icons/fi";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { formatMoney } from "@/utils/formatters";
import type { PaymentReceiptData } from "@/types/payment.types";

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: PaymentReceiptData | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptData,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    const content = printAreaRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print money receipts");
      return;
    }

    // Unused template string deprecated for safe DOM cloning
    /*
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Voucher - ${receiptData.receiptNo}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 10px;
              font-size: 11px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #111827;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0 0 2px 0;
            }
            .subtitle {
              font-size: 12px;
              font-weight: 600;
              color: #4b5563;
              margin: 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 12px;
              padding: 8px;
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .label {
              color: #4b5563;
              font-weight: 600;
            }
            .val {
              font-weight: 700;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 6px 8px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: 700;
              color: #111827;
              font-size: 10px;
              text-transform: uppercase;
            }
            .text-right {
              text-align: right;
            }
            .totals-container {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 24px;
            }
            .totals-table {
              width: 260px;
              border-collapse: collapse;
            }
            .totals-table td {
              border: none;
              padding: 4px 6px;
            }
            .totals-table tr.grand-total {
              border-top: 2px solid #111827;
              border-bottom: 2px solid #111827;
              font-weight: 800;
              font-size: 13px;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-top: 50px;
              padding-top: 10px;
              text-align: center;
            }
            .sig-line {
              border-top: 1px dashed #9ca3af;
              padding-top: 6px;
              font-size: 10px;
              font-weight: 600;
              color: #4b5563;
            }
            .tender-badge {
              display: inline-block;
              padding: 2px 6px;
              background-color: #e5e7eb;
              border-radius: 3px;
              font-size: 10px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Supplier Payment Voucher</h1>
            <p class="subtitle">Official Trade Disbursement Receipt</p>
          </div>

          <div class="meta-grid">
            <div>
              <div class="meta-row">
                <span class="label">Voucher No:</span>
                <span class="val">${receiptData.receiptNo}</span>
              </div>
              <div class="meta-row">
                <span class="label">Payment Date:</span>
                <span class="val">${receiptData.paymentDate}</span>
              </div>
              <div class="meta-row">
                <span class="label">Payment Method:</span>
                <span class="val">${receiptData.paymentMode}</span>
              </div>
            </div>
            <div>
              <div class="meta-row">
                <span class="label">Supplier Name:</span>
                <span class="val">${receiptData.supplierName}</span>
              </div>
              <div class="meta-row">
                <span class="label">Phone:</span>
                <span class="val">${receiptData.supplierPhone || "-"}</span>
              </div>
              ${
                receiptData.bankDetails
                  ? `
                <div class="meta-row">
                  <span class="label">Bank Info:</span>
                  <span class="val">${receiptData.bankDetails.bankName || "Bank"} (${receiptData.bankDetails.accountNumber || ""})</span>
                </div>`
                  : receiptData.mfsDetails
                  ? `
                <div class="meta-row">
                  <span class="label">MFS Wallet:</span>
                  <span class="val">${receiptData.mfsDetails.mfsName || "MFS"} (${receiptData.mfsDetails.mfsPhone || ""})</span>
                </div>`
                  : ""
              }
            </div>
          </div>

          ${
            receiptData.allocations.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">SL</th>
                  <th>Purchase Invoice No</th>
                  <th class="text-right">Paid Amount (৳)</th>
                  <th class="text-right">Discount (৳)</th>
                  <th class="text-right">Remaining Due (৳)</th>
                </tr>
              </thead>
              <tbody>
                ${receiptData.allocations
                  .map(
                    (item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td style="font-weight: 700;">${item.invoiceNo}</td>
                    <td class="text-right" style="font-weight: 700;">৳ ${formatMoney(item.paidAmount)}</td>
                    <td class="text-right">৳ ${formatMoney(item.discountAmount || 0)}</td>
                    <td class="text-right">৳ ${formatMoney(item.dueAmount)}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`
              : `<p style="text-align: center; color: #6b7280; padding: 12px 0;">Advance / General Account Payment</p>`
          }

          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td class="label">Paid Amount:</td>
                <td class="text-right" style="font-weight: 700;">৳ ${formatMoney(receiptData.totalAmount)}</td>
              </tr>
              ${
                (receiptData.totalDiscount || 0) > 0
                  ? `
                <tr>
                  <td class="label">Discount Availed:</td>
                  <td class="text-right" style="font-weight: 700; color: #b45309;">৳ ${formatMoney(receiptData.totalDiscount || 0)}</td>
                </tr>`
                  : ""
              }
              <tr class="grand-total">
                <td>Total Settled:</td>
                <td class="text-right">৳ ${formatMoney((receiptData.totalAmount || 0) + (receiptData.totalDiscount || 0))}</td>
              </tr>
            </table>
          </div>

          ${
            receiptData.remark
              ? `
            <div style="margin-bottom: 20px; padding: 6px 10px; background-color: #f9fafb; border-left: 3px solid #4b5563;">
              <span class="label">Remark: </span>
              <span>${receiptData.remark}</span>
            </div>`
              : ""
          }

          <div class="signatures">
            <div class="sig-line">Paid By</div>
            <div class="sig-line">Supplier / Receiver Signature</div>
            <div class="sig-line">Authorized By</div>
          </div>
        </body>
      </html>
    */

    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 15px; font-size: 11px; }
            .no-print { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 700; color: #111827; font-size: 10px; text-transform: uppercase; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    doc.close();

    doc.title = `Payment Voucher - ${receiptData.receiptNo}`;

    const container = doc.getElementById("print-root");
    if (container) {
      container.appendChild(content.cloneNode(true));
    }

    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.error("Print error:", err);
      }
    }, 300);
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Payment Voucher"
      onClose={onClose}
      width="w-full max-w-[620px]"
      className="!pt-2.5 !pb-3"
      headerClassName="!pb-1"
      bodyClassName="!mt-1.5"
    >
      <div className="space-y-2.5 text-xs">
        {/* Printable Preview Container */}
        <div
          ref={printAreaRef}
          className="p-3 bg-white border border-gray-200 rounded-lg space-y-2 shadow-xs"
        >
          {/* Header Banner */}
          <div className="text-center pb-2 border-b border-gray-200">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">
              Supplier Payment Voucher
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Official Trade Disbursement Voucher
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-md border border-gray-100 text-[11px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-medium">Voucher No:</span>
                <span className="font-bold text-gray-900">
                  {receiptData.receiptNo}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-medium">Payment Date:</span>
                <span className="font-medium text-gray-800">
                  {receiptData.paymentDate}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-medium">Payment Mode:</span>
                <span className="font-bold text-emerald-800">
                  {receiptData.paymentMode}
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1 truncate">
                <span className="text-gray-500 font-medium">Supplier:</span>
                <span className="font-bold text-gray-900 truncate">
                  {receiptData.supplierName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 font-medium">Phone:</span>
                <span className="font-medium text-gray-800">
                  {receiptData.supplierPhone || "-"}
                </span>
              </div>
              {receiptData.bankDetails && (
                <div className="flex items-center gap-1 truncate text-sky-900 font-medium text-[10px]">
                  <span>Bank: {receiptData.bankDetails.bankName}</span>
                  <span>({receiptData.bankDetails.accountNumber})</span>
                </div>
              )}
              {receiptData.mfsDetails && (
                <div className="flex items-center gap-1 truncate text-purple-900 font-medium text-[10px]">
                  <span>MFS: {receiptData.mfsDetails.mfsName}</span>
                  <span>({receiptData.mfsDetails.mfsPhone})</span>
                </div>
              )}
            </div>
          </div>

          {/* Allocation Table */}
          {receiptData.allocations.length > 0 && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[var(--table-header-bg,var(--primary-color))] text-[var(--table-header-text,var(--ui-on-accent,#ffffff))] font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-1 px-2 w-7">#</th>
                    <th className="py-1 px-2">Invoice No</th>
                    <th className="py-1 px-2 text-right">Paid (৳)</th>
                    <th className="py-1 px-2 text-right">Discount (৳)</th>
                    <th className="py-1 px-2 text-right">Remaining (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receiptData.allocations.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-1 px-2 text-gray-400 text-[10px]">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 font-bold text-gray-800">
                        {item.invoiceNo}
                      </td>
                      <td className="py-1 px-2 text-right font-bold text-emerald-700">
                        ৳ {formatMoney(item.paidAmount)}
                      </td>
                      <td className="py-1 px-2 text-right text-amber-700">
                        ৳ {formatMoney(item.discountAmount || 0)}
                      </td>
                      <td className="py-1 px-2 text-right text-gray-700">
                        ৳ {formatMoney(item.dueAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Box */}
          <div className="flex justify-end pt-1">
            <div className="w-56 space-y-1 text-xs">
              <div className="flex justify-between py-0.5 text-gray-600">
                <span>Paid Amount:</span>
                <span className="font-bold text-gray-900">
                  ৳ {formatMoney(receiptData.totalAmount)}
                </span>
              </div>
              {(receiptData.totalDiscount || 0) > 0 && (
                <div className="flex justify-between py-0.5 text-amber-800">
                  <span>Discount Availed:</span>
                  <span className="font-bold">
                    ৳ {formatMoney(receiptData.totalDiscount || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t border-gray-300 font-bold text-gray-900 text-sm">
                <span>Total Settled:</span>
                <span className="text-emerald-800 font-bold">
                  ৳ {formatMoney((receiptData.totalAmount || 0) + (receiptData.totalDiscount || 0))}
                </span>
              </div>
            </div>
          </div>

          {receiptData.remark && (
            <div className="p-1.5 bg-gray-50 rounded border border-gray-200 text-[11px] text-gray-600">
              <span className="font-bold text-gray-700">Note: </span>
              {receiptData.remark}
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 cursor-pointer bg-[var(--primary-color)]"
          >
            <FiPrinter size={13} />
            <span>Print Voucher</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentReceiptModal;
