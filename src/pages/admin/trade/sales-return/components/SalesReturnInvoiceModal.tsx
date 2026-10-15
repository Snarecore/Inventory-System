import React, { useRef, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { SalesReturnItem } from "@/types";
import {
  FaPrint,
  FaPhone,
  FaMapMarkerAlt,
  FaUndoAlt,
  FaUser,
  FaCheckCircle,
} from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";
import { formatMoney } from "@/utils/formatters";
import moment from "moment";
import { getReturnReasonLabel } from "../constants/returnReasons";

interface SalesReturnInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnData: SalesReturnItem | null;
  autoPrint?: boolean;
}

export const SalesReturnInvoiceModal: React.FC<SalesReturnInvoiceModalProps> = ({
  isOpen,
  onClose,
  returnData,
  autoPrint = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const userInfo = getUserInfo();

  const r: any = returnData || {};
  const details: any[] = Array.isArray(r.returnDetails) ? r.returnDetails : [];

  const totalAmount = Number(r.totalAmount ?? r.grandTotal ?? 0);
  const discount = Number(r.discount ?? 0);
  const vat = Number(r.vat ?? 0);
  const deliveryCharge = Number(r.deliveryCharge ?? 0);
  const refundAmount = Number(r.refundAmount ?? r.grandTotal ?? (totalAmount - discount + vat + deliveryCharge));

  const customerName = r.customerName || "N/A";
  const customerPhone = r.customerPhone || "N/A";
  const customerAddress = r.customerAddress || "N/A";

  useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      alert("Please allow popups to print invoices");
      return;
    }

    const appStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Return Voucher - ${r?.returnNo || ""}</title>
          <meta charset="utf-8" />
          ${appStyles}
          <style>
            @media print {
              body { margin: 0; padding: 12px; font-family: system-ui, -apple-system, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              @page { size: auto; margin: 8mm; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; }
          </style>
        </head>
        <body class="bg-white text-black text-sm">
          ${printContent}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen || !returnData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="w-full max-w-3xl sm:max-w-3xl md:max-w-[760px]"
      width="w-full max-w-3xl"
      className="w-full max-w-3xl sm:w-[750px]"
    >
      <div className="flex flex-col gap-2 w-full min-w-0 sm:min-w-[650px]">
        {/* Printable Paper Canvas */}
        <div
          ref={printRef}
          className="bg-white p-3 sm:p-4 border border-gray-200/90 rounded-xl shadow-2xs text-black"
        >
          {/* Top Header: Business Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 pb-2 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-[#009fe3]">
                  {userInfo?.businessName || userInfo?.name || "Cash-Boi ERP"}
                </span>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                  Credit Note
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                {userInfo?.address || ""}
              </p>
              {(userInfo?.phone || userInfo?.businessCode) && (
                <p className="text-[11px] text-gray-500 leading-tight">
                  {[
                    userInfo?.phone && `Phone: ${userInfo.phone}`,
                    userInfo?.businessCode && `Business Code: ${userInfo.businessCode}`,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-md font-bold text-[11px] border border-rose-200 mb-0.5">
                <FaUndoAlt className="text-[10px]" />
                <span>SALES RETURN VOUCHER</span>
              </div>
              
              <p className="text-[11px] text-gray-500 flex items-center sm:justify-end gap-1 mt-0.5">
                {moment(r.returnDate || r.createdAt).format("DD MMM, YYYY")}
              </p>
            </div>
          </div>

          {/* Reference & Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 my-2 p-2 sm:p-2.5 bg-gray-50/80 border border-gray-200/80 rounded-lg text-xs">
            <div className="flex flex-col justify-center">
              <p className="text-[10px] font-bold text-black tracking-wider mb-0.5">
                Customer Information
              </p>
              <div className="flex items-center gap-1.5 font-bold text-black text-xs sm:text-[13px]">
                <FaUser className="text-[#009fe3] text-xs shrink-0" />
                <span className="truncate">{customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-black text-[11px] mt-0.5">
                <FaPhone className="text-black text-[10px] shrink-0" />
                <span>{customerPhone}</span>
              </div>
              {customerAddress && customerAddress !== "-" && (
                <div className="flex items-center gap-1.5 text-black text-[11px] mt-0.5">
                  <FaMapMarkerAlt className="text-black text-[10px] shrink-0" />
                  <span className="truncate">{customerAddress}</span>
                </div>
              )}
            </div>

            <div className="sm:border-l sm:border-gray-200/90 sm:pl-3 flex flex-col justify-center">
              <p className="text-[9.5px] font-bold text-black uppercase tracking-wider mb-0.5">
                Reference & Settlement
              </p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-black flex-wrap">
                {r.orderNo && (
                  <span className=" text-black text-[10.5px] font-medium">
                    Order #{r.orderNo}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-black">
                <span>Payment / Refund Type:</span>
                <span className="px-1.5 py-0.2 rounded font-bold text-[10.5px] bg-blue-50 text-blue-700 border border-blue-200">
                  {r.paymentType || "CASH"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-black">
                <span>Status:</span>
                <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] bg-emerald-100 text-emerald-800">
                  {r.status || "Completed"}
                </span>
              </div>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-2">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/80 text-black font-semibold border-b border-gray-200 text-[11px]">
                  <th className="py-1 px-2.5 text-center w-10">SL</th>
                  <th className="py-1 px-2.5">Product Description</th>
                  <th className="py-1 px-2.5 text-center">Unit Price</th>
                  <th className="py-1 px-2.5 text-center">Return Qty</th>
                  <th className="py-1 px-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {details.map((item: any, idx: number) => {
                  const qty = Number(item.quantity ?? item.returnQuantity ?? 1);
                  const price = Number(item.sellPrice ?? 0);
                  const lineTotal = Number(item.total ?? (qty * price));

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-1 px-2.5 text-center text-black font-normal">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2.5">
                        <div className="font-semibold text-black">
                          {item.productName || "Product"}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.productCode && (
                            <span className="text-[10px] text-black font-normal">
                              Code: {item.productCode}
                            </span>
                          )}
                          {(item.returnReason || item.reason) && (
                            <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                              Reason: {getReturnReasonLabel(item.returnReason || item.reason)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-2.5 text-center font-normal text-black">
                        ৳ {formatMoney(price)}
                      </td>
                      <td className="py-1 px-2.5 text-center font-bold text-black">
                        {qty} {item.unit || "pcs"}
                      </td>
                      <td className="py-1 px-2.5 text-right font-bold text-black">
                        ৳ {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes and Amount Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
            <div className="text-xs flex flex-col justify-between">
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100 mb-1.5">
                  <span className="font-semibold text-black text-[11px]">Return Reason / Note:</span>
                  <p className="text-[11px] mt-0.5 leading-snug text-black font-normal">
                    {r.note || r.remarks || (r as any).reason || "N/A"}
                  </p>
                </div>
              <div className="flex items-center gap-1.5 text-emerald-700 text-[10.5px] font-medium py-0.5">
                <FaCheckCircle className="text-xs shrink-0" />
                <span>Returned items re-stocked into inventory.</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between py-0.5 text-black border-b border-gray-100">
                <span>Total Amount:</span>
                <span className="font-semibold text-black">৳ {formatMoney(totalAmount)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between py-0.5 text-rose-600 border-b border-gray-100">
                  <span>Discount:</span>
                  <span className="font-semibold">- ৳ {formatMoney(discount)}</span>
                </div>
              )}

              {vat > 0 && (
                <div className="flex justify-between py-0.5 text-black border-b border-gray-100">
                  <span>VAT:</span>
                  <span className="font-semibold">+ ৳ {formatMoney(vat)}</span>
                </div>
              )}

              {deliveryCharge > 0 && (
                <div className="flex justify-between py-0.5 text-black border-b border-gray-100">
                  <span>Delivery Charge:</span>
                  <span className="font-semibold">+ ৳ {formatMoney(deliveryCharge)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 px-2.5 text-xs sm:text-[13px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md mt-0.5">
                <span>Refund Amount:</span>
                <span>৳ {formatMoney(refundAmount)}</span>
              </div>

              {/* Multi-channel Refund Disbursement Breakdown */}
              {(Number(r.cashReceived || 0) > 0 ||
                Number(r.cardReceived || 0) > 0 ||
                Number(r.mfsReceived || 0) > 0 ||
                Number(r.dueAmount || 0) > 0) && (
                <div className="mt-1 pt-1 border-t border-gray-100 flex flex-col gap-0.5 text-[10.5px] text-black">
                  <span className="font-semibold text-black">Settlement Breakdown:</span>
                  {Number(r.cashReceived || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Cash Refund:</span>
                      <strong className="text-emerald-700">৳ {formatMoney(Number(r.cashReceived))}</strong>
                    </div>
                  )}
                  {Number(r.cardReceived || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Bank Refund ({r.bankName || "Bank"}):</span>
                      <strong className="text-sky-700">৳ {formatMoney(Number(r.cardReceived))}</strong>
                    </div>
                  )}
                  {Number(r.mfsReceived || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>MFS Refund ({r.mfsName || "MFS"}):</span>
                      <strong className="text-purple-700">৳ {formatMoney(Number(r.mfsReceived))}</strong>
                    </div>
                  )}
                  {Number(r.dueAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>• Due Adjusted:</span>
                      <strong className="text-rose-600">৳ {formatMoney(Number(r.dueAmount))}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-3 mt-2 text-center text-[10.5px] text-gray-500 border-t border-dashed border-gray-300">
            <div>
              <div className="w-28 sm:w-32 mx-auto border-t border-gray-400 mb-0.5"></div>
              <span>Customer Signature</span>
            </div>
            <div>
              <div className="w-28 sm:w-32 mx-auto border-t border-gray-400 mb-0.5"></div>
              <span>Authorized Officer</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center px-4 py-1.5 text-xs font-semibold text-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 rounded-md transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#009fe3] hover:bg-[#0085be] active:scale-95 rounded-md transition-all cursor-pointer shadow-2xs"
          >
            <FaPrint size={12} />
            <span>Print</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SalesReturnInvoiceModal;
