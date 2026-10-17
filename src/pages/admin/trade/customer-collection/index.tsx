import React, { useState, useMemo } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { useCustomersDueQuery } from "@/hooks/useCustomersDue";
import CollectionStatsCards from "./components/CollectionStatsCards";
import CustomerDueTable from "./components/CustomerDueTable";
import CollectionHistoryTable from "./components/CollectionHistoryTable";
import AddCollectionModal from "./components/AddCollectionModal";
import CollectionReceiptModal, {
  type CollectionReceiptData,
} from "./components/CollectionReceiptModal";
import type { CustomerDueItem } from "@/types/collection.types";

export const CustomerCollection: React.FC = () => {
  // Navigation Tabs: "dues" | "history"
  const [activeTab, setActiveTab] = useState<"dues" | "history">("dues");

  // 1. Fetch Customers with outstanding dues
  const {
    data: customers = [],
    isLoading,
    isFetching,
    refetch,
  } = useCustomersDueQuery();

  // 2. Collection Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 3. Receipt Modal State
  const [receiptData, setReceiptData] = useState<CollectionReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // 4. Compute High-Performance Aggregated Statistics
  const stats = useMemo(() => {
    let totalDue = 0;
    let highDueCount = 0;
    let highDueAmount = 0;
    let medLowDueCount = 0;
    let medLowDueAmount = 0;

    customers.forEach((c) => {
      const due = Number(c.totalDue || 0);
      totalDue += due;
      if (due >= 10000) {
        highDueCount += 1;
        highDueAmount += due;
      } else {
        medLowDueCount += 1;
        medLowDueAmount += due;
      }
    });

    return {
      totalDue,
      totalCustomers: customers.length,
      highDueCount,
      highDueAmount,
      medLowDueCount,
      medLowDueAmount,
    };
  }, [customers]);

  const handleRefresh = () => {
    refetch();
  };

  const handleCollect = (customer: CustomerDueItem) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleCollectionSuccess = (receipt: CollectionReceiptData) => {
    refetch();
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  const handlePrintHistoricalReceipt = (receipt: CollectionReceiptData) => {
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Customer Collection"
          headerDescription="Manage customer dues, invoice collections, and trade payment receipts"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Tab Switcher */}
          <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 h-8">
            <button
              type="button"
              onClick={() => setActiveTab("dues")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "dues"
                  ? "bg-[var(--primary-color)] text-white shadow-xs font-bold"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Customer Dues ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-[var(--primary-color)] text-white shadow-xs font-bold"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Collection History
            </button>
          </div>

          <RefreshButton onClick={handleRefresh} />
        </div>
      </div>

      {/* KPI Stats */}
      {activeTab === "dues" && (
        <CollectionStatsCards
          totalDue={stats.totalDue}
          totalCustomers={stats.totalCustomers}
          highDueCount={stats.highDueCount}
          highDueAmount={stats.highDueAmount}
          medLowDueCount={stats.medLowDueCount}
          medLowDueAmount={stats.medLowDueAmount}
        />
      )}

      {/* Main Content View */}
      {activeTab === "dues" ? (
        <CustomerDueTable
          customers={customers}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefresh={handleRefresh}
          onCollect={handleCollect}
        />
      ) : (
        <CollectionHistoryTable onPrintReceipt={handlePrintHistoricalReceipt} />
      )}

      {/* Payment Collection Modal */}
      <AddCollectionModal
        isOpen={isModalOpen}
        customer={selectedCustomer}
        onClose={handleCloseModal}
        onSuccess={handleCollectionSuccess}
      />

      {/* Printable Money Receipt Modal */}
      <CollectionReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setReceiptData(null);
        }}
        receiptData={receiptData}
      />
    </div>
  );
};

export default CustomerCollection;
