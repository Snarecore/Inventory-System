import React, { useRef, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { SaleItem } from "@/types";
import { FaPrint, FaPhone, FaMapMarkerAlt, FaFileInvoice, FaCalendarAlt, FaUser, FaCheckCircle, FaClock, FaExclamationCircle } from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";
import { formatMoney } from "@/utils/formatters";
import moment from "moment";

interface SaleInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleItem | null;
  autoPrint?: boolean;
}

export const SaleInvoiceModal: React.FC<SaleInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  autoPrint = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();

  const s: any = sale || {};

  const rawDetails =
    s.salesDetails ||
    s.saleDetails ||
    s.details ||
    s.items ||
    s.products ||
    s.productsList ||
    [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(s.delivery_charge ?? s.deliveryCharge ?? s.transportCost ?? 0);
  const discount = Number(s.discount ?? s.discount_amount ?? s.discountAmount ?? 0);
  const vat = Number(s.vat ?? s.vat_amount ?? s.vatAmount ?? 0);
  const subtotal =
    Number(s.totalAmount ?? s.total_amount ?? 0) ||
    details.reduce((acc, item: any) => {
      const price = Number(item.sellPrice ?? item.sell_price ?? item.price ?? item.unitPrice ?? 0);
      const qty = Number(item.quantity ?? item.qty ?? 1);
      return acc + (Number(item.total) || price * qty);
    }, 0);

  const grandTotal = Number(s.grandTotal ?? s.grand_total ?? (subtotal - discount + vat + delivery));
  const paid = Number(s.paidAmount ?? s.paid_amount ?? s.cashReceived ?? 0);
  const due = Number(s.dueAmount ?? s.due_amount ?? Math.max(0, grandTotal - paid));

  const customerName = s.customerName || s.customer_name || s.partyName || "Walk-in Customer";
  const customerPhone = s.customerPhone || s.customer_phone || s.partyPhone;
  const customerAddress = s.customerAddress || s.customer_address || s.partyAddress;

  const rawStatus = String(s.status || "").toUpperCase();
  const isPaid = rawStatus === "PAID" || (due <= 0 && grandTotal > 0);
  const isPartial = rawStatus === "PARTIAL" || (due > 0 && paid > 0);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sales Invoice - ${s.invoiceNo || s.id}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { margin: 0; padding: 15px; font-family: sans-serif; background: #fff; }
                .no-print { display: none !important; }
                @page { margin: 10mm; size: auto; }
              }
            </style>
          </head>
          <body class="bg-white text-gray-900">
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen || !sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Invoice Details"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Printable Area */}
        <div ref={printRef} className="p-4 bg-white rounded-xl border border-gray-100 text-xs">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-200 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FaFileInvoice className="text-primary text-xl" />
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  {userInfo?.businessName || userInfo?.orgName || "Cash Boi Store"}
                </h2>
              </div>
              {userInfo?.phone && (
                <p className="text-gray-500 mt-1 flex items-center gap-1 text-[11px]">
                  <FaPhone size={9} /> {userInfo.phone}
                </p>
              )}
              {userInfo?.address && (
                <p className="text-gray-500 flex items-center gap-1 text-[11px]">
                  <FaMapMarkerAlt size={9} /> {userInfo.address}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block bg-primary/10 text-primary  font-bold px-2.5 py-1 rounded-md text-xs">
                {s.invoiceNo || s.invoice_no || `INV-${s.id}`}
              </div>
              <p className="text-gray-500 mt-1 flex items-center sm:justify-end gap-1 text-[11px]">
                <FaCalendarAlt size={9} />
                {s.salesDate || s.saleDate || s.date
                  ? moment(s.salesDate || s.saleDate || s.date).format("DD MMM, YYYY")
                  : moment().format("DD MMM, YYYY")}
              </p>
              <div className="mt-1">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <FaCheckCircle size={9} /> PAID
                  </span>
                ) : isPartial ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    <FaClock size={9} /> PARTIAL PAID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                    <FaExclamationCircle size={9} /> DUE / CREDIT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer and Payment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 p-3 bg-gray-50/80 rounded-xl border border-gray-200/80">
            <div>
              <span className="text-[10px] font-bold text-gray-400  tracking-wider block mb-1">
                Customer Information
              </span>
              <p className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <FaUser className="text-primary text-[10px]" />
                {customerName}
              </p>
              {customerPhone && (
                <p className="text-gray-600 text-[11px] mt-0.5">Phone: {customerPhone}</p>
              )}
              {customerAddress && (
                <p className="text-gray-500 text-[11px]">Address: {customerAddress}</p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold text-gray-400  tracking-wider block mb-1">
                Payment & Channel
              </span>
              <p className="font-semibold text-gray-800 text-xs">
                Method:{" "}
                <span className="text-primary font-black ">
                  {s.inv_type === "MULTI" || s.invType === "MULTI" || String(s.paymentType || s.payment_type).toLowerCase() === "multi"
                    ? "MULTI (SPLIT)"
                    : s.paymentType || s.payment_type || "CASH"}
                </span>
              </p>
              {Number(s.cashReceived || s.cash_amount) > 0 && (
                <p className="text-gray-600 text-[11px]">
                  Cash: ৳{formatMoney(Number(s.cashReceived || s.cash_amount))}
                </p>
              )}
              {s.bankName && (
                <p className="text-gray-600 text-[11px]">
                  Bank: {s.bankName} {Number(s.cardReceived || s.bankAmount || s.bank_amount) > 0 ? `(৳${formatMoney(Number(s.cardReceived || s.bankAmount || s.bank_amount))})` : `(${s.accountNo || ""})`}
                </p>
              )}
              {s.mfsName && (
                <p className="text-gray-600 text-[11px]">
                  MFS: {s.mfsName} {Number(s.mfsReceived || s.mfsAmount || s.mfs_amount) > 0 ? `(৳${formatMoney(Number(s.mfsReceived || s.mfsAmount || s.mfs_amount))})` : ""}
                  {(s.mfsPhone || s.mfsPhoneNumber) ? ` – ${s.mfsPhone || s.mfsPhoneNumber}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl my-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[10px]  tracking-wider">
                <tr>
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2.5">Product</th>
                  <th className="py-2 px-2.5 text-center">Unit</th>
                  <th className="py-2 px-2.5 text-center">Qty</th>
                  <th className="py-2 px-2.5 text-right">Price (৳)</th>
                  <th className="py-2 px-2.5 text-right">Disc/VAT</th>
                  <th className="py-2 px-2.5 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {details.length > 0 ? (
                  details.map((item: any, idx: number) => {
                    const price = Number(item.sellPrice ?? item.sell_price ?? item.price ?? item.unitPrice ?? 0);
                    const qty = Number(item.quantity ?? item.qty ?? 1);
                    const lineVat = Number(item.vat ?? 0);
                    const lineDisc = Number(item.discount ?? 0);
                    const itemTotal = Number(item.total ?? (price * qty + lineVat - lineDisc));

                    return (
                      <tr key={idx} className="hover:bg-gray-50/60">
                        <td className="py-1.5 px-2.5 text-gray-400">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <span className="font-bold text-gray-800 block">
                            {item.productName || item.name || "Product"}
                          </span>
                          {(item.productCode || item.pcode) && (
                            <span className="text-[9px] text-gray-400 ">
                              Code: {item.productCode || item.pcode}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-gray-600">
                          {item.unit || "pcs"}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-gray-900">
                          {qty}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-gray-700">
                          {formatMoney(price)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-gray-500 text-[10px]">
                          {lineDisc > 0 ? `-${formatMoney(lineDisc)}` : ""}{" "}
                          {lineVat > 0 ? `+${formatMoney(lineVat)}` : "-"}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-black text-gray-900">
                          ৳ {formatMoney(itemTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400">
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Calculation */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pt-1">
            <div className="text-[11px] text-gray-500 max-w-xs">
              {s.note || s.notes || s.remarks ? (
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-bold text-gray-700 block mb-0.5">Notes / Remarks:</span>
                  <p className="text-gray-800 font-medium whitespace-pre-wrap">{s.note || s.notes || s.remarks}</p>
                </div>
              ) : null}
              <div className="mt-2 text-[10px] text-gray-400">
                <p>Thank you for your business!</p>
              </div>
            </div>

            <div className="w-full sm:w-60 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold text-gray-900">৳ {formatMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>- ৳ {formatMoney(discount)}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>VAT:</span>
                  <span>+ ৳ {formatMoney(vat)}</span>
                </div>
              )}
              {delivery > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charge:</span>
                  <span>+ ৳ {formatMoney(delivery)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 pt-1 text-xs font-bold text-gray-900">
                <span>Grand Total:</span>
                <span className="text-primary font-black">৳ {formatMoney(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid Amount:</span>
                <span>৳ {formatMoney(paid)}</span>
              </div>
              {due > 0 && (
                <div className="flex justify-between text-rose-600 font-black">
                  <span>Due Amount:</span>
                  <span>৳ {formatMoney(due)}</span>
                </div>
              )}
              {Number(s.customerPaid || 0) > grandTotal && (
                <div className="flex justify-between text-blue-600 font-medium text-[10px] pt-0.5 border-t border-dashed border-gray-200">
                  <span>Handover Given:</span>
                  <span>৳ {formatMoney(Number(s.customerPaid))}</span>
                </div>
              )}
              {Number(s.returnAmount || 0) > 0 && (
                <div className="flex justify-between text-gray-600 font-medium text-[10px]">
                  <span>Change Return:</span>
                  <span>৳ {formatMoney(Number(s.returnAmount))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <Button
            type="button"
            variant="primary"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <FaPrint size={13} />
            <span>Print Invoice</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SaleInvoiceModal;
