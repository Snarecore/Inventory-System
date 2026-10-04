import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { FiGrid } from 'react-icons/fi';
import { mockAssetAnalysis } from '../data/mockDashboardData';

ChartJS.register(ArcElement, Tooltip, Legend);

export const AssetAnalysisChart: React.FC = () => {
  const chartColors = ['#28c76f', '#1b2850', '#009fe3', '#FE9F43'];

  const chartData = mockAssetAnalysis.breakdown.map((item) => item.amount);
  const chartLabels = mockAssetAnalysis.breakdown.map((item) => item.category);

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

  const legendItems = mockAssetAnalysis.breakdown.map((item, idx) => ({
    label: item.category,
    value: item.amount,
    color: chartColors[idx % chartColors.length],
  }));

  return (
    <div className="w-full h-full bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Asset Analysis</p>
        </div>

        <div className="border-b border-gray-200 mb-4"></div>
      </div>

      <div className="flex items-center justify-between gap-4 my-auto py-2">
        <div className="h-36 w-36 sm:h-38 sm:w-38 shrink-0">
          <Doughnut data={data} options={options} />
        </div>

        <div className="space-y-2.5 flex-1">
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

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-700">Asset Summary</p>
        <div className="border border-gray-200 mt-1.5 rounded-lg text-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <p className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block bg-black"></span>
              Total Assets
            </p>
            <p className="font-semibold text-gray-900">৳{mockAssetAnalysis.totalAsset.toLocaleString('en-IN')}</p>
          </div>

          <div className="flex items-center justify-between px-3 py-2">
            <p className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full inline-block bg-[#28c76f]"></span>
              Liquid Assets (Cash + Bank)
            </p>
            <p className="font-semibold text-gray-900">
              ৳{(mockAssetAnalysis.breakdown[0].amount + mockAssetAnalysis.breakdown[3].amount).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAnalysisChart;
