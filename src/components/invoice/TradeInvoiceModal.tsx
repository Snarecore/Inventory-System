import React, { useRef, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import {
  FaPrint,
  FaPhone,
  FaMapMarkerAlt,
  FaFileInvoice,
  FaTruck,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaUndoAlt,
} from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";
import { formatMoney } from "@/utils/formatters";
import moment from "moment";

export type TradeInvoiceType = "SALE" | "PURCHASE" | "SALES_RETURN" | "PURCHASE_RETURN";

export interface TradeInvoiceLineItem {
  id?: string | number;
  productName: string;
  productCode?: string;
  unit?: string;
  price: number;
  quantity: number;
  discount?: number;
  vat?: number;
  total: number;
  returnReason?: string;
  returnRemarks?: string;
}

export interface TradeInvoiceData {
  type: TradeInvoiceType;
  invoiceTitle?: string;
  invoiceNo: string;
  date?: string;
  status?: string;

  // Party
  partyTypeTitle?: string;
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;

  // Payment / Channel
  paymentMethod?: string;
  cashAmount?: number;
  bankName?: string;
  bankAmount?: number;
  accountNo?: string;
  mfsName?: string;
  mfsAmount?: number;
  mfsPhone?: string;
  customerPaid?: number;
  returnAmount?: number;

  // Logistics & Attachments
  challanNo?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  attachmentUrl?: string | null;

  // Items
  items: TradeInvoiceLineItem[];

  // Totals
  subtotal: number;
  discount?: number;
  vat?: number;
  deliveryCharge?: number;
  grandTotal: number;
  paidAmount?: number;
  dueAmount?: number;
  refundAmount?: number;
  previousDue?: number;
  totalDueWithCurrent?: number;

  notes?: string;
}

export interface TradeInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: TradeInvoiceData | null;
  autoPrint?: boolean;
}

