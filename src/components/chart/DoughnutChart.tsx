import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface TopCategory {
    category: string;
    sales: number;
}

interface DoughnutChartProps {
    totalCategories: number;
    totalProducts: number;
    topCategories: TopCategory[];
}

const DoughnutChart = ({ totalCategories, totalProducts, topCategories }: DoughnutChartProps) => {
    const chartData = topCategories.map((item: TopCategory) => item.sales);
    const chartLabels = topCategories.map((item: TopCategory) => item.category);
    const chartColors = ['#28c76f', '#1b2850', '#009fe3'];

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
                        return `${context.raw}`;
                    }
                },
                displayColors: false
            }
        },
        hover: {
            mode: 'nearest' as const,
            animationDuration: 400,
        },
    };

    const legendItems = topCategories.map((item: TopCategory) => ({
        label: item.category,
        value: item.sales,
        color: chartColors[topCategories.indexOf(item)],
    }));

    return (
        <div className='w-full'>
            <div className="flex items-center justify-between gap-4">
                <div className='h-36 w-36 sm:h-40 sm:w-40 shrink-0'>
                    <Doughnut data={data} options={options} />
                </div>

                <div className="space-y-3 flex-1">
                    {legendItems.map((item, index: number) => (
                        <div key={index}>
                            <div className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
                                <span
                                    className="w-1 h-3 rounded-full inline-block"
                                    style={{ backgroundColor: item.color }}
                                ></span>
                                {item.label}
                            </div>
                            <div className="text-base font-semibold text-[var(--ui-text)]">
                                {item.value} <span className="text-xs font-normal text-[var(--ui-text-muted)]">Sales</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='mt-3'>
                <p className='text-xs font-semibold text-[var(--ui-text)]'>Category Statistics</p>
                <div className='border border-[var(--ui-border)] mt-1.5 rounded-lg text-xs overflow-hidden'>
                    <div className='flex items-center justify-between border-b border-[var(--ui-border)] px-3 py-1.5'>
                        <p className='flex items-center gap-2 text-[var(--ui-text-muted)]'>
                            <span
                                className="w-2 h-2 rounded-full inline-block bg-[var(--ui-text)]"
                            ></span>
                            Total Number Of Categories
                        </p>
                        <p className='font-semibold'>{totalCategories}</p>
                    </div>

                    <div className='flex items-center justify-between px-3 py-1.5'>
                        <p className='flex items-center gap-2 text-[var(--ui-text-muted)]'>
                            <span
                                className="w-2 h-2 rounded-full inline-block bg-[var(--ui-success)]"
                            ></span>
                            Total Number Of Products
                        </p>
                        <p className='font-semibold'>{totalProducts}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoughnutChart;
