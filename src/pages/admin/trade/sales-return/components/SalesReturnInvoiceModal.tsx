import React, { useRef, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import type { SalesReturnItem } from "@/types";
import {
  FaPrint,
  FaPhone,
  FaMapMarkerAlt,
  FaUndoAlt,
  FaCalendarAlt,
  FaUser,
  FaCheckCircle,
  FaFileInvoice,
} from "react-icons/fa";
import { getUserInfo } from "@/utils/auth-storage";
import { formatMoney } from "@/utils/formatters";
import moment from "moment";

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

  const customerName = r.customerName || "Customer";
  const customerPhone = r.customerPhone || "-";
  const customerAddress = r.customerAddress || "-";

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

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Return Receipt - ${r.returnNo || "RET"}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 12px; font-family: system-ui, -apple-system, sans-serif; }
              @page { size: auto; margin: 8mm; }
            }
          </style>
        </head>
        <body class="bg-white text-gray-900 text-sm">
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
      title={`Sales Return Slip: ${r.returnNo || ""}`}
      width="max-w-3xl"
    >
      <div className="flex flex-col gap-3">
        {/* Printable Paper Canvas */}
        <div
          ref={printRef}
          className="bg-white p-5 sm:p-7 border rounded-xl shadow-xs text-gray-800"
        >
          {/* Top Header: Business Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#009fe3]">
                  {userInfo?.businessName || userInfo?.name || "Cash-Boi ERP"}
                </span>
                <span className="text-[10px]  font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Credit Note
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {userInfo?.address || "Enterprise Commercial ERP System"}
              </p>
              <p className="text-xs text-gray-500">
                Phone: {userInfo?.phone || "017XXXXXXXX"} | Business Code: {userInfo?.businessCode || "1001"}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-xs border border-rose-200 mb-1">
                <FaUndoAlt className="text-xs" />
                <span>SALES RETURN VOUCHER</span>
              </div>
              <p className="text-xs font-semibold text-gray-700">
                Voucher No: <span className=" text-gray-900">{r.returnNo}</span>
              </p>
              <p className="text-xs text-gray-500 flex items-center sm:justify-end gap-1 mt-0.5">
                <FaCalendarAlt className="text-[10px]" />
                {moment(r.returnDate || r.createdAt).format("DD MMM, YYYY")}
              </p>
            </div>
          </div>

          {/* Reference & Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-3.5 bg-gray-50 rounded-lg text-xs">
            <div>
              <p className="text-[10px]  font-bold text-gray-400 tracking-wider mb-1">
                Customer Information
              </p>
              <div className="flex items-center gap-1.5 font-bold text-gray-800 text-sm">
                <FaUser className="text-[#009fe3] text-xs" />
                <span>{customerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 mt-1">
                <FaPhone className="text-gray-400 text-[10px]" />
                <span>{customerPhone}</span>
              </div>
              {customerAddress && customerAddress !== "-" && (
                <div className="flex items-center gap-1.5 text-gray-600 mt-0.5">
                  <FaMapMarkerAlt className="text-gray-400 text-[10px]" />
                  <span>{customerAddress}</span>
                </div>
              )}
            </div>

            <div className="sm:border-l sm:border-gray-200 sm:pl-4">
              <p className="text-[10px]  font-bold text-gray-400 tracking-wider mb-1">
                Reference & Settlement
              </p>
              <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                <FaFileInvoice className="text-amber-500 text-xs" />
                <span>Original Invoice: </span>
                <span className=" text-[#009fe3]">
                  {r.salesInvoiceNo || r.invoiceNo || "N/A"}
                </span>
                {r.orderNo && (
                  <span className="ml-1 text-gray-500  text-[11px]">
                    (Order: {r.orderNo})
                  </span>
                )}
              </div>
              <div className="mt-1 text-gray-600">
                <span>Payment / Refund Type: </span>
                <span className="font-bold text-gray-800 ">
                  {r.paymentType || "CASH"}
                </span>
              </div>
              <div className="mt-0.5 text-gray-600">
                <span>Status: </span>
                <span className="font-semibold text-emerald-600">
                  {r.status || "Completed"}
                </span>
              </div>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <th className="py-2 px-3 text-center w-10">SL</th>
                  <th className="py-2 px-3">Product Description</th>
                  <th className="py-2 px-3 text-center">Unit Price</th>
                  <th className="py-2 px-3 text-center">Return Qty</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {details.map((item: any, idx: number) => {
                  const qty = Number(item.quantity ?? item.returnQuantity ?? 1);
                  const price = Number(item.sellPrice ?? 0);
                  const lineTotal = Number(item.total ?? (qty * price));

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3 text-center  text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-gray-800">
                          {item.productName || "Product"}
                        </div>
                        {item.productCode && (
                          <span className="text-[10px] text-gray-400 ">
                            Code: {item.productCode}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center ">
                        ৳ {formatMoney(price)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900">
                        {qty} {item.unit || "pcs"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900 ">
                        ৳ {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes and Amount Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="text-xs">
              {(r.note || r.remarks || (r as any).reason) && (
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 mb-2">
                  <span className="font-semibold text-gray-700">Return Reason / Note:</span>
                  <p className="text-gray-600 mt-0.5">{r.note || r.remarks || (r as any).reason}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                <FaCheckCircle className="text-xs" />
                <span>Returned items re-stocked into inventory.</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
                <span>Total Amount:</span>
                <span className="font-semibold ">৳ {formatMoney(totalAmount)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between py-1 text-rose-600 border-b border-gray-100">
                  <span>Discount:</span>
                  <span className="font-semibold ">- ৳ {formatMoney(discount)}</span>
                </div>
              )}

              {vat > 0 && (
                <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
                  <span>VAT:</span>
                  <span className="font-semibold ">+ ৳ {formatMoney(vat)}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 text-sm font-bold text-rose-700 bg-rose-50 px-2.5 rounded-lg">
                <span>Refund Amount:</span>
                <span className="">৳ {formatMoney(refundAmount)}</span>
              </div>

              {/* Multi-channel Refund Disbursement Breakdown */}
              {(Number(r.cashReceived || 0) > 0 ||
                Number(r.cardReceived || 0) > 0 ||
                Number(r.mfsReceived || 0) > 0 ||
                Number(r.dueAmount || 0) > 0) && (
                <div className="mt-1 pt-1.5 border-t border-gray-100 flex flex-col gap-0.5 text-[11px] text-gray-600">
                  <span className="font-semibold text-gray-700">Settlement Breakdown:</span>
                  {Number(r.cashReceived || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>• Cash Refund:</span>
                      <strong className=" text-emerald-700">৳ {formatMoney(Number(r.cashReceived))}</strong>
                    </div>
                  )}
                  {Number(r.cardReceived || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>• Bank Refund ({r.bankName || "Bank"}):</span>
                      <strong className=" text-sky-700">৳ {formatMoney(Number(r.cardReceived))}</strong>
                    </div>
                  )}
                  {Number(r.mfsReceived || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>• MFS Refund ({r.mfsName || "MFS"}):</span>
                      <strong className=" text-purple-700">৳ {formatMoney(Number(r.mfsReceived))}</strong>
                    </div>
                  )}
                  {Number(r.dueAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>• Due Adjusted:</span>
                      <strong className=" text-rose-600">৳ {formatMoney(Number(r.dueAmount))}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 text-center text-xs text-gray-500 border-t border-dashed border-gray-300">
            <div>
              <div className="w-32 mx-auto border-t border-gray-400 mb-1"></div>
              <span>Customer Signature</span>
            </div>
            <div>
              <div className="w-32 mx-auto border-t border-gray-400 mb-1"></div>
              <span>Authorized Officer</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            label="Close"
            onClick={onClose}
            color="#e2e8f0"
            hoverColor="#cbd5e1"
            textColor="#334155"
          />
          <Button
            label="Print"
            onClick={handlePrint}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPrint className="text-white text-xs" />}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SalesReturnInvoiceModal;
