import React from "react";
import { FaPrint } from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import { formatMoney } from "@/utils/formatters";
import { getUserInfo } from "@/utils/auth-storage";

export interface CollectionReceiptData {
  receiptNo: string;
  collectionDate: string;
  customerName: string;
  customerPhone: string;
  customerId: string | number;
  totalAmount: number;
  paymentMode: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  } | null;
  mfsDetails?: {
    mfsName?: string;
    mfsPhone?: string;
  } | null;
  remark?: string;
  allocations: {
    invoiceNo: string;
    paidAmount: number;
    dueAmount: number;
  }[];
  businessName?: string;
  businessPhone?: string;
}

interface CollectionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: CollectionReceiptData | null;
}

export const CollectionReceiptModal: React.FC<CollectionReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptData,
}) => {
  const userInfo = getUserInfo();

  if (!isOpen || !receiptData) return null;

  const businessName =
    receiptData.businessName ||
    userInfo?.businessName ||
    "Cash-Boi Business";
  const businessPhone =
    receiptData.businessPhone || userInfo?.phone || userInfo?.phoneNumber || "";

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Money Receipt (কালেকশন রসিদ)"
      onClose={onClose}
      width="w-full max-w-lg"
      footerButtons={
        <div className="flex items-center gap-2 print:hidden">
          <Button
            label="Close"
            onClick={onClose}
            type="button"
            color="#6b7280"
            hoverColor="#4b5563"
            buttonClass="!text-xs !py-1.5 !px-3.5"
          />
          <Button
            label="Print Receipt"
            onClick={handlePrint}
            type="button"
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            icon={<FaPrint className="text-white text-xs" />}
            buttonClass="!text-xs !py-1.5 !px-3.5 font-semibold"
          />
        </div>
      }
    >
      <div className="space-y-4 text-xs text-black py-1 print:p-0">
        {/* Receipt Header */}
        <div className="text-center border-b border-gray-200 pb-3">
          <h2 className="text-base font-bold text-black uppercase">
            {businessName}
          </h2>
          {businessPhone && (
            <p className="text-[11px] text-gray-500 font-medium">
              Phone: {businessPhone}
            </p>
          )}
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-sky-50 text-[var(--color-primary)] font-semibold text-[11px] border border-sky-200">
            Payment Collection Receipt
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50/70 border border-gray-200 rounded-lg text-xs">
          <div>
            <span className="text-gray-500 text-[10px] block">Customer Details</span>
            <span className="font-semibold text-black block">{receiptData.customerName}</span>
            <span className="text-gray-600 text-[11px] block">Phone: {receiptData.customerPhone || "-"}</span>
            <span className="text-gray-500 text-[10px] block">ID: {receiptData.customerId}</span>
          </div>

          <div className="text-right">
            <span className="text-gray-500 text-[10px] block">Receipt Info</span>
            <span className="font-semibold text-black block">#{receiptData.receiptNo}</span>
            <span className="text-gray-600 text-[11px] block">Date: {receiptData.collectionDate}</span>
            <span className="text-sky-700 font-semibold text-[11px] block">
              Method: {receiptData.paymentMode}
            </span>
          </div>
        </div>

        {/* Bank Detail row if applicable */}
        {receiptData.paymentMode === "Bank" && receiptData.bankDetails && (
          <div className="p-2 rounded bg-sky-50/50 border border-sky-100 text-xs flex justify-between">
            <span className="text-gray-600">Bank Account:</span>
            <span className="font-semibold text-black font-mono">
              {receiptData.bankDetails.bankName} - {receiptData.bankDetails.accountNumber}
            </span>
          </div>
        )}

        {/* MFS Detail row if applicable */}
        {receiptData.paymentMode === "MFS" && receiptData.mfsDetails && (
          <div className="p-2 rounded bg-purple-50/60 border border-purple-200 text-xs flex justify-between">
            <span className="text-gray-600">MFS Wallet:</span>
            <span className="font-semibold text-purple-900 font-mono">
              {receiptData.mfsDetails.mfsName}
              {receiptData.mfsDetails.mfsPhone ? ` - ${receiptData.mfsDetails.mfsPhone}` : ""}
            </span>
          </div>
        )}

        {/* Total Amount Received Strip */}
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <span className="font-semibold text-emerald-900 text-xs uppercase">
            Total Received:
          </span>
          <span className="text-base font-bold text-emerald-700 font-mono">
            ৳ {formatMoney(receiptData.totalAmount)}
          </span>
        </div>

        {/* Invoices Breakdown Table */}
        {receiptData.allocations.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#41BEF3] text-black font-semibold">
                <tr>
                  <th className="py-2 px-2.5">Invoice No</th>
                  <th className="py-2 px-2.5 text-right">Amount Paid (৳)</th>
                  <th className="py-2 px-2.5 text-right">Remaining Due (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {receiptData.allocations.map((a) => (
                  <tr key={a.invoiceNo} className="hover:bg-sky-50/20">
                    <td className="py-1.5 px-2.5 text-black font-medium">
                      {a.invoiceNo}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-700">
                      {formatMoney(a.paidAmount)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-gray-600">
                      {formatMoney(a.dueAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Remark */}
        {receiptData.remark && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
            <span className="font-semibold text-black">Remark: </span>
            <span>{receiptData.remark}</span>
          </div>
        )}

        {/* Signature Lines */}
        <div className="pt-6 grid grid-cols-2 gap-6 text-center text-xs">
          <div>
            <div className="border-t border-gray-300 pt-1 text-gray-600">
              Customer Signature
            </div>
          </div>
          <div>
            <div className="border-t border-gray-300 pt-1 text-black font-semibold">
              Authorized Signature
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CollectionReceiptModal;
