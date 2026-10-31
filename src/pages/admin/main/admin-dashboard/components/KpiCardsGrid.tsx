import React from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import { IoCubeOutline } from 'react-icons/io5';
import { FaStore, FaUserFriends, FaMoneyBillWave, FaUniversity } from 'react-icons/fa';
import { MotionDiv } from '@/utils/framer.motion';
import { DashboardKpiData } from '../types/dashboard.types';

interface KpiCardsGridProps {
  data: DashboardKpiData;
  isLoading?: boolean;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ data, isLoading = false }) => {
  const formatCurrency = (val: number) => isLoading ? '...' : `৳${val.toLocaleString('en-IN')}`;

  const cards = [
    {
      label: "Today's Sale",
      value: data.todaysSale,
      icon: IoCubeOutline,
      tone: "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-hover) 100%)",
      iconBg: "rgba(255,255,255,0.18)",
    },
    {
      label: "Today's Expense",
      value: data.todaysExpense,
      icon: FiShoppingCart,
      tone: "linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 78%, var(--ui-accent-2)) 0%, var(--primary-color) 100%)",
      iconBg: "rgba(255,255,255,0.14)",
    },
    {
      label: "Total Receivable",
      value: data.totalReceivable,
      icon: FaStore,
      tone: "linear-gradient(135deg, var(--primary-color-dark) 0%, rgba(6,51,107,0.88) 100%)",
      iconBg: "rgba(255,255,255,0.17)",
    },
    {
      label: "Total Payable",
      value: data.totalPayable,
      icon: FaUserFriends,
      tone: "linear-gradient(135deg, var(--ui-success) 0%, color-mix(in srgb, var(--ui-success) 80%, #0f172a) 100%)",
      iconBg: "rgba(255,255,255,0.14)",
    },
    {
      label: "Cash Balance",
      value: data.cashBalance,
      icon: FaMoneyBillWave,
      tone: "linear-gradient(135deg, var(--ui-warning) 0%, color-mix(in srgb, var(--ui-warning) 75%, #7c2d12) 100%)",
      iconBg: "rgba(255,255,255,0.15)",
    },
    {
      label: "Bank Balance",
      value: data.bankBalance,
      icon: FaUniversity,
      tone: "linear-gradient(135deg, var(--ui-info) 0%, color-mix(in srgb, var(--ui-info) 72%, #0f172a) 100%)",
      iconBg: "rgba(255,255,255,0.14)",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 w-full cursor-pointer">
      {cards.map(({ label, value, icon: Icon, tone, iconBg }) => (
        <MotionDiv key={label}>
          <div
            className="group relative overflow-hidden rounded-2xl p-4 text-white shadow-[0_18px_32px_-22px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-20px_rgba(15,23,42,0.55)]"
            style={{ background: tone }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_38%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[26px] font-bold leading-none tracking-tight">{formatCurrency(value)}</p>
                <p className="mt-2 text-sm text-white/80">{label}</p>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-inner"
                style={{ background: iconBg }}
              >
                <Icon />
              </div>
            </div>
          </div>
        </MotionDiv>
      ))}
    </div>
  );
};

export default KpiCardsGrid;