export const TradeInvoiceModal: React.FC<TradeInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  autoPrint = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();

  const inv = invoice;
  const isReturn = inv?.type === "SALES_RETURN" || inv?.type === "PURCHASE_RETURN";
  const isPurchase = inv?.type === "PURCHASE";

  const defaultTitle =
    inv?.type === "SALE"
      ? "Sales Invoice Details"
      : inv?.type === "PURCHASE"
      ? "Purchase Invoice Details"
      : inv?.type === "SALES_RETURN"
      ? "Sales Return Invoice"
      : "Purchase Return Invoice";

  const modalTitle = inv?.invoiceTitle || defaultTitle;

  const rawStatus = String(inv?.status || "").toUpperCase();
  const due = Number(inv?.dueAmount ?? 0);
  const grandTotal = Number(inv?.grandTotal ?? 0);
  const paid = Number(inv?.paidAmount ?? 0);

  const isPaid = rawStatus === "PAID" || (due <= 0 && grandTotal > 0);
  const isPartial = rawStatus === "PARTIAL" || (due > 0 && paid > 0);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    const origin = window.location.origin;
    const appStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${modalTitle} - ${inv?.invoiceNo}</title>
          <meta charset="utf-8" />
          <base href="${origin}/" />
          ${appStyles}
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
            }
            @page {
              margin: 8mm;
              size: auto;
            }
            body {
              margin: 0;
              padding: 12px;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff !important;
              color: #111827;
            }
            .no-print {
              display: none !important;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
          </style>
        </head>
        <body class="bg-white text-gray-900">
          ${printContent}
          <script>
            function triggerPrint() {
              window.focus();
              window.print();
              window.onafterprint = function() {
                window.close();
              };
              setTimeout(function() {
                window.close();
              }, 1500);
            }
            if (document.readyState === 'complete') {
              setTimeout(triggerPrint, 150);
            } else {
              window.addEventListener('load', function() {
                setTimeout(triggerPrint, 150);
              });
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (isOpen && autoPrint && invoice) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, invoice]);

  if (!isOpen || !inv) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Printable Area */}
        <div ref={printRef} className="p-4 bg-white rounded-xl border border-gray-100 text-xs">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-gray-200 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                {isReturn ? (
                  <FaUndoAlt className="text-amber-600 text-xl" />
                ) : (
                  <FaFileInvoice className="text-primary text-xl" />
                )}
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  {userInfo?.businessName || userInfo?.orgName || "Cash Boi Store"}
                </h2>
              </div>
              <p className="text-gray-500 mt-1 flex items-center gap-1 text-[11px] flex-wrap">
                {[
                  userInfo?.phone ? `Phone: ${userInfo.phone}` : "",
                  userInfo?.businessCode ? `Business Code: ${userInfo.businessCode}` : "",
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              {userInfo?.address && (
                <p className="text-gray-500 flex items-center gap-1 text-[11px] mt-0.5">
                  <FaMapMarkerAlt size={9} /> {userInfo.address}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-md text-xs">
                {inv.invoiceNo}
              </div>
              <p className="text-gray-500 mt-1 flex items-center sm:justify-end gap-1 text-[11px]">
                <FaCalendarAlt size={9} />
                {inv.date ? moment(inv.date).format("DD MMM, YYYY") : moment().format("DD MMM, YYYY")}
              </p>
              {inv.challanNo && (
                <p className="text-gray-500 text-[10px] mt-0.5 font-medium sm:text-right">
                  Challan: <strong className="text-gray-700">{inv.challanNo}</strong>
                </p>
              )}
              <div className="mt-1">
                {isReturn ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                    <FaCheckCircle size={9} /> RETURN RECORDED
                  </span>
                ) : isPaid ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <FaCheckCircle size={9} /> PAID
                  </span>
                ) : isPartial ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                    <FaClock size={9} /> PARTIAL PAID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                    <FaExclamationCircle size={9} /> DUE / CREDIT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Party and Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 p-3 bg-gray-50/80 rounded-xl border border-gray-200/80">
            <div>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1">
                {inv.partyTypeTitle || (isPurchase ? "Supplier Information" : "Customer Information")}
              </span>
              <p className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <FaUser className="text-primary text-[10px]" />
                {inv.partyName || "N/A"}
              </p>
              {inv.partyPhone && (
                <p className="text-gray-600 text-[11px] mt-0.5">Phone: {inv.partyPhone}</p>
              )}
              {inv.partyAddress && (
                <p className="text-gray-500 text-[11px]">Address: {inv.partyAddress}</p>
              )}
            </div>

            {/* Right Card: Logistics (if purchase) OR Payment Breakdown */}
            <div className="sm:text-right">
              {inv.vehicleNo || inv.driverName ? (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1">
                    Logistics & Transport
                  </span>
                  {inv.vehicleNo && (
                    <p className="text-gray-700 text-[11px]">
                      Vehicle: <strong className="text-gray-900">{inv.vehicleNo}</strong>
                    </p>
                  )}
                  {inv.driverName && (
                    <p className="text-gray-700 text-[11px]">
                      Driver: <strong className="text-gray-900">{inv.driverName}</strong>
                      {inv.driverPhone ? ` (${inv.driverPhone})` : ""}
                    </p>
                  )}
                  {Number(inv.deliveryCharge ?? 0) > 0 && (
                    <p className="text-gray-700 text-[11px]">
                      Transport: <strong>৳{formatMoney(Number(inv.deliveryCharge))}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1">
                    Payment & Channel
                  </span>
                  <p className="font-semibold text-gray-800 text-xs">
                    Method:{" "}
                    <span className="text-primary font-black">
                      {inv.paymentMethod || "CASH"}
                    </span>
                  </p>
                  {Number(inv.cashAmount ?? 0) > 0 && (
                    <p className="text-gray-600 text-[11px]">
                      Cash: ৳{formatMoney(Number(inv.cashAmount))}
                    </p>
                  )}
                  {inv.bankName && (
                    <p className="text-gray-600 text-[11px]">
                      Bank: {inv.bankName}{" "}
                      {Number(inv.bankAmount ?? 0) > 0
                        ? `(৳${formatMoney(Number(inv.bankAmount))})`
                        : inv.accountNo
                        ? `(${inv.accountNo})`
                        : ""}
                    </p>
                  )}
                  {inv.mfsName && (
                    <p className="text-gray-600 text-[11px]">
                      MFS: {inv.mfsName}{" "}
                      {Number(inv.mfsAmount ?? 0) > 0
                        ? `(৳${formatMoney(Number(inv.mfsAmount))})`
                        : ""}
                      {inv.mfsPhone ? ` – ${inv.mfsPhone}` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl my-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[10px] tracking-wider">
                <tr>
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2.5">Product</th>
                  <th className="py-2 px-2.5 text-center">Unit</th>
                  <th className="py-2 px-2.5 text-center">Qty</th>
                  <th className="py-2 px-2.5 text-right">Price (৳)</th>
                  <th className="py-2 px-2.5 text-right">Disc/VAT</th>
                  {isReturn && <th className="py-2 px-2.5">Reason</th>}
                  <th className="py-2 px-2.5 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inv.items && inv.items.length > 0 ? (
                  inv.items.map((item, idx) => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const lineVat = Number(item.vat || 0);
                    const lineDisc = Number(item.discount || 0);
                    const itemTotal = Number(item.total || (price * qty + lineVat - lineDisc));

                    return (
                      <tr key={idx} className="hover:bg-gray-50/60">
                        <td className="py-1.5 px-2.5 text-gray-400">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <span className="font-bold text-gray-800 block">
                            {item.productName || "Product"}
                          </span>
                          {item.productCode && (
                            <span className="text-[9px] text-gray-400">
                              Code: {item.productCode}
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
                        {isReturn && (
                          <td className="py-1.5 px-2.5 text-gray-600 text-[10px]">
                            {item.returnReason && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-[9px] mb-0.5">
                                {item.returnReason}
                              </span>
                            )}
                            {item.returnRemarks && (
                              <span className="block text-gray-400 text-[9px] italic">
                                {item.returnRemarks}
                              </span>
                            )}
                          </td>
                        )}
                        <td className="py-1.5 px-2.5 text-right font-black text-gray-900">
                          ৳ {formatMoney(itemTotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isReturn ? 8 : 7} className="py-4 text-center text-gray-400">
                      No line items recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Calculation */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pt-1">
            <div className="text-[11px] text-gray-500 max-w-xs space-y-2">
              {inv.notes && (
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-bold text-gray-700 block mb-0.5">Notes / Remarks:</span>
                  <p className="text-gray-800 font-medium whitespace-pre-wrap">{inv.notes}</p>
                </div>
              )}
              {inv.attachmentUrl && (
                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="font-bold text-gray-700 block mb-1">Challan Attachment:</span>
                  <img
                    src={inv.attachmentUrl}
                    alt="Challan"
                    className="max-h-24 max-w-xs object-contain rounded border border-gray-300"
                  />
                </div>
              )}
              <div className="text-[10px] text-gray-400 pt-1">
                <p>Thank you for your business!</p>
              </div>
            </div>

            <div className="w-full sm:w-60 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold text-gray-900">৳ {formatMoney(inv.subtotal)}</span>
              </div>
              {Number(inv.discount ?? 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>- ৳ {formatMoney(Number(inv.discount))}</span>
                </div>
              )}
              {Number(inv.vat ?? 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>VAT:</span>
                  <span>+ ৳ {formatMoney(Number(inv.vat))}</span>
                </div>
              )}
              {Number(inv.deliveryCharge ?? 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery / Transport:</span>
                  <span>+ ৳ {formatMoney(Number(inv.deliveryCharge))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-300 pt-1 text-xs font-bold text-gray-900">
                <span>Grand Total:</span>
                <span className="text-primary font-black">৳ {formatMoney(inv.grandTotal)}</span>
              </div>

              {isReturn ? (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Refund Amount:</span>
                  <span>৳ {formatMoney(Number(inv.refundAmount ?? inv.grandTotal))}</span>
                </div>
              ) : (
                <>
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
                  {Number(inv.previousDue || 0) > 0 && (
                    <div className="flex justify-between text-amber-800 text-[11px] pt-0.5 border-t border-dashed border-gray-200">
                      <span>Previous Due:</span>
                      <span>৳ {formatMoney(Number(inv.previousDue))}</span>
                    </div>
                  )}
                  {Number(inv.previousDue || 0) > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold text-xs bg-rose-50 px-1.5 py-0.5 rounded">
                      <span>Total Balance Due:</span>
                      <span>৳ {formatMoney(due + Number(inv.previousDue))}</span>
                    </div>
                  )}
                  {Number(inv.customerPaid ?? 0) > grandTotal && (
                    <div className="flex justify-between text-blue-600 font-medium text-[10px] pt-0.5 border-t border-dashed border-gray-200">
                      <span>Handover Given:</span>
                      <span>৳ {formatMoney(Number(inv.customerPaid))}</span>
                    </div>
                  )}
                  {Number(inv.returnAmount ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-600 font-medium text-[10px]">
                      <span>Change Return:</span>
                      <span>৳ {formatMoney(Number(inv.returnAmount))}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Signatures section for print */}
          <div className="hidden print:flex justify-between items-end pt-12 mt-8 border-t border-dashed border-gray-300 text-[11px] text-gray-600">
            <div className="text-center w-36 border-t border-gray-400 pt-1 font-medium">
              {isPurchase ? "Supplier Signature" : "Customer Signature"}
            </div>
            <div className="text-center w-36 border-t border-gray-400 pt-1 font-medium">
              Prepared By
            </div>
            <div className="text-center w-36 border-t border-gray-400 pt-1 font-medium">
              Authorized Signature
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

export default TradeInvoiceModal;
