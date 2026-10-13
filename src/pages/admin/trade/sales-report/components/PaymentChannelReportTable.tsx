import React, { useMemo } from "react";
import {
  FaMoneyBillWave,
  FaMobileAlt,
  FaUniversity,
  FaHandHoldingUsd,
  FaFileExcel,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import * as XLSX from "xlsx";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import moment from "moment";
import type { SaleItem } from "@/types";

interface PaymentChannelReportTableProps {
  transactions: SaleItem[];
}

export const PaymentChannelReportTable: React.FC<PaymentChannelReportTableProps> = ({
  transactions,
}) => {
  const channelData = useMemo(() => {
    let cashCount = 0;
    let cashVolume = 0;

    let mfsBkashCount = 0;
    let mfsBkashVolume = 0;

    let mfsNagadCount = 0;
    let mfsNagadVolume = 0;

    let bankCount = 0;
    let bankVolume = 0;

    let creditCount = 0;
    let creditVolume = 0;

    transactions.forEach((tx: any) => {
      const p = String(tx.paymentType || tx.payment_type || "CASH").toUpperCase();
      const mfsName = String(tx.mfsName || "").toLowerCase();
      const gt = Number(tx.grandTotal ?? tx.grand_total ?? tx.totalAmount ?? 0);
      const paid = Number(tx.paidAmount ?? tx.paid_amount ?? 0);
      const due = Number(tx.dueAmount ?? tx.due_amount ?? Math.max(0, gt - paid));

      if (p === "CASH") {
        cashCount += 1;
        cashVolume += paid;
      } else if (p === "MFS" || p === "BKASH" || p === "NAGAD") {
        if (mfsName.includes("nagad")) {
          mfsNagadCount += 1;
          mfsNagadVolume += paid;
        } else {
          mfsBkashCount += 1;
          mfsBkashVolume += paid;
        }
      } else if (p === "BANK" || p === "CARD") {
        bankCount += 1;
        bankVolume += paid;
      }

      if (due > 0 || p === "CREDIT") {
        creditCount += 1;
        creditVolume += due;
      }
    });

    const totalCollected =
      cashVolume + mfsBkashVolume + mfsNagadVolume + bankVolume;

    return [
      {
        channel: "Cash Register (ক্যাশ ড্রয়ার)",
        method: "Counter Cash",
        type: "Liquid Cash",
        count: cashCount,
        volume: cashVolume,
        sharePct:
          totalCollected > 0
            ? Math.round((cashVolume / totalCollected) * 100)
            : 0,
        icon: FaMoneyBillWave,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      },
      {
        channel: "bKash Merchant / Personal",
        method: "MFS Mobile Wallet",
        type: "Digital Wallet",
        count: mfsBkashCount,
        volume: mfsBkashVolume,
        sharePct:
          totalCollected > 0
            ? Math.round((mfsBkashVolume / totalCollected) * 100)
            : 0,
        icon: FaMobileAlt,
        color: "text-pink-600 bg-pink-50 border-pink-200",
      },
      {
        channel: "Nagad Gateway / QR",
        method: "MFS Mobile Wallet",
        type: "Digital Wallet",
        count: mfsNagadCount,
        volume: mfsNagadVolume,
        sharePct:
          totalCollected > 0
            ? Math.round((mfsNagadVolume / totalCollected) * 100)
            : 0,
        icon: FaMobileAlt,
        color: "text-amber-600 bg-amber-50 border-amber-200",
      },
      {
        channel: "Bank Accounts & POS Cards",
        method: "BEFTN / Card / Cheque",
        type: "Direct Banking",
        count: bankCount,
        volume: bankVolume,
        sharePct:
          totalCollected > 0
            ? Math.round((bankVolume / totalCollected) * 100)
            : 0,
        icon: FaUniversity,
        color: "text-blue-600 bg-blue-50 border-blue-200",
      },
      {
        channel: "Credit Receivables (বকেয়া লেজার)",
        method: "Customer Due",
        type: "Outstanding",
        count: creditCount,
        volume: creditVolume,
        sharePct: 0,
        icon: FaHandHoldingUsd,
        color: "text-rose-600 bg-rose-50 border-rose-200",
      },
    ];
  }, [transactions]);

  const handleExport = () => {
    try {
      const data = channelData.map((c, idx) => ({
        "SL": idx + 1,
        "Channel": c.channel,
        "Method": c.method,
        "Type": c.type,
        "Transactions Count": c.count,
        "Total Realized (BDT)": c.volume,
        "Share of Collections": `${c.sharePct}%`,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payment Channels");
      XLSX.writeFile(
        wb,
        `Payment_Channels_Report_${moment().format("YYYY-MM-DD")}.xlsx`
      );
      showSuccessToast("Payment channel report exported successfully");
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
      {/* Header bar */}
      <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <FaMoneyBillWave size={14} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              Payment Channel Reconciliation (পেমেন্ট চ্যানেল হিসাব)
            </h3>
            <p className="text-[10px] text-gray-500">
              Distribution of incoming revenue by payment rail and credit ledger
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shrink-0 self-end sm:self-auto"
        >
          <FaFileExcel className="text-emerald-600" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
              <th className="py-2.5 px-3 text-center w-10">SL</th>
              <th className="py-2.5 px-3">Payment Channel</th>
              <th className="py-2.5 px-3">Transfer Method</th>
              <th className="py-2.5 px-3 text-center">Invoices / Txns</th>
              <th className="py-2.5 px-3 text-right">Realized Amount</th>
              <th className="py-2.5 px-3 text-right">Share of Realized</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
            {channelData.map((item, idx) => {
              const Icon = item.icon;
              const isDue = item.type === "Outstanding";

              return (
                <tr
                  key={item.channel + idx}
                  className="hover:bg-sky-50/40 transition-colors"
                >
                  <td className="py-2.5 px-3 text-center text-gray-700 font-semibold text-xs">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${item.color}`}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs">
                          {item.channel}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-gray-700 text-xs">
                    {item.method}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-gray-800 text-xs">
                    {item.count}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black whitespace-nowrap text-xs">
                    <span
                      className={
                        isDue ? "text-rose-600" : "text-emerald-600"
                      }
                    >
                      ৳ {formatMoney(item.volume)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {!isDue ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-gray-700 text-[11px]">
                          {item.sharePct}%
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, item.sharePct)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[10px]">N/A (Due)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        isDue
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isDue ? "Receivable" : "Settled"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentChannelReportTable;
