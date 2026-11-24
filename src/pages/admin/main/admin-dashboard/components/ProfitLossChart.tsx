import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiGrid, FiCalendar } from 'react-icons/fi';
import { MonthlyProfitLoss } from '../types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ProfitLossChartProps {
  data?: MonthlyProfitLoss[];
}

export const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ data: propData }) => {
  // 'all' or specific month name like 'Mar 2026'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const currentList =
    propData && Array.isArray(propData) && propData.length > 0
      ? propData
      : [];

  const isAllMonths = selectedMonth === 'all';
  const currentMonthData = useMemo(() => {
    return currentList.find((d) => d.month === selectedMonth);
  }, [selectedMonth, currentList]);

  // Labels & datasets based on selection
  const { labels, incomeData, expenseData, totalIncome, totalExpense, totalNetProfit } = useMemo(() => {
    if (isAllMonths) {
      const lbls = currentList.map((d) => d.month);
      const inc = currentList.map((d) => d.income);
      const exp = currentList.map((d) => d.expense);
      const tInc = inc.reduce((acc, v) => acc + v, 0);
      const tExp = exp.reduce((acc, v) => acc + v, 0);
      return {
        labels: lbls,
        incomeData: inc,
        expenseData: exp,
        totalIncome: tInc,
        totalExpense: tExp,
        totalNetProfit: tInc - tExp,
      };
    } else if (currentMonthData) {
      const lbls = (currentMonthData.weeks || []).map((w) => w.week);
      const inc = (currentMonthData.weeks || []).map((w) => w.income);
      const exp = (currentMonthData.weeks || []).map((w) => w.expense);
      return {
        labels: lbls,
        incomeData: inc,
        expenseData: exp,
        totalIncome: currentMonthData.income,
        totalExpense: currentMonthData.expense,
        totalNetProfit: currentMonthData.netProfit,
      };
    }
    return {
      labels: [],
      incomeData: [],
      expenseData: [],
      totalIncome: 0,
      totalExpense: 0,
      totalNetProfit: 0,
    };
  }, [isAllMonths, currentMonthData, currentList]);

  const profitMargin = totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) : '0';

  const data = {
    labels,
    datasets: [
      {
        label: 'Income / Sales',
        data: incomeData,
        backgroundColor: '#009fe3',
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Total Expenses',
        data: expenseData,
        backgroundColor: '#bfe7f7',
        borderRadius: 6,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 6,
        bottom: 6,
        left: 0,
        right: 0,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#111827',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return ` ${label}: ৳${Number(value).toLocaleString('en-IN')}`;
          },
          afterBody: (items: any[]) => {
            if (items.length >= 2) {
              const inc = items[0]?.parsed?.y || 0;
              const exp = items[1]?.parsed?.y || 0;
              const diff = inc - exp;
              if (diff >= 0) {
                return ` Net Profit: +৳${diff.toLocaleString('en-IN')}`;
              } else {
                return ` Net Loss: -৳${Math.abs(diff).toLocaleString('en-IN')}`;
              }
            }
            return '';
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            const num = Number(value);
            if (num >= 100000) return `৳${(num / 100000).toFixed(1)}L`;
            if (num >= 1000) return `৳${(num / 1000).toFixed(0)}k`;
            return `৳${num}`;
          },
          color: '#6B7280',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#F3F4F6',
        },
      },
    },
  };

  return (
    <div className="w-full h-full bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        {/* Header with Title & Month Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <p className="text-xl font-bold flex items-center gap-2.5 text-gray-800">
            <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
              <FiGrid size={18} />
            </span>
            Profit &amp; Loss {isAllMonths ? '(Last 6 Months)' : `- ${selectedMonth}`}
          </p>

          {/* Month Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 text-gray-400 pointer-events-none text-xs">
                <FiCalendar size={13} />
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter profit & loss by month"
                className="pl-7 pr-8 py-1.5 bg-[#f0f4f8] text-gray-700 font-semibold text-xs rounded-lg border border-transparent hover:border-gray-300 focus:outline-none focus:border-[#009fe3] cursor-pointer transition-all appearance-none"
              >
                <option value="all">All ({currentList.length} Months)</option>
                {currentList.map((d) => (
                  <option key={d.month} value={d.month}>
                    {d.month}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 pointer-events-none text-gray-400 text-[10px]">
                ▼
              </div>
            </div>

            {!isAllMonths && (
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className="text-xs text-[#009fe3] cursor-pointer font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200 mb-3"></div>

        {/* Dynamic Metric Stat Boxes */}
        <div className="flex flex-wrap gap-4 mb-3">
          <div className="text-sm border border-gray-200 rounded-lg p-2.5 flex-1 min-w-36">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#009fe3]"></span>
              <span className="text-xs text-gray-600">
                {isAllMonths ? '6M Total Income' : 'Monthly Income'}
              </span>
            </div>
            <p className="font-bold text-lg text-black mt-1">
              ৳{totalIncome.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="text-sm border border-gray-200 rounded-lg p-2.5 flex-1 min-w-36">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#bfe7f7]"></span>
              <span className="text-xs text-gray-600">
                {isAllMonths ? '6M Total Expense' : 'Monthly Expense'}
              </span>
            </div>
            <p className="font-bold text-lg text-black mt-1">
              ৳{totalExpense.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="text-sm border border-gray-200 rounded-lg p-2.5 flex-1 min-w-36">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    totalNetProfit >= 0 ? 'bg-[#28c76f]' : 'bg-[#ea5455]'
                  }`}
                ></span>
                <span className="text-xs text-gray-600">
                  {totalNetProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                  totalNetProfit >= 0
                    ? 'text-[#28c76f] bg-green-50 border-green-200'
                    : 'text-[#ea5455] bg-red-50 border-red-200'
                }`}
              >
                {totalNetProfit >= 0 ? `+${profitMargin}%` : `${profitMargin}%`}
              </span>
            </div>
            <p
              className={`font-bold text-lg mt-1 ${
                totalNetProfit >= 0 ? 'text-[#28c76f]' : 'text-[#ea5455]'
              }`}
            >
              {totalNetProfit >= 0
                ? `+৳${totalNetProfit.toLocaleString('en-IN')}`
                : `-৳${Math.abs(totalNetProfit).toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-[230px]">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default ProfitLossChart;
