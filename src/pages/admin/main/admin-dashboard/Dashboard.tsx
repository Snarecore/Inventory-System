import { FaStore, FaUserFriends } from "react-icons/fa";
import { IoCubeOutline } from "react-icons/io5";
import { FiGrid, FiShoppingCart } from "react-icons/fi";
import { useEffect, useState } from "react";
import DashboardOverView from "@/components/cards/Dashboard-Overview";
import { MotionDiv } from "@/utils/framer.motion";
import SalesPurchaseChart from "@/components/chart/BarChart";
import DoughnutChart from "@/components/chart/DoughnutChart";
import MonthlyReportsLine from "@/components/chart/LineChart";
import NewAgentsBar from "@/components/chart/HorizontalChart";
import Footer from "@/components/admin/Footer";

interface DashboardData {
  totalProducts: number;
  totalOrders: number;
  totalVendors: number;
  totalCustomers: number;
  recentProducts: any;
  recentOrders: any;
}

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );

  const staticDashboardData = {
    totalProducts: 1250,
    totalOrders: 3420,
    totalVendors: 45,
    totalCustomers: 2890,
    totalCategories: 12,
    topCategories: [
      { category: "Electronics", sales: 1250 },
      { category: "Clothing", sales: 980 },
      { category: "Home & Garden", sales: 750 },
    ],
    monthlySalesCommissionData: [
      { month: "2025-01", totalSales: "130.00", totalCommission: "100.00" },
      { month: "2025-02", totalSales: "70.00", totalCommission: "40.00" },
      { month: "2025-03", totalSales: "100.00", totalCommission: "90.00" },
      { month: "2025-04", totalSales: "430.00", totalCommission: "100.00" },
      { month: "2025-05", totalSales: "70.00", totalCommission: "40.00" },
      { month: "2025-06", totalSales: "100.00", totalCommission: "90.00" },
      { month: "2025-07", totalSales: "180.00", totalCommission: "60.00" },
      { month: "2025-08", totalSales: "240.00", totalCommission: "80.00" },
      { month: "2025-09", totalSales: "160.00", totalCommission: "70.00" },
      { month: "2025-10", totalSales: "310.00", totalCommission: "110.00" },
      { month: "2025-11", totalSales: "290.00", totalCommission: "95.00" },
      { month: "2025-12", totalSales: "380.00", totalCommission: "120.00" },
    ],
    recentProducts: [],
    recentOrders: [],
  };

  return (
    <>
      <div className="flex flex-col gap-8 min-h-screen p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full transition-all ease-in duration-300 cursor-pointer">
          <MotionDiv>
            <DashboardOverView
              bgColor="bg-[var(--color-primary)]"
              title={dashboardData?.totalProducts?.toString() || "0"}
              subTitle="Total Products"
            >
              <IoCubeOutline />
            </DashboardOverView>
          </MotionDiv>
          <MotionDiv>
            <DashboardOverView
              bgColor="bg-[#009fe3]"
              title={dashboardData?.totalOrders?.toString() || "0"}
              subTitle="Total Orders"
            >
              <FiShoppingCart />
            </DashboardOverView>
          </MotionDiv>

          <MotionDiv>
            <DashboardOverView
              bgColor="bg-[#1b2850]"
              title={dashboardData?.totalVendors?.toString() || "0"}
              subTitle="Total Vendor"
            >
              <FaStore />
            </DashboardOverView>
          </MotionDiv>

          <MotionDiv>
            <DashboardOverView
              bgColor="bg-[#28c76f]"
              title={dashboardData?.totalCustomers?.toString() || "0"}
              subTitle="Total Customer"
            >
              <FaUserFriends />
            </DashboardOverView>
          </MotionDiv>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="col-span-8">
            <SalesPurchaseChart
              monthlySalesCommissionData={
                staticDashboardData?.monthlySalesCommissionData
              }
            />
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
                  <FiGrid size={18} />
                </span>
                <p className="text-xl font-bold">Top Categories</p>
              </div>

              <div className="border-b border-gray-200 mb-4"></div>
            </div>

            <DoughnutChart
              totalProducts={staticDashboardData?.totalProducts}
              totalCategories={staticDashboardData?.totalCategories}
              topCategories={staticDashboardData?.topCategories}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
            <MonthlyReportsLine />
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col h-full">
            <NewAgentsBar />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminDashboard;
