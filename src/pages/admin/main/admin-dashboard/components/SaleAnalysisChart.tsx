import React, { useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FiGrid } from 'react-icons/fi';
import moment from 'moment';
import type { SaleItem } from '@/types';
import { SalesTimeframe } from '../types/dashboard.types';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);

const hoverLine = {
  id: 'hoverLineSale',
  afterDatasetsDraw(chart: any) {
    const { ctx, tooltip, chartArea } = chart;
    const active = tooltip?.getActiveElements?.() || [];
    if (!active.length) return;
    const x = active[0].element.x;
    const y = active[0].element.y;

    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = '#009fe3';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

interface SaleAnalysisChartProps {
  sales: SaleItem[];
}

export const SaleAnalysisChart: React.FC<SaleAnalysisChartProps> = ({ sales }) => {
  const chartRef = useRef(null);
  const [timeframe, setTimeframe] = useState<SalesTimeframe>('daily');

  const points = useMemo(() => {
    const now = moment();
    const buckets = new Map<string, { sales: number; orders: number; sort: number }>();
    const addSale = (sale: SaleItem, label: string, sort: number) => {
      const current = buckets.get(label) || { sales: 0, orders: 0, sort };
      current.sales += Number(sale.grandTotal) || 0;
      current.orders += 1;
      buckets.set(label, current);
    };

    sales.forEach((sale) => {
      const rawDate =
        sale.salesDate ||
        sale.saleDate ||
        sale.sales_date ||
        sale.date ||
        sale.createdAt ||
        sale.created_at;
      const date = moment(rawDate);
      if (!date.isValid()) return;

      if (timeframe === 'daily' && date.isSame(now, 'day')) {
        const hour = date.hour();
        const label = date.format('h:00 A');
        addSale(sale, label, hour);
      } else if (timeframe === 'weekly' && date.isBetween(moment(now).subtract(6, 'days').startOf('day'), now, 'day', '[]')) {
        const label = date.format('ddd');
        addSale(sale, label, date.startOf('day').valueOf());
      } else if (timeframe === 'monthly' && date.isSame(now, 'month')) {
        const week = Math.ceil(date.date() / 7);
        addSale(sale, `Week ${week}`, week);
      }
    });

    return [...buckets.entries()]
      .sort((a, b) => a[1].sort - b[1].sort)
      .map(([label, point]) => ({ label, ...point }));
  }, [sales, timeframe]);

  const labels = points.map((point) => point.label);
  const values = points.map((point) => point.sales);
  const totalSales = points.reduce((sum, point) => sum + point.sales, 0);
  const totalOrders = points.reduce((sum, point) => sum + point.orders, 0);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Sales',
          data: values,
          tension: 0.35,
          borderColor: '#009fe3',
          borderWidth: 3.5,
          pointRadius: 4,
          pointHoverRadius: 5,
          pointBorderWidth: 3,
          pointHoverBorderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#009fe3',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#009fe3',
          fill: true,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(0,159,227,0.15)';
            const grad = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            grad.addColorStop(0, 'rgba(0,159,227,0.03)');
            grad.addColorStop(1, 'rgba(0,159,227,0.22)');
            return grad;
          },
        },
      ],
    }),
    [labels, values]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          backgroundColor: '#111827',
          titleColor: '#D1D5DB',
          bodyColor: '#FFFFFF',
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            title: () => 'Sale Amount',
            label: (ctx: any) => `৳${Number(ctx.parsed.y).toLocaleString('en-IN')}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6B7280', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(17,24,39,0.06)',
          },
          ticks: {
            color: '#9CA3AF',
            font: { size: 11 },
            callback: (value: any) => {
              const num = Number(value);
              if (num >= 100000) return `৳${(num / 100000).toFixed(1)}L`;
              if (num >= 1000) return `৳${(num / 1000).toFixed(0)}k`;
              return `৳${num}`;
            },
          },
          suggestedMax: Math.max(0, ...values) * 1.15,
        },
      },
    }),
    [values]
  );

  return (
    <div className="premium-panel w-full h-full p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xl font-bold flex items-center gap-2.5">
            <span className="bg-[var(--primary-color-light)] text-[var(--primary-color)] p-1.5 rounded-full">
              <FiGrid size={18} />
            </span>
            Sale Analysis
          </p>

          {/* Timeframe Selector Tabs */}
          <div className="flex items-center bg-[var(--ui-surface-sunken)] p-1 rounded-lg gap-1">
            {(['daily', 'weekly', 'monthly'] as SalesTimeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[var(--primary-color)] text-white shadow-sm'
                    : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-[var(--ui-border)] mb-3"></div>

        {/* Existing Stat Boxes style */}
        <div className="flex gap-4 mb-3">
          <div className="text-sm border border-[var(--ui-border)] rounded-lg p-2.5 min-w-44">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary-color)]"></span>
              <span className="text-xs text-[var(--ui-text-muted)]">
                Total {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Sale
              </span>
            </div>
            <p className="font-bold text-lg ml-4 mt-0.5">৳{totalSales.toLocaleString('en-IN')}</p>
          </div>

          <div className="text-sm border border-[var(--ui-border)] rounded-lg p-2.5 min-w-44">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary-color-muted)]"></span>
              <span className="text-xs text-[var(--ui-text-muted)]">Total Orders</span>
            </div>
            <p className="font-bold text-lg ml-4 mt-0.5">{totalOrders}</p>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[260px] flex-1 min-h-[240px]">
        <Line ref={chartRef} data={data} options={options} plugins={[hoverLine]} />
      </div>
    </div>
  );
};

export default SaleAnalysisChart;
