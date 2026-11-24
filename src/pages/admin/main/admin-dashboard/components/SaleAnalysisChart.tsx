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
import { SalesTimeframe, SalesTimeframeData } from '../types/dashboard.types';

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
  data?: Record<SalesTimeframe, SalesTimeframeData>;
}

export const SaleAnalysisChart: React.FC<SaleAnalysisChartProps> = ({ data: propData }) => {
  const chartRef = useRef(null);
  const [timeframe, setTimeframe] = useState<SalesTimeframe>('daily');

  const currentData = propData?.[timeframe] ?? {
    summary: { total: 0, average: 0 },
    points: [],
  };

  const hasPoints = Array.isArray(currentData.points) && currentData.points.length > 0;
  const labels = hasPoints ? currentData.points.map((p) => p.label) : ['No Data'];
  const values = hasPoints ? currentData.points.map((p) => p.sales) : [0];
  const totalSales = currentData.summary?.total ?? 0;
  const totalOrders = (currentData.points || []).reduce((acc, p) => acc + (p.orders || 0), 0);

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
          suggestedMax: Math.max(100, ...(values.length ? values : [0])) * 1.15,
        },
      },
    }),
    [values]
  );

  return (
    <div className="w-full h-full bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xl font-bold flex items-center gap-2.5">
            <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
              <FiGrid size={18} />
            </span>
            Sale Analysis
          </p>

          {/* Timeframe Selector Tabs */}
          <div className="flex items-center bg-[#f0f4f8] p-1 rounded-lg gap-1">
            {(['daily', 'weekly', 'monthly'] as SalesTimeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#009fe3] text-white shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-gray-200 mb-3"></div>

        {/* Existing Stat Boxes style */}
        <div className="flex gap-4 mb-3">
          <div className="text-sm border border-gray-200 rounded-lg p-2.5 min-w-44">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#009fe3]"></span>
              <span className="text-xs text-gray-600">
                Total {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Sale
              </span>
            </div>
            <p className="font-bold text-lg ml-4 mt-0.5">৳{totalSales.toLocaleString('en-IN')}</p>
          </div>

          <div className="text-sm border border-gray-200 rounded-lg p-2.5 min-w-44">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#bfe7f7]"></span>
              <span className="text-xs text-gray-600">Total Orders</span>
            </div>
            <p className="font-bold text-lg ml-4 mt-0.5">{totalOrders}</p>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[260px] flex-1 min-h-[240px]">
        {hasPoints ? (
          <Line ref={chartRef} data={data} options={options} plugins={[hoverLine]} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl text-gray-400 p-6">
            <p className="text-sm font-semibold text-gray-600">No {timeframe} sales points recorded</p>
            <p className="text-xs text-gray-400 mt-1">
              Select &ldquo;Weekly&rdquo; or &ldquo;Monthly&rdquo; above to view sales analytics
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleAnalysisChart;
