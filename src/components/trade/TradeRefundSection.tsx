import React from "react";
import { FaMoneyBillWave, FaCreditCard, FaMobileAlt, FaWallet, FaLock } from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import type { UseTradeRefundReturn } from "@/hooks/useTradeRefund";
import type { TradePaymentAccount } from "@/hooks/useTradePayment";

export interface TradeRefundSectionProps {
  refund: UseTradeRefundReturn;
  refundAmount: number;
  registeredBankAccounts: TradePaymentAccount[];
  registeredMfsAccounts: TradePaymentAccount[];
  title?: string;
}

export const TradeRefundSection: React.FC<TradeRefundSectionProps> = ({
  refund,
  refundAmount,
  registeredBankAccounts,
  registeredMfsAccounts,
  title = "Refund Settlement",
}) => {
  const {
    numRefundCash,
    numRefundBank,
    numRefundMfs,
    numRefundDue,
    selectedRefundBankId,
    selectedRefundMfsId,
    origDueAmount,
    totalRefundAllocated,
    refundDifference,
  } = refund;

  return (
    <>
      {/* Header & View-Only Status */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-[11px] font-bold text-black tracking-wider flex items-center gap-1.5">
          <FaWallet size={11} className="text-black" />
          {title}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-black border border-gray-200 select-none">
          <FaLock size={8} className="text-black" />
          Auto-filled (View Only)
        </span>
      </div>

      {/* Payment Breakdown Cards - Display Only */}
      <div className="flex flex-col gap-1.5">
        {/* 1. Cash Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
            numRefundCash > 0
              ? "border-emerald-400 bg-emerald-50/30"
              : "border-gray-200 bg-gray-50/40 opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                numRefundCash > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-black"
              }`}
            >
              <FaMoneyBillWave size={11} />
            </div>
            <span className="font-bold text-[11px] text-black tracking-wider">CASH</span>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              numRefundCash > 0
                ? "border-emerald-500 bg-white"
                : "border-gray-200 bg-gray-100/70"
            }`}
          >
            <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
              {numRefundCash > 0 ? "৳" : "—"}
            </span>
            <input
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="N/A"
              value={numRefundCash > 0 ? numRefundCash.toString() : "N/A"}
              className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
            />
          </div>
        </div>

        {/* 2. Bank Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
            numRefundBank > 0
              ? "border-sky-400 bg-sky-50/30"
              : "border-gray-200 bg-gray-50/40 opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                numRefundBank > 0
                  ? "bg-sky-100 text-sky-700"
                  : "bg-gray-100 text-black"
              }`}
            >
              <FaCreditCard size={11} />
            </div>
            <span className="font-bold text-[11px] text-black tracking-wider shrink-0">BANK</span>
            <select
              disabled
              value={selectedRefundBankId}
              className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-200 rounded bg-gray-50 text-black font-normal cursor-not-allowed truncate select-none"
            >
              <option value="" className="text-black font-normal">
                {numRefundBank > 0 ? "Bank Account" : "N/A"}
              </option>
              {registeredBankAccounts.map((b) => (
                <option key={b.id || b.bankId || b._id} value={b.id || b.bankId || b._id} className="text-black">
                  {b.bankName || b.name}
                  {b.accountNo || b.bankAccountNumber || b.bankAccountNo
                    ? ` – ${b.accountNo || b.bankAccountNumber || b.bankAccountNo}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              numRefundBank > 0
                ? "border-sky-500 bg-white"
                : "border-gray-200 bg-gray-100/70"
            }`}
          >
            <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
              {numRefundBank > 0 ? "৳" : "—"}
            </span>
            <input
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="N/A"
              value={numRefundBank > 0 ? numRefundBank.toString() : "N/A"}
              className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
            />
          </div>
        </div>

        {/* 3. MFS Card */}
        <div
          className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
            numRefundMfs > 0
              ? "border-purple-400 bg-purple-50/30"
              : "border-gray-200 bg-gray-50/40 opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                numRefundMfs > 0
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-black"
              }`}
            >
              <FaMobileAlt size={11} />
            </div>
            <span className="font-bold text-[11px] text-black tracking-wider shrink-0">MFS</span>
            <select
              disabled
              value={selectedRefundMfsId}
              className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-200 rounded bg-gray-50 text-black font-normal cursor-not-allowed truncate select-none"
            >
              <option value="" className="text-black font-normal">
                {numRefundMfs > 0 ? "MFS Account" : "N/A"}
              </option>
              {registeredMfsAccounts.map((m) => {
                const nameVal = m.name || m.mfsName || m.method || "MFS";
                const phoneVal = m.phoneNumber || m.mfsPhone || m.phone || "";
                return (
                  <option key={m.id || m.mfsId || m._id} value={m.id || m.mfsId || m._id} className="text-black">
                    {nameVal}
                    {phoneVal ? ` – ${phoneVal}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div
            className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
              numRefundMfs > 0
                ? "border-purple-500 bg-white"
                : "border-gray-200 bg-gray-100/70"
            }`}
          >
            <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
              {numRefundMfs > 0 ? "৳" : "—"}
            </span>
            <input
              type="text"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="N/A"
              value={numRefundMfs > 0 ? numRefundMfs.toString() : "N/A"}
              className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
            />
          </div>
        </div>

        {/* 4. Due / Credit Adjustment Row (if applicable) */}
        {(origDueAmount > 0 || numRefundDue > 0) && (
          <div
            className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
              numRefundDue > 0
                ? "border-rose-400 bg-rose-50/30"
                : "border-gray-200 bg-gray-50/40 opacity-70"
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold text-[11px] ${
                  numRefundDue > 0
                    ? "bg-rose-100 text-rose-700"
                    : "bg-gray-100 text-black"
                }`}
              >
                ৳
              </div>
              <div>
                <span className="font-bold text-[11px] text-black tracking-wider block leading-tight">
                  DUE ADJUST
                </span>
                <span className="text-[9.5px] text-black font-normal block leading-none">
                  Max: ৳{formatMoney(origDueAmount)}
                </span>
              </div>
            </div>

            <div
              className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                numRefundDue > 0
                  ? "border-rose-500 bg-white"
                  : "border-gray-200 bg-gray-100/70"
              }`}
            >
              <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                {numRefundDue > 0 ? "৳" : "—"}
              </span>
              <input
                type="text"
                readOnly
                disabled
                tabIndex={-1}
                placeholder="N/A"
                value={numRefundDue > 0 ? numRefundDue.toString() : "N/A"}
                className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
              />
            </div>
          </div>
        )}
      </div>

      {/* Financial Settlement Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-gray-200/90 pt-1.5 items-center">
        {/* Total Refunded Card with status badge */}
        <div className="bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200/90 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-[10.5px] font-bold text-emerald-950 tracking-wide">
              Total Refunded
            </span>
            <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
              {totalRefundAllocated >= refundAmount && refundAmount > 0
                ? "SETTLED"
                : totalRefundAllocated > 0
                ? "PARTIAL"
                : "UNALLOCATED"}
            </span>
          </div>
          <span className="text-xs sm:text-[13px] font-extrabold text-emerald-800">
            ৳ {formatMoney(totalRefundAllocated)}
          </span>
        </div>

        {/* Remaining to Refund / Due Balance Card */}
        <div
          className={`px-2.5 py-1 rounded-md border flex items-center justify-between transition-colors shadow-2xs ${
            refundDifference > 0.01
              ? "bg-rose-50/90 border-rose-200/90"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                refundDifference > 0.01 ? "bg-rose-600" : "bg-gray-400"
              }`}
            />
            <span
              className={`text-[10.5px] font-bold tracking-wide ${
                refundDifference > 0.01 ? "text-rose-950" : "text-gray-700"
              }`}
            >
              {refundDifference > 0.01 ? "Unallocated Balance" : "Due Balance"}
            </span>
            {refundDifference > 0.01 && (
              <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-800">
                PENDING
              </span>
            )}
          </div>
          <span
            className={`text-xs sm:text-[13px] font-extrabold ${
              refundDifference > 0.01 ? "text-rose-600" : "text-black"
            }`}
          >
            ৳ {formatMoney(refundDifference > 0.01 ? refundDifference : 0)}
          </span>
        </div>
      </div>
    </>
  );
};

export default TradeRefundSection;
