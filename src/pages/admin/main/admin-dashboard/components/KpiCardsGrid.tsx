import React from 'react';
import { FiShoppingCart } from 'react-icons/fi';
import { IoCubeOutline } from 'react-icons/io5';
import { FaStore, FaUserFriends, FaMoneyBillWave, FaUniversity, FaMobileAlt } from 'react-icons/fa';
import { MotionDiv } from '@/utils/framer.motion';
import { DashboardKpiData } from '../types/dashboard.types';

interface KpiCardsGridProps {
  data: DashboardKpiData;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ data }) => {
  const formatCurrency = (val: number) => `৳${val.toLocaleString('en-IN')}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full cursor-pointer">
      {/* 1. Today's Sale - Primary Navy/Teal */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[var(--color-primary)] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.todaysSale)}</p>
              <p className="text-sm">Today's Sale</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <IoCubeOutline />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 2. Today's Expense - Bright Sky Blue */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[#009fe3] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.todaysExpense)}</p>
              <p className="text-sm">Today's Expense</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <FiShoppingCart />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 3. Total Receivable - Midnight Navy */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[#1b2850] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.totalReceivable)}</p>
              <p className="text-sm">Total Receivable</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <FaStore />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 4. Total Payable - Emerald Green */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[#28c76f] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.totalPayable)}</p>
              <p className="text-sm">Total Payable</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <FaUserFriends />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 5. Cash Balance - Orange / Amber */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[#FE9F43] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.cashBalance)}</p>
              <p className="text-sm">Cash Balance</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <FaMoneyBillWave />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 6. Bank Balance - Matching Rich Indigo/Violet */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[#7367f0] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.bankBalance)}</p>
              <p className="text-sm">Bank Balance</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <FaUniversity />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 7. MFS Balance - Pink / Rose */}
      <MotionDiv>
        <div className="px-4 py-4 rounded-md bg-[#db2777] text-white shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[24px] font-bold">{formatCurrency(data.mfsBalance ?? 0)}</p>
              <p className="text-sm">MFS Balance</p>
            </div>
            <div className="text-5xl hover:scale-120 transition-all ease-in duration-300">
              <FaMobileAlt />
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default KpiCardsGrid;
