import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/page-header/PageHeader";
import RefreshButton from "@/components/table-components/RefreshButton";
import { usePurchasesDueQuery } from "@/hooks/usePurchasesDue";
import { usePurchasesQuery } from "@/pages/admin/trade/purchase-return/hooks/usePurchaseReturnQueries";
import { partyListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import PaymentStatsCards from "./components/PaymentStatsCards";
import SupplierDueTable from "./components/SupplierDueTable";
import PaymentHistoryTable from "./components/PaymentHistoryTable";
import AddPaymentModal from "./components/AddPaymentModal";
import PaymentReceiptModal from "./components/PaymentReceiptModal";
import type { SupplierDueItem, PaymentReceiptData } from "@/types/payment.types";

export const SupplierPayment: React.FC = () => {
  // Navigation Tabs: "dues" | "history"
  const [activeTab, setActiveTab] = useState<"dues" | "history">("dues");

  // 1. Fetch Suppliers with outstanding dues (Cached, staleTime: 60s)
  const {
    data: suppliers = [],
    isLoading,
    isFetching,
    refetch,
  } = usePurchasesDueQuery();

  // Fetch party master list to enrich addresses if missing in /purchases-due
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () => {
      const partyListUrl = apiConfig.party?.partyListUrl || "get-party-info-list";
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
      if (Array.isArray(raw.supplierList)) list = raw.supplierList;
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

  // Fetch purchases records to accurately count pending invoices for due suppliers
  const { data: purchasesList = [] } = usePurchasesQuery({
    staleTime: 60 * 1000,
  });

  const purchasesDueCountMap = useMemo(() => {
    const idMap = new Map<string, Set<string>>();
    const phoneMap = new Map<string, Set<string>>();
    const nameMap = new Map<string, Set<string>>();

    if (Array.isArray(purchasesList)) {
      purchasesList.forEach((p: any) => {
        const due = Number(p.dueAmount ?? p.due_amount ?? p.due ?? 0);
        if (due > 0) {
          const invNo = String(p.invoiceNo || p.purchaseNo || p.challanNo || p.id || Math.random());
          const sId = String(p.supplierId ?? p.supplier_id ?? "");
          const sPhone = String(p.supplierPhone ?? p.supplier_phone ?? p.phone ?? "").trim();
          const sName = String(p.supplierName ?? p.supplier_name ?? p.name ?? "").trim().toLowerCase();

          if (sId) {
            if (!idMap.has(sId)) idMap.set(sId, new Set());
            idMap.get(sId)!.add(invNo);
          }
          if (sPhone) {
            if (!phoneMap.has(sPhone)) phoneMap.set(sPhone, new Set());
            phoneMap.get(sPhone)!.add(invNo);
          }
          if (sName) {
            if (!nameMap.has(sName)) nameMap.set(sName, new Set());
            nameMap.get(sName)!.add(invNo);
          }
        }
      });
    }

    return { idMap, phoneMap, nameMap };
  }, [purchasesList]);

  const enrichedSuppliers = useMemo(() => {
    return suppliers.map((s) => {
      const idKey = String(s.supplierId ?? s.id ?? "");
      const phoneKey = String(s.supplierPhone ?? "").trim();
      const nameKey = String(s.supplierName ?? "").trim().toLowerCase();
      const partyInfo = partyMap.get(idKey) || (phoneKey ? partyMap.get(phoneKey) : undefined);
      const resolvedAddress =
        (s.supplierAddress && s.supplierAddress !== "-" ? s.supplierAddress : partyInfo?.address) || "";

      // Calculate accurate pending invoices count:
      // 1. From backend s.invoiceCount if > 0
      // 2. From purchases list matching by supplierId, phone, or name
      // 3. Fallback to 1 if supplier has totalDue > 0
      const purchasesCount =
        purchasesDueCountMap.idMap.get(idKey)?.size ??
        (phoneKey ? purchasesDueCountMap.phoneMap.get(phoneKey)?.size : undefined) ??
        (nameKey ? purchasesDueCountMap.nameMap.get(nameKey)?.size : undefined) ??
        0;

      const finalInvoiceCount =
        s.invoiceCount && s.invoiceCount > 0
          ? s.invoiceCount
          : purchasesCount > 0
          ? purchasesCount
          : Number(s.totalDue || 0) > 0
          ? 1
          : 0;

      return {
        ...s,
        supplierAddress: resolvedAddress,
        invoiceCount: finalInvoiceCount,
      };
    });
  }, [suppliers, partyMap, purchasesDueCountMap]);

  // 2. Payment Modal State
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 3. Receipt Modal State
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // 4. Compute High-Performance Aggregated Statistics
  const stats = useMemo(() => {
    let totalDue = 0;
    let maxDue = 0;

    suppliers.forEach((s) => {
      const due = Number(s.totalDue || 0);
      totalDue += due;
      if (due > maxDue) maxDue = due;
    });

    const avgDue = suppliers.length > 0 ? totalDue / suppliers.length : 0;

    return {
      totalDue,
      totalSuppliers: suppliers.length,
      avgDue,
      maxDue,
    };
  }, [suppliers]);

  const handleRefresh = () => {
    refetch();
  };

  const handlePay = (supplier: SupplierDueItem) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handlePaymentSuccess = (receipt: PaymentReceiptData) => {
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  const handlePrintHistoricalReceipt = (receipt: PaymentReceiptData) => {
    setReceiptData(receipt);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Supplier Payment"
          headerDescription="Manage supplier dues, purchase bill payments, and disbursement vouchers"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Tab Switcher */}
          <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 h-8">
            <button
              type="button"
              onClick={() => setActiveTab("dues")}
              className={`h-7 px-3 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "dues"
                  ? "bg-white text-[var(--primary-color)] shadow-xs"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Supplier Dues ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`h-7 px-3 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-white text-[var(--primary-color)] shadow-xs"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Payment History
            </button>
          </div>

          <RefreshButton
            onClick={handleRefresh}
            isLoading={isLoading || isFetching}
          />
        </div>
      </div>

      {/* Stats Cards Row (Always visible for fast operational visibility) */}
      <PaymentStatsCards
        totalDue={stats.totalDue}
        totalSuppliers={stats.totalSuppliers}
        avgDue={stats.avgDue}
        maxDue={stats.maxDue}
      />

      {/* Tab Panels */}
      {activeTab === "dues" ? (
        <SupplierDueTable
          suppliers={enrichedSuppliers}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefresh={handleRefresh}
          onPay={handlePay}
        />
      ) : (
        <PaymentHistoryTable onPrintReceipt={handlePrintHistoricalReceipt} />
      )}

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isModalOpen}
        supplier={selectedSupplier}
        onClose={handleCloseModal}
        onSuccess={handlePaymentSuccess}
      />

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
      />
    </div>
  );
};

export default SupplierPayment;
