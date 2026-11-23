import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiShoppingCart } from 'react-icons/fi';
import { IoCubeOutline } from 'react-icons/io5';
import {
  FaStore,
  FaUserFriends,
  FaMoneyBillWave,
  FaUniversity,
  FaMobileAlt,
  FaWallet,
  FaHandHoldingUsd,
} from 'react-icons/fa';
import { MotionDiv } from '@/utils/framer.motion';
import { DashboardKpiData } from '../types/dashboard.types';

interface KpiCardsGridProps {
  data: DashboardKpiData;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ data }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatCurrency = (val: number) => {
    const num = Number(val || 0);
    return `৳${num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  const totalFunds =
    typeof data.totalBalance === 'number'
      ? data.totalBalance
      : (Number(data.cashBalance) || 0) +
        (Number(data.bankBalance) || 0) +
        (Number(data.mfsBalance) || 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 w-full">
      {/* 1. Today's Sale */}
      <MotionDiv>
        <div className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[var(--color-primary)] text-white shadow-xs hover:shadow-md transition-all duration-300 h-full">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.todaysSale)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Today's Sale", "Today's Sale")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 hover:scale-110 transition-all ease-in duration-300">
              <IoCubeOutline />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 2. Today's Expense */}
      <MotionDiv>
        <div className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#009fe3] text-white shadow-xs hover:shadow-md transition-all duration-300 h-full">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.todaysExpense)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Today's Expense", "Today's Expense")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 hover:scale-110 transition-all ease-in duration-300">
              <FiShoppingCart />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 3. Customer Due (Navigates to Customer Collection) */}
      <MotionDiv>
        <div
          onClick={() => navigate('/admin/customer-collection')}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#1b2850] text-white shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group hover:brightness-105 active:scale-[0.99] h-full"
          title={`Customer Outstanding Due: ${formatCurrency(data.customerDue)} | Total Receivable: ${formatCurrency(data.totalReceivable)}`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.customerDue)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Customer Due", "Customer Due")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 group-hover:scale-110 transition-all ease-in duration-300">
              <FaStore />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 4. Supplier Due (Navigates to Supplier Payment) */}
      <MotionDiv>
        <div
          onClick={() => navigate('/admin/supplier-payment')}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#e11d48] text-white shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group hover:brightness-105 active:scale-[0.99] h-full"
          title={`Supplier Outstanding Due: ${formatCurrency(data.supplierDue)} | Total Payable: ${formatCurrency(data.totalPayable)}`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.supplierDue)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Supplier Due", "Supplier Due")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 group-hover:scale-110 transition-all ease-in duration-300">
              <FaUserFriends />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 5. Cash Balance */}
      <MotionDiv>
        <div className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#FE9F43] text-white shadow-xs hover:shadow-md transition-all duration-300 h-full">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.cashBalance)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Cash Balance", "Cash Balance")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 hover:scale-110 transition-all ease-in duration-300">
              <FaMoneyBillWave />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 6. Dena Pawna (Dena) (Navigates to Dena Pawna / Khatabook) */}
      <MotionDiv>
        <div
          onClick={() => navigate('/admin/khatabook')}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#d97706] text-white shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group hover:brightness-105 active:scale-[0.99] h-full"
          title={`Dena Pawna (Dena): ${formatCurrency(data.denaPawnaDena ?? data.denaPawnaPabo ?? 0)} | Click to view Dena Pawna`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.denaPawnaDena ?? data.denaPawnaPabo ?? 0)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Dena Pawna (Dena)", "Dena Pawna (Dena)")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 group-hover:scale-110 transition-all ease-in duration-300">
              <FaMoneyBillWave />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 7. Dena Pawna (Pawna) (Navigates to Dena Pawna / Khatabook) */}
      <MotionDiv>
        <div
          onClick={() => navigate('/admin/khatabook')}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#059669] text-white shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group hover:brightness-105 active:scale-[0.99] h-full"
          title={`Dena Pawna (Pawna): ${formatCurrency(data.denaPawnaPawna ?? data.denaPawnaDibo ?? 0)} | Click to view Dena Pawna`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.denaPawnaPawna ?? data.denaPawnaDibo ?? 0)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Dena Pawna (Pawna)", "Dena Pawna (Pawna)")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 group-hover:scale-110 transition-all ease-in duration-300">
              <FaHandHoldingUsd />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 8. Bank Balance (Navigates to Bank list) */}
      <MotionDiv>
        <div
          onClick={() => navigate('/admin/banks')}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#7367f0] text-white shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group hover:brightness-105 active:scale-[0.99] h-full"
          title="Click to view Bank Accounts list"
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.bankBalance)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Bank Balance", "Bank Balance")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 group-hover:scale-110 transition-all ease-in duration-300">
              <FaUniversity />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 9. MFS Balance (Navigates to MFS list) */}
      <MotionDiv>
        <div
          onClick={() => navigate('/admin/mfs')}
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#db2777] text-white shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer group hover:brightness-105 active:scale-[0.99] h-full"
          title="Click to view MFS Accounts list"
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(data.mfsBalance ?? 0)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("MFS Balance", "MFS Balance")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 group-hover:scale-110 transition-all ease-in duration-300">
              <FaMobileAlt />
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* 10. Total Balance - Sum of Cash + Bank + MFS */}
      <MotionDiv>
        <div
          className="px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-md bg-[#0d9488] text-white shadow-xs hover:shadow-md transition-all duration-300 h-full"
          title={`Total Fund Balance (Cash + Bank + MFS): ${formatCurrency(totalFunds)}`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[19px] sm:text-[21px] xl:text-[22px] font-bold truncate tracking-tight">
                {formatCurrency(totalFunds)}
              </p>
              <p className="text-xs sm:text-[13px] font-medium truncate opacity-90">
                {t("Total Balance", "Total Balance")}
              </p>
            </div>
            <div className="text-3xl sm:text-4xl shrink-0 opacity-80 hover:scale-110 transition-all ease-in duration-300">
              <FaWallet />
            </div>
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default KpiCardsGrid;
