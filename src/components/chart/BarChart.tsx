import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiBarChart2 } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlySalesCommissionDataProps {
  month: string;
  totalSales: string;
  totalCommission: string;
}

interface SalesPurchaseChartProps {
  monthlySalesCommissionData: MonthlySalesCommissionDataProps[];
}

const SalesPurchaseChart = ({ monthlySalesCommissionData }: SalesPurchaseChartProps) => {
  const monthlySales = Array(12).fill(0);
  const monthlyCommissions = Array(12).fill(0);

  monthlySalesCommissionData.forEach((entry: any) => {
    const monthIndex = new Date(entry.month + '-01').getMonth();
    monthlySales[monthIndex] = parseFloat(entry.totalSales);
    monthlyCommissions[monthIndex] = parseFloat(entry.totalCommission);
  });

  const data = {
    labels: monthNames,
    datasets: [
      {
        label: 'Total Sales',
        data: monthlySales,
        backgroundColor: '#009fe3',
        stack: 'stack1',
      },
      {
        label: 'Total Commission',
        data: monthlyCommissions,
        backgroundColor: '#bfe7f7',
        borderRadius: 8,
        stack: 'stack1',
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
          displayColors: false,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || 0;
              return `${label}: $${value.toLocaleString()}`;
            },
          },
        },
        datalabels: {
          display: false, // turn off numbers on bars
        },
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: true,
    },
    scales: {
      x: {
        stacked: true,
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
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `$${value}`,
          color: '#6B7280',
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#E5E7EB',
          borderDash: [4, 4],
        },
      },
    },
  };

  const totalSales = monthlySales.reduce((acc, val) => acc + val, 0);
  const totalCommissions = monthlyCommissions.reduce((acc, val) => acc + val, 0);

  return (
    <div className="w-full mx-auto bg-white p-5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xl font-bold flex items-center gap-2.5">
          <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
            <FiBarChart2 size={18} />
          </span>
          Sales vs Commissions
        </p>
      </div>

      <div className="border-b border-gray-200 mb-4"></div>

      <div className="flex gap-4 mb-4">
        <div className="text-sm border border-gray-200 rounded-lg p-2 w-44">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#009fe3]"></span>
            <span className="text-xs text-gray-600">Total Sales</span>
          </div>
          <p className="font-bold text-lg ml-4">${totalSales.toLocaleString()}</p>
        </div>

        <div className="text-sm border border-gray-200 rounded-lg p-2 w-44">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#bfe7f7]"></span>
            <span className="text-xs text-gray-600">Total Commissions</span>
          </div>
          <p className="font-bold text-lg ml-4">${totalCommissions.toLocaleString()}</p>
        </div>
      </div>

      <div className="relative w-full h-[220px]">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default SalesPurchaseChart;
