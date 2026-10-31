import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { FiGrid } from 'react-icons/fi';
import type { AssetAnalysisData } from '../types/dashboard.types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AssetAnalysisChartProps {
  data: AssetAnalysisData;
}

export const AssetAnalysisChart: React.FC<AssetAnalysisChartProps> = ({ data: assetData }) => {
  const chartColors = assetData.breakdown.map((item) => item.color);

  const chartData = assetData.breakdown.map((item) => item.amount);
  const chartLabels = assetData.breakdown.map((item) => item.category);

  const data = {
    labels: chartLabels,
    datasets: [
      {
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 8,
        spacing: 4,
        hoverOffset: 12,
      },
    ],
  };

  const options = {
    cutout: '55%',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 4,
    },
    animation: {
      animateRotate: true,
      duration: 1000,
      easing: 'easeInOutQuad' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return ` ৳${Number(context.raw).toLocaleString('en-IN')}`;
          },
        },
        displayColors: false,
      },
    },
    hover: {
      mode: 'nearest' as const,
      animationDuration: 400,
    },
  };

  const legendItems = assetData.breakdown.map((item, idx) => ({
    label: item.category,
    value: item.amount,
    color: chartColors[idx % chartColors.length],
  }));

  return (
    <div className="premium-panel w-full h-full p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="bg-[var(--primary-color-light)] text-[var(--primary-color)] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Asset Analysis</p>
        </div>

        <div className="border-b border-[var(--ui-border)] mb-3"></div>
      </div>

      <div className="flex items-center justify-between gap-4 my-auto py-1">
        <div className="h-36 w-36 sm:h-38 sm:w-38 shrink-0">
          <Doughnut data={data} options={options} />
        </div>

        <div className="space-y-2 flex-1">
          {legendItems.map((item, index: number) => (
            <div key={index} className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="font-medium text-[var(--ui-text)]">{item.label}</span>
              </div>
              <div className="text-sm font-bold text-[var(--ui-text)] ml-4">
                ৳{item.value.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-[var(--ui-text)]">Asset Summary</p>
        <div className="border border-[var(--ui-border)] mt-1.5 rounded-lg text-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-3 py-1.5">
            <p className="flex items-center gap-2 text-[var(--ui-text-muted)]">
              <span className="w-2 h-2 rounded-full inline-block bg-[var(--ui-text)]"></span>
              Total Assets
            </p>
            <p className="font-semibold text-[var(--ui-text)]">৳{assetData.totalAsset.toLocaleString('en-IN')}</p>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="flex items-center gap-2 text-[var(--ui-text-muted)]">
              <span className="w-2 h-2 rounded-full inline-block bg-[var(--ui-success)]"></span>
              Liquid Assets (Cash + Bank)
            </p>
            <p className="font-semibold text-[var(--ui-text)]">
              ৳{((assetData.breakdown[0]?.amount || 0) + (assetData.breakdown[3]?.amount || 0)).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAnalysisChart;
