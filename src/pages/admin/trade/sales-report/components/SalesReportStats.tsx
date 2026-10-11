import React from "react";
import {
  FaChartLine,
  FaMoneyBillWave,
  FaHandHoldingUsd,
  FaReceipt,
  FaBoxes,
  FaWallet,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";

interface SalesReportStatsProps {
  totalSalesVolume: number;
  totalCollected: number;
  totalDue: number;
  totalInvoices: number;
  cashCollected?: number;
  mfsCollected?: number;
  bankCollected?: number;
  totalDiscount?: number;
  totalQuantitySold?: number;
  unpaidCount?: number;
}

export const SalesReportStats: React.FC<SalesReportStatsProps> = ({
  totalSalesVolume,
  totalCollected,
  totalDue,
  totalInvoices,
  cashCollected = 0,
  mfsCollected = 0,
  bankCollected = 0,
  totalDiscount = 0,
  totalQuantitySold = 0,
  unpaidCount = 0,
}) => {
  const collectionRate =
    totalSalesVolume > 0
      ? Math.min(100, Math.round((totalCollected / totalSalesVolume) * 100))
      : 100;

  const avgOrderValue =
    totalInvoices > 0 ? Math.round(totalSalesVolume / totalInvoices) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      {/* 1. Total Sales Volume */}
      <div className="bg-white rounded-xl p-3.5 border border-sky-100 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Total Sales Volume
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#009fe3] mt-1">
              ৳ {formatMoney(totalSalesVolume)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50 text-[#009fe3] border border-sky-100">
            <FaChartLine size={18} />
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
          <span>
            Discount Given:{" "}
            <span className="font-bold text-rose-600">
              ৳ {formatMoney(totalDiscount)}
            </span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-[#009fe3] font-semibold text-[10px]">
            Gross Rev
          </span>
        </div>
      </div>

      {/* 2. Total Net Collections */}
      <div className="bg-white rounded-xl p-3.5 border border-emerald-100 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Net Collections
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              ৳ {formatMoney(totalCollected)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <FaMoneyBillWave size={18} />
          </div>
        </div>

        {/* Breakdown chips */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 text-gray-700 font-semibold border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Cash: ৳{formatMoney(cashCollected)}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            MFS: ৳{formatMoney(mfsCollected)}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Bank: ৳{formatMoney(bankCollected)}
          </span>
        </div>
      </div>

      {/* 3. Outstanding Receivables / Due */}
      <div className="bg-white rounded-xl p-3.5 border border-rose-100 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Outstanding Due
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
              ৳ {formatMoney(totalDue)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <FaHandHoldingUsd size={18} />
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-gray-600">
            <span>Collected Rate:</span>
            <span className="font-bold text-emerald-600">{collectionRate}%</span>
          </div>
          {unpaidCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
              {unpaidCount} Invoices Due
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
              All Paid
            </span>
          )}
        </div>
      </div>

      {/* 4. Orders, Invoices & AOV */}
      <div className="bg-white rounded-xl p-3.5 border border-indigo-100 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Invoices & Avg Value
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
              {totalInvoices}{" "}
              <span className="text-xs font-semibold text-gray-500">
                Invoices
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <FaReceipt size={18} />
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
          <span>
            Avg Order (AOV):{" "}
            <span className="font-bold text-indigo-900">
              ৳ {formatMoney(avgOrderValue)}
            </span>
          </span>
          {totalQuantitySold > 0 && (
            <span className="flex items-center gap-1 font-semibold text-gray-700">
              <FaBoxes className="text-indigo-500" size={10} />
              {totalQuantitySold} pcs
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReportStats;
