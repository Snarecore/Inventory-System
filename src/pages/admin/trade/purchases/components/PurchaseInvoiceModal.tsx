import React, { useRef } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { PurchaseItem } from "@/types";
import { FaPrint, FaDownload, FaBuilding, FaUserTie, FaPhone, FaMapMarkerAlt, FaFileInvoice, FaTruck, FaCalendarAlt } from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";

interface PurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseItem | null;
}

const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchase,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();

  if (!purchase) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Invoice - ${purchase.invoiceNo || "Invoice"}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #111827; font-size: 12px; line-height: 1.4; padding: 0; margin: 0; }
            .invoice-box { max-width: 100%; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #009fe3; padding-bottom: 8px; margin-bottom: 12px; }
            .company-title { font-size: 18px; font-weight: bold; color: #009fe3; }
            .invoice-title { font-size: 20px; font-weight: bold; text-align: right; color: #1f2937; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 12px; }
            .card-info { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
            .info-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { background: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
            td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-table { width: 300px; margin-left: auto; margin-top: 8px; }
            .total-table td { padding: 4px 8px; }
            .grand-total { font-weight: bold; font-size: 13px; background: #f0f9ff; color: #0369a1; }
            .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; }
            .sign-box { border-top: 1px dashed #9ca3af; width: 150px; text-align: center; padding-top: 4px; font-size: 11px; color: #4b5563; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatMoney = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const details = purchase.purchaseDetails || [];
  const subtotal = Number(purchase.totalAmount) || details.reduce((acc, item) => acc + (Number(item.total) || (Number(item.buyPrice || 0) * Number(item.quantity || 1))), 0);
  const discount = Number(purchase.discount) || 0;
  const vat = Number(purchase.vat) || 0;
  const delivery = Number(purchase.delivery_charge || purchase.transportCost) || 0;
  const grandTotal = Number(purchase.grandTotal) || (subtotal - discount + vat + delivery);
  const paid = Number(purchase.paidAmount) || 0;
  const due = Number(purchase.dueAmount ?? (grandTotal - paid));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Invoice - ${purchase.invoiceNo || "INV"}`}
      maxWidth="w-full max-w-[800px]"
      footerButtons={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
              Payment: {purchase.paymentType || "CASH"}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                due <= 0
                  ? "bg-emerald-100 text-emerald-800"
                  : paid > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              Status: {purchase.status || (due <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "DUE")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <Button
              label="Print Invoice"
              onClick={handlePrint}
              color="#009fe3"
              hoverColor="#0085be"
              icon={<FaPrint className="text-white text-xs" />}
            />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Printable View Container */}
        <div ref={printRef} className="p-3 sm:p-4 bg-white border border-gray-200 rounded-lg text-xs text-gray-800">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[var(--color-primary)] pb-3 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--color-primary)]">
                {userInfo?.businessName || userInfo?.organizationName || "Cash Boi Inventory"}
              </h2>
              <p className="text-[11px] text-gray-500">
                Phone: {userInfo?.phone || userInfo?.phoneNumber || "N/A"}
              </p>
              <p className="text-[11px] text-gray-500">
                Branch: {userInfo?.branchName || `Branch #${userInfo?.branchId || 1}`}
              </p>
            </div>
            <div className="sm:text-right">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-tight">
                Purchase Invoice
              </h1>
              <p className="text-xs font-medium text-gray-700">
                Invoice #: <span className="font-semibold">{purchase.invoiceNo || "N/A"}</span>
              </p>
              <p className="text-[11px] text-gray-500">
                Date: {purchase.purchaseDate || purchase.created_at || purchase.createdAt || "N/A"}
              </p>
              {purchase.challanNo && (
                <p className="text-[11px] text-gray-500">
                  Challan Ref: <span className="font-medium text-gray-700">{purchase.challanNo}</span>
                </p>
              )}
            </div>
          </div>

          {/* Supplier and Challan Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
            <div className="bg-gray-50 p-2.5 rounded-md border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Supplier Information
              </span>
              <p className="font-bold text-gray-900 text-xs">{purchase.supplierName || "Direct Supplier"}</p>
              {purchase.supplierPhone && (
                <p className="text-gray-600 text-[11px] flex items-center gap-1.5 mt-0.5">
                  <FaPhone size={10} className="text-gray-400" /> {purchase.supplierPhone}
                </p>
              )}
              {purchase.supplierAddress && (
                <p className="text-gray-600 text-[11px] flex items-center gap-1.5 mt-0.5">
                  <FaMapMarkerAlt size={10} className="text-gray-400" /> {purchase.supplierAddress}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-2.5 rounded-md border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Logistics & Transport
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div>
                  <span className="text-gray-500">Vehicle No:</span>{" "}
                  <span className="font-medium text-gray-800">{purchase.vehicleNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Driver:</span>{" "}
                  <span className="font-medium text-gray-800">{purchase.driverName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Driver Phone:</span>{" "}
                  <span className="font-medium text-gray-800">{purchase.driverPhone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Transport:</span>{" "}
                  <span className="font-medium text-gray-800">৳ {formatMoney(delivery)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto my-2 border border-gray-200 rounded-md">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-1.5 px-2 text-center w-8">#</th>
                  <th className="py-1.5 px-2">Item Description</th>
                  <th className="py-1.5 px-2 text-center">Unit</th>
                  <th className="py-1.5 px-2 text-right">Buy Price</th>
                  <th className="py-1.5 px-2 text-center">Qty</th>
                  <th className="py-1.5 px-2 text-right">Discount</th>
                  <th className="py-1.5 px-2 text-right">VAT</th>
                  <th className="py-1.5 px-2 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {details.length > 0 ? (
                  details.map((item, idx) => {
                    const itemPrice = Number(item.buyPrice || item.price || 0);
                    const itemQty = Number(item.quantity || item.qty || 1);
                    const itemDisc = Number(item.discount || 0);
                    const itemVat = Number(item.vat || 0);
                    const itemTotal = Number(item.total || itemPrice * itemQty - itemDisc + itemVat);

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-1.5 px-2 text-center text-gray-500">{idx + 1}</td>
                        <td className="py-1.5 px-2">
                          <span className="font-semibold text-gray-900 block">{item.productName || "Product"}</span>
                          {(item.pcode || item.productCode) && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              Code: {item.pcode || item.productCode}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center text-gray-600">{item.unit || "pcs"}</td>
                        <td className="py-1.5 px-2 text-right font-mono">৳ {formatMoney(itemPrice)}</td>
                        <td className="py-1.5 px-2 text-center font-semibold">{itemQty}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600 font-mono">৳ {formatMoney(itemDisc)}</td>
                        <td className="py-1.5 px-2 text-right text-gray-600 font-mono">৳ {formatMoney(itemVat)}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-gray-900 font-mono">
                          ৳ {formatMoney(itemTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-400">
                      No line items recorded for this purchase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mt-3">
            <div className="text-[11px] text-gray-600 max-w-sm">
              {purchase.note && (
                <div className="bg-amber-50 p-2 rounded border border-amber-200">
                  <span className="font-semibold text-amber-800 block">Note / Instructions:</span>
                  <p className="text-amber-900 mt-0.5">{purchase.note}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 bg-gray-50 p-2.5 rounded-md border border-gray-200 text-xs">
              <div className="flex justify-between py-1 text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono text-right">৳ {formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-rose-600">
                  <span>Discount:</span>
                  <span className="font-mono text-right">- ৳ {formatMoney(discount)}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between py-1 text-gray-600">
                  <span>VAT / Tax:</span>
                  <span className="font-mono text-right">+ ৳ {formatMoney(vat)}</span>
                </div>
              )}
              {delivery > 0 && (
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Transport / Freight:</span>
                  <span className="font-mono text-right">+ ৳ {formatMoney(delivery)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-t border-gray-300 font-bold text-sm text-[var(--color-primary)]">
                <span>Grand Total:</span>
                <span className="font-mono text-right">৳ {formatMoney(grandTotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-700 font-semibold border-t border-gray-200">
                <span>Paid Amount:</span>
                <span className="font-mono text-right">৳ {formatMoney(paid)}</span>
              </div>
              <div className={`flex justify-between py-1 font-bold border-t border-gray-200 ${due > 0 ? "text-rose-600" : "text-gray-600"}`}>
                <span>Due Balance:</span>
                <span className="font-mono text-right">৳ {formatMoney(due)}</span>
              </div>
            </div>
          </div>

          {/* Signature Footer */}
          <div className="hidden sm:flex justify-between items-center mt-12 pt-4 border-t border-dashed border-gray-300 text-[11px] text-gray-500">
            <div className="text-center w-36 border-t border-gray-400 pt-1">
              Received By
            </div>
            <div className="text-center w-36 border-t border-gray-400 pt-1">
              Store In-Charge
            </div>
            <div className="text-center w-36 border-t border-gray-400 pt-1">
              Authorized Signature
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseInvoiceModal;
