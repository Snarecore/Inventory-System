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
import moment from 'moment';
import type { SaleItem } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface DashboardExpense {
  amount: number;
  date: string;
}

interface ProfitLossChartProps {
  sales: SaleItem[];
  expenses: DashboardExpense[];
}

export const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ sales, expenses }) => {
  // 'all' or specific month name like 'Mar 2026'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const isAllMonths = selectedMonth === 'all';
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const month = moment().subtract(5 - index, 'months');
      const monthKey = month.format('MMM YYYY');
      const monthSales = sales.filter((sale) => {
        const saleDate = moment(
          sale.salesDate ||
            sale.saleDate ||
            sale.sales_date ||
            sale.date ||
            sale.createdAt ||
            sale.created_at
        );
        return saleDate.isValid() && saleDate.isSame(month, 'month');
      });
      const monthExpenses = expenses.filter((expense) => {
        const expenseDate = moment(expense.date);
        return expenseDate.isValid() && expenseDate.isSame(month, 'month');
      });

      return {
        month: monthKey,
        income: monthSales.reduce((sum, sale) => sum + (Number(sale.grandTotal) || 0), 0),
        expense: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      };
    });
  }, [expenses, sales]);

  const currentMonthData = monthlyData.find((data) => data.month === selectedMonth);

  // Labels & datasets based on selection
  const { labels, incomeData, expenseData, totalIncome, totalExpense, totalNetProfit } = useMemo(() => {
    if (isAllMonths) {
      const lbls = monthlyData.map((data) => data.month);
      const inc = monthlyData.map((data) => data.income);
      const exp = monthlyData.map((data) => data.expense);
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
      const weeks = Array.from({ length: 5 }, (_, index) => ({
        week: `Week ${index + 1}`,
        income: 0,
        expense: 0,
      }));
      sales.forEach((sale) => {
        const saleDate = moment(
          sale.salesDate ||
            sale.saleDate ||
            sale.sales_date ||
            sale.date ||
            sale.createdAt ||
            sale.created_at
        );
        if (saleDate.isValid() && saleDate.format('MMM YYYY') === selectedMonth) {
          weeks[Math.ceil(saleDate.date() / 7) - 1].income += Number(sale.grandTotal) || 0;
        }
      });
      expenses.forEach((expense) => {
        const expenseDate = moment(expense.date);
        if (expenseDate.isValid() && expenseDate.format('MMM YYYY') === selectedMonth) {
          weeks[Math.ceil(expenseDate.date() / 7) - 1].expense += expense.amount;
        }
      });
      const lbls = weeks.map((week) => week.week);
      const inc = weeks.map((week) => week.income);
      const exp = weeks.map((week) => week.expense);
      const tInc = inc.reduce((sum, value) => sum + value, 0);
      const tExp = exp.reduce((sum, value) => sum + value, 0);
      return {
        labels: lbls,
        incomeData: inc,
        expenseData: exp,
        totalIncome: tInc,
        totalExpense: tExp,
        totalNetProfit: tInc - tExp,
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
  }, [currentMonthData, expenses, isAllMonths, monthlyData, sales, selectedMonth]);

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
    <div className="w-full h-full bg-[var(--ui-surface)] p-4 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        {/* Header with Title & Month Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <p className="text-xl font-bold flex items-center gap-2.5 text-[var(--ui-text)]">
            <span className="bg-[var(--primary-color-light)] text-[var(--primary-color)] p-1.5 rounded-full">
              <FiGrid size={18} />
            </span>
            Profit &amp; Loss {isAllMonths ? '(Last 6 Months)' : `- ${selectedMonth}`}
          </p>

          {/* Month Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 text-[var(--ui-text-subtle)] pointer-events-none text-xs">
                <FiCalendar size={13} />
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Filter profit & loss by month"
                className="pl-7 pr-8 py-1.5 bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] font-semibold text-xs rounded-lg border border-transparent hover:border-[var(--ui-border-strong)] focus:outline-none focus:border-[var(--primary-color)] cursor-pointer transition-all appearance-none"
              >
                <option value="all">All (Last 6 Months)</option>
                {monthlyData.map((d) => (
                  <option key={d.month} value={d.month}>
                    {d.month}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 pointer-events-none text-[var(--ui-text-subtle)] text-[10px]">
                ▼
              </div>
            </div>

            {!isAllMonths && (
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className="text-xs text-[var(--primary-color)] cursor-pointer font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-[var(--ui-border)] mb-3"></div>

        {/* Dynamic Metric Stat Boxes */}
        <div className="flex flex-wrap gap-4 mb-3">
          <div className="text-sm border border-[var(--ui-border)] rounded-lg p-2.5 flex-1 min-w-36">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary-color)]"></span>
              <span className="text-xs text-[var(--ui-text-muted)]">
                {isAllMonths ? '6M Total Income' : 'Monthly Income'}
              </span>
            </div>
            <p className="font-bold text-lg text-[var(--ui-text)] mt-1">
              ৳{totalIncome.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="text-sm border border-[var(--ui-border)] rounded-lg p-2.5 flex-1 min-w-36">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary-color-muted)]"></span>
              <span className="text-xs text-[var(--ui-text-muted)]">
                {isAllMonths ? '6M Total Expense' : 'Monthly Expense'}
              </span>
            </div>
            <p className="font-bold text-lg text-[var(--ui-text)] mt-1">
              ৳{totalExpense.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="text-sm border border-[var(--ui-border)] rounded-lg p-2.5 flex-1 min-w-36">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    totalNetProfit >= 0 ? 'bg-[var(--ui-success)]' : 'bg-[var(--ui-danger)]'
                  }`}
                ></span>
                <span className="text-xs text-[var(--ui-text-muted)]">
                  {totalNetProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                  totalNetProfit >= 0
                    ? 'text-[var(--ui-success)] bg-[var(--ui-success-light)] border-[var(--ui-success-border)]'
                    : 'text-[var(--ui-danger)] bg-[var(--ui-danger-light)] border-[var(--ui-danger-border)]'
                }`}
              >
                {totalNetProfit >= 0 ? `+${profitMargin}%` : `${profitMargin}%`}
              </span>
            </div>
            <p
              className={`font-bold text-lg mt-1 ${
                totalNetProfit >= 0 ? 'text-[var(--ui-success)]' : 'text-[var(--ui-danger)]'
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
