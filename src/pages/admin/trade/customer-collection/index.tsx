import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { useCustomersDueQuery } from "@/hooks/useCustomersDue";
import { useSalesQuery } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import { partyListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
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

  // Fetch party master list to enrich addresses if missing in customers due data
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () => {
      const partyListUrl = apiConfig.party.partyListUrl;
      const res: any = await postData({
        url: partyListUrl,
        body: { accessUser: buildAccessUser() },
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const partyMap = useMemo(() => {
    const map = new Map<string, { address?: string; phone?: string; name?: string }>();
    if (!rawPartyData) return map;
    let list: any[] = [];
    if (Array.isArray(rawPartyData)) list = rawPartyData;
    else if (rawPartyData && typeof rawPartyData === "object") {
      const raw = rawPartyData as any;
      if (Array.isArray(raw.customerList)) list = raw.customerList;
      else if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }
    list.forEach((p: any) => {
      const addr = (p.address || p.partyAddress || "").trim();
      if (addr) {
        if (p.id) map.set(String(p.id), { address: addr });
        if (p.partyId) map.set(String(p.partyId), { address: addr });
        if (p.phone) map.set(String(p.phone).trim(), { address: addr });
        if (p.partyPhone) map.set(String(p.partyPhone).trim(), { address: addr });
      }
    });
    return map;
  }, [rawPartyData]);

  // Fetch sales records to accurately count pending invoices for due customers
  const {
    data: salesList = [],
    refetch: refetchSales,
    isFetching: isSalesFetching,
  } = useSalesQuery({
    staleTime: 60 * 1000,
  });

  const salesDueCountMap = useMemo(() => {
    const idMap = new Map<string, Set<string>>();
    const phoneMap = new Map<string, Set<string>>();

    if (Array.isArray(salesList)) {
      salesList.forEach((s: any) => {
        const due = Number(s.dueAmount ?? s.due_amount ?? 0);
        if (due > 0) {
          const invNo = String(s.invoiceNo || s.orderNo || s.id || Math.random());
          const cId = String(s.customerId ?? s.customer_id ?? "");
          const cPhone = String(s.customerPhone ?? s.customer_phone ?? s.phone ?? "").trim();

          if (cId) {
            if (!idMap.has(cId)) idMap.set(cId, new Set());
            idMap.get(cId)!.add(invNo);
          }
          if (cPhone) {
            if (!phoneMap.has(cPhone)) phoneMap.set(cPhone, new Set());
            phoneMap.get(cPhone)!.add(invNo);
          }
        }
      });
    }

    return { idMap, phoneMap };
  }, [salesList]);

  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const idKey = String(c.customerId ?? c.id ?? "");
      const phoneKey = String(c.customerPhone ?? "").trim();
      const partyInfo = partyMap.get(idKey) || (phoneKey ? partyMap.get(phoneKey) : undefined);
      const resolvedAddress =
        (c.customerAddress && c.customerAddress !== "-" ? c.customerAddress : partyInfo?.address) || "";

      // Calculate accurate pending invoices count:
      // 1. From backend c.invoiceCount if > 0
      // 2. From sales list matching by customerId or phone
      // 3. Fallback to 1 if customer has totalDue > 0
      const salesCount =
        salesDueCountMap.idMap.get(idKey)?.size ??
        (phoneKey ? salesDueCountMap.phoneMap.get(phoneKey)?.size : undefined) ??
        0;

      const finalInvoiceCount =
        salesCount > 0
          ? salesCount
          : c.invoiceCount && c.invoiceCount > 0
          ? c.invoiceCount
          : Number(c.totalDue || 0) > 0
          ? 1
          : 0;

      return {
        ...c,
        customerAddress: resolvedAddress,
        invoiceCount: finalInvoiceCount,
      };
    });
  }, [customers, partyMap, salesDueCountMap]);

  // 2. Collection Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 3. Receipt Modal State
  const [receiptData, setReceiptData] = useState<CollectionReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // 4. Compute High-Performance Aggregated Statistics
  const stats = useMemo(() => {
    let totalDue = 0;
    let maxDue = 0;

    customers.forEach((c) => {
      const due = Number(c.totalDue || 0);
      totalDue += due;
      if (due > maxDue) maxDue = due;
    });

    const avgDue = customers.length > 0 ? totalDue / customers.length : 0;

    return {
      totalDue,
      totalCustomers: customers.length,
      avgDue,
      maxDue,
    };
  }, [customers]);

  const handleRefresh = () => {
    refetch();
    refetchSales();
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
    refetchSales();
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
          <div className="inline-flex items-center rounded-lg border border-[var(--ui-border)] p-0.5 bg-[var(--ui-surface-muted)] h-8">
            <button
              type="button"
              onClick={() => setActiveTab("dues")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "dues"
                  ? "bg-[var(--primary-color)] text-white shadow-xs font-bold"
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
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
                  : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
              }`}
            >
              Collection History
            </button>
          </div>

          <RefreshButton
            onClick={handleRefresh}
            isLoading={isLoading || isFetching || isSalesFetching}
          />
        </div>
      </div>

      {/* KPI Stats */}
      {activeTab === "dues" && (
        <CollectionStatsCards
          totalDue={stats.totalDue}
          totalCustomers={stats.totalCustomers}
          avgDue={stats.avgDue}
          maxDue={stats.maxDue}
        />
      )}

      {/* Main Content View */}
      {activeTab === "dues" ? (
        <CustomerDueTable
          customers={enrichedCustomers}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefresh={handleRefresh}
          onCollect={handleCollect}
        />
      ) : (
        <CollectionHistoryTable onPrintReceipt={handlePrintHistoricalReceipt} />
      )}

      {/* Payment Collection Modal */}
      {isModalOpen && (
        <AddCollectionModal
          isOpen={isModalOpen}
          customer={selectedCustomer}
          onClose={handleCloseModal}
          onSuccess={handleCollectionSuccess}
        />
      )}

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
