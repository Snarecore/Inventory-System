import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { FiGrid } from 'react-icons/fi';
import { AssetAnalysisData } from '../types/dashboard.types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AssetAnalysisChartProps {
  data?: AssetAnalysisData;
}

export const AssetAnalysisChart: React.FC<AssetAnalysisChartProps> = ({ data: propData }) => {
  const defaultColors = ['#28c76f', '#009fe3', '#1b2850', '#ff9f43', '#7367f0'];

  const emptyAnalysis: AssetAnalysisData = {
    totalAsset: 0,
    breakdown: [
      { category: 'Bank Balance', amount: 0, color: '#28c76f' },
      { category: 'Stock / Inventory', amount: 0, color: '#009fe3' },
      { category: 'Accounts Receivable', amount: 0, color: '#1b2850' },
      { category: 'Cash in Hand', amount: 0, color: '#ff9f43' },
      { category: 'MFS Balance', amount: 0, color: '#7367f0' },
    ],
  };

  const rawAnalysis =
    propData && Array.isArray(propData.breakdown) && propData.breakdown.length > 0
      ? propData
      : emptyAnalysis;

  // Guarantee strictly only the 5 asset categories from the endpoint specification
  const currentAnalysis = {
    ...rawAnalysis,
    breakdown: (rawAnalysis.breakdown || []).slice(0, 5),
  };

  const chartColors = currentAnalysis.breakdown.map(
    (item, idx) => item.color || defaultColors[idx % defaultColors.length]
  );

  const chartData = currentAnalysis.breakdown.map((item) => item.amount);
  const chartLabels = currentAnalysis.breakdown.map((item) => item.category);

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
            return ` ৳${Math.round(Number(context.raw)).toLocaleString('en-IN')}`;
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

  const legendItems = currentAnalysis.breakdown.map((item, idx) => ({
    label: item.category,
    value: Math.round(Number(item.amount) || 0),
    color: chartColors[idx % chartColors.length],
  }));

  const liquidAssets = currentAnalysis.breakdown
    .filter((item) => {
      const cat = String(item.category || '').toLowerCase();
      return cat.includes('bank') || cat.includes('cash') || cat.includes('mfs');
    })
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="w-full h-full bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Asset Analysis</p>
        </div>

        <div className="border-b border-gray-200 mb-3"></div>
      </div>

      <div className="flex items-center justify-between gap-4 my-auto py-1">
        <div className="h-36 w-36 sm:h-38 sm:w-38 shrink-0">
          <Doughnut data={data} options={options} />
        </div>

        <div className="space-y-2 flex-1">
          {legendItems.map((item, index: number) => (
            <div key={index} className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="font-medium text-gray-700">{item.label}</span>
              </div>
              <div className="text-sm font-bold text-gray-800 ml-4">
                ৳{item.value.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-gray-700">Asset Summary</p>
        <div className="border border-gray-200 mt-1.5 rounded-lg text-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5">
            <p className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block bg-black"></span>
              Total Assets
            </p>
            <p className="font-semibold text-black">৳{Math.round(Number(currentAnalysis.totalAsset) || 0).toLocaleString('en-IN')}</p>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block bg-[#28c76f]"></span>
              Liquid Assets (Cash + Bank + MFS)
            </p>
            <p className="font-semibold text-black">
              ৳{Math.round(liquidAssets).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAnalysisChart;

