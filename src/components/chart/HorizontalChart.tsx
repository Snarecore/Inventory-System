import React, { useMemo, useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { FiGrid } from "react-icons/fi";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const valueLabels = {
  id: "valueLabels",
  afterDatasetsDraw(chart: any, args: any, pluginOptions: any) {
    const dataset = chart?.data?.datasets?.[0];
    if (!dataset) return;

    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = pluginOptions?.color || "#1f2544";

    meta.data.forEach((bar: any, i: number) => {
      const v = dataset.data[i];
      if (v == null) return;
      const x = Math.min(bar.x + 8, chartArea.right - 16);
      const y = bar.y + 4;
      ctx.fillText(String(v), x, y);
    });

    ctx.restore();
  },
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Example data matching screenshot
const DATA_2022 = [40, 20, 350, 350, 100, 150, 55, 50, 30, 330, 360, 20];
const DATA_2021 = [30, 15, 280, 220, 90, 120, 40, 35, 25, 200, 240, 18];

export default function NewAgentsBar({
  title = "New added customer",
  data2022 = DATA_2022,
  data2021 = DATA_2021,
  barColor = "#009fe3",
  cardBg = "#ffffff",
}) {
  const [year, setYear] = useState(2022);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const values = year === 2022 ? data2022 : data2021;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const suggestedMax = Math.ceil(Math.max(...values) * 1.1);

  const data = useMemo(
    () => ({
      labels: months,
      datasets: [
        {
          data: values,
          backgroundColor: barColor,
          borderRadius: {
            topRight: windowWidth < 768 ? 6 : 10,
            bottomRight: windowWidth < 768 ? 6 : 10,
            topLeft: 0,
            bottomLeft: 0,
          },
          borderSkipped: false,
          barThickness: windowWidth < 768 ? 10 : windowWidth < 1024 ? 12 : 14,
          maxBarThickness: windowWidth < 768 ? 14 : windowWidth < 1024 ? 16 : 20,
        },
      ],
    }),
    [values, barColor, windowWidth]
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      layout: { 
        padding: { 
          top: 8, 
          right: 8, 
          bottom: 8, 
          left: 8 
        } 
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        valueLabels: { color: "#1f2544" },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false, drawBorder: false },
          min: 0,
          suggestedMax,
        },
        y: {
          grid: { display: false, drawBorder: false },
          ticks: { 
            color: "#6b7280", 
            font: { 
              size: windowWidth < 768 ? 10 : 12 
            }, 
            padding: windowWidth < 768 ? 4 : 8 
          },
        },
      },
    }),
    [suggestedMax, windowWidth]
  );

  return (
    <div className="w-full h-full rounded-2xl bg-[var(--ui-surface)] p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="bg-[var(--primary-color-light)] text-[var(--primary-color)] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">{title}</p>
        </div>

        <div className="border-b border-[var(--ui-border)] mb-4"></div>
      </div>

      <div className="relative w-full h-[340px] flex-1 min-h-[300px]">
        <Bar data={data} options={options} plugins={[valueLabels]} />
      </div>
    </div>
  );
}
