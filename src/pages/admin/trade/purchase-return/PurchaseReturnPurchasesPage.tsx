import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { FaUndoAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PurchaseStats from "@/pages/admin/trade/purchases/components/PurchaseStats";
import PurchaseReturnPurchaseTable from "./components/PurchaseReturnPurchaseTable";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import apiConfig from "@/config/api.json";
import { purchaseListQueryKey, partyListQueryKey, purchaseAndReturnQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { PurchaseItem, PartyItem } from "@/types";

/**
 * Dedicated Purchase Orders page for Purchase Return workflow
 * URL: /admin/purchase-return-purchases
 * Allows viewing purchase orders and initiating returns directly.
 */
const PurchaseReturnPurchasesPage: React.FC = () => {
  const navigate = useNavigate();

  // Search, Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [selectedPurchaseForInvoice, setSelectedPurchaseForInvoice] = useState<PurchaseItem | null>(null);

  // 1. Fetch Suppliers
  const { data: rawSupplierData } = useQuery({
    queryKey: [partyListQueryKey, "SUPPLIER"],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.party?.partyListUrl || "get-party-info-list",
        body: { accessUser },
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Purchases & Returns to cross-reference already returned orders
  const { data: purchaseAndReturnData } = useQuery({
    queryKey: [purchaseAndReturnQueryKey],
    queryFn: async () => {
      try {
        const accessUser = buildAccessUser();
        const endpoint =
          apiConfig.purchaseReturn?.getPurchaseAndReturnListUrl || "get-purchase-and-return-list";
        const res: any = await postData({
          url: endpoint,
          body: { accessUser },
        });
        const list =
          res?.data ||
          res?.returns ||
          res?.purchaseAndReturnList ||
          res?.purchaseReturnList ||
          res?.purchaseList ||
          [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const returnedInvoiceSet = useMemo(() => {
    const set = new Set<string>();
    let list: any[] = [];
    if (Array.isArray(purchaseAndReturnData)) {
      list = purchaseAndReturnData;
    } else if (purchaseAndReturnData && typeof purchaseAndReturnData === "object") {
      const raw = purchaseAndReturnData as any;
      list = raw.data || raw.returns || raw.purchaseAndReturnList || raw.purchaseReturnList || raw.purchaseList || [];
    }
    if (Array.isArray(list)) {
      list.forEach((item: any) => {
        const isReturned =
          Boolean(item.hasReturn) ||
          Boolean(item.returnNo) ||
          Boolean(item.returnGrandTotal) ||
          String(item.returnType || "").toUpperCase() === "RETURN" ||
          String(item.status || "").toUpperCase() === "RETURN" ||
          (item.refNo && String(item.refNo).startsWith("PR-")) ||
          (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
          (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

        if (isReturned) {
          if (item.purchaseInvoiceNo && item.purchaseInvoiceNo !== "-") {
            set.add(String(item.purchaseInvoiceNo).trim().toLowerCase());
          }
          if (item.invoiceNo && item.invoiceNo !== "-") {
            set.add(String(item.invoiceNo).trim().toLowerCase());
          }
          if (item.orderNo) {
            set.add(String(item.orderNo).trim().toLowerCase());
          }
          if (item.challanNo) {
            set.add(String(item.challanNo).trim().toLowerCase());
          }
          // NOTE: Do NOT add item.id because item.id is the return record ID, which would incorrectly collide with purchase.id
          if (item.purchaseId) {
            set.add(String(item.purchaseId).trim().toLowerCase());
          }
          if (item.purchase_id) {
            set.add(String(item.purchase_id).trim().toLowerCase());
          }
        }
      });
    }
    return set;
  }, [purchaseAndReturnData]);

  // 3. Fetch Purchases from Backend API (Shared query key with main Purchase Return page)
  const {
    data: purchasesData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const endpoint = apiConfig.purchase?.purchaseListUrl || "get-purchase-list";
      const res: any = await postData({
        url: endpoint,
        body: { accessUser },
      });

      const list =
        res?.purchaseList ||
        res?.purchasesList ||
        res?.purchases ||
        res?.purchaseListDetails ||
        res?.purchaseInfoList ||
        res?.purchase_list ||
        (Array.isArray(res?.data)
          ? res?.data
          : res?.data?.purchaseList || res?.data?.purchases || res?.data?.purchase_list) ||
        [];

      return Array.isArray(list) ? list : [];
    },
    staleTime: 60 * 1000,
    refetchOnMount: "always",
  });

  const rawPurchases: PurchaseItem[] = useMemo(() => {
    if (Array.isArray(purchasesData)) return purchasesData;
    if (purchasesData && typeof purchasesData === "object") {
      const raw = purchasesData as any;
      const list =
        raw.purchaseList ||
        raw.purchasesList ||
        raw.purchases ||
        raw.purchaseListDetails ||
        raw.purchaseInfoList ||
        raw.purchase_list ||
        (Array.isArray(raw.data) ? raw.data : raw.data?.purchaseList || raw.data?.purchases) ||
        [];
      if (Array.isArray(list)) return list;
    }
    return [];
  }, [purchasesData]);

  // Suppliers List derived from Parties + Purchases
  const suppliersList: PartyItem[] = useMemo(() => {
    let list: any[] = [];
    if (rawSupplierData) {
      if (Array.isArray(rawSupplierData)) list = rawSupplierData;
      else if (rawSupplierData && typeof rawSupplierData === "object") {
        const raw = rawSupplierData as any;
        if (Array.isArray(raw.supplierList)) list = raw.supplierList;
        else if (Array.isArray(raw.partyList)) list = raw.partyList;
        else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
        else if (Array.isArray(raw.data)) list = raw.data;
      }
    }

    const filtered = list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1") return false;
      const type = String(p.type || p.partyType || p.party_type || p.role || "").toUpperCase();
      return type.includes("SUPPLIER") || type.includes("VENDOR") || type.includes("BOTH");
    });

    const supMap = new Map<string, PartyItem>();
    filtered.forEach((p: any) => {
      const key = String(p.id ?? p.partyId ?? p.name ?? "").trim();
      if (key) {
        supMap.set(key, {
          id: p.id ?? p.partyId,
          partyId: p.id ?? p.partyId,
          name: p.name || p.partyName || "Supplier",
          partyName: p.name || p.partyName || "Supplier",
          phone: p.phone || p.partyPhone || "",
          partyPhone: p.phone || p.partyPhone || "",
          address: p.address || p.partyAddress || "",
          type: "SUPPLIER",
        });
      }
    });

    // Also include any supplier from actual purchases
    rawPurchases.forEach((pur: any) => {
      const supId = pur.supplierId || pur.supplier_id;
      const supName = pur.supplierName || pur.supplier_name;
      const key = String(supId ?? supName ?? "").trim();
      if (key && !supMap.has(key)) {
        supMap.set(key, {
          id: supId || supName,
          partyId: supId || supName,
          name: supName || "Supplier",
          partyName: supName || "Supplier",
          phone: pur.supplierPhone || pur.supplier_phone || "",
          partyPhone: pur.supplierPhone || pur.supplier_phone || "",
          address: pur.supplierAddress || pur.supplier_address || "",
          type: "SUPPLIER",
        });
      }
    });

    return Array.from(supMap.values());
  }, [rawSupplierData, rawPurchases]);

  // Helper to extract clean YYYY-MM-DD from purchase
  const getPurchaseDateString = (p: any): string => {
    if (!p) return "";
    const rawDate = p.purchaseDate || p.date || p.salesDate || p.createdAt || p.created_at;
    if (rawDate) {
      if (typeof rawDate === "string") {
        const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
      const d = moment(rawDate);
      if (d.isValid()) return d.format("YYYY-MM-DD");
    }

    const inv = String(p.invoiceNo || p.invoice_no || "");
    const dtMatch = inv.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
    if (dtMatch) {
      return `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
    }

    return "";
  };

  // Filtering
  const filteredPurchases = useMemo(() => {
    return rawPurchases.filter((purchase: any) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inv = String(purchase.invoiceNo || purchase.invoice_no || "").toLowerCase();
        const ord = String((purchase as any).orderNo || (purchase as any).order_no || "").toLowerCase();
        const ch = String(purchase.challanNo || purchase.challan_no || "").toLowerCase();
        const sName = String(purchase.supplierName || purchase.supplier_name || "").toLowerCase();
        const sPhone = String(purchase.supplierPhone || purchase.supplier_phone || "").toLowerCase();
        if (!inv.includes(q) && !ord.includes(q) && !ch.includes(q) && !sName.includes(q) && !sPhone.includes(q)) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter && statusFilter !== "all") {
        const grandTotal = Number(purchase.grandTotal ?? purchase.grand_total ?? purchase.totalAmount ?? 0);
        const paidAmount = Number(purchase.paidAmount ?? purchase.paid_amount ?? 0);
        const dueAmount = Number(purchase.dueAmount ?? purchase.due_amount ?? Math.max(0, grandTotal - paidAmount));
        const s = String(purchase.status || "").toUpperCase();

        if (statusFilter === "PAID") {
          if (dueAmount > 0 || s === "DUE" || s === "PARTIAL") return false;
        } else if (statusFilter === "PARTIAL") {
          if (dueAmount <= 0 || paidAmount <= 0) return false;
        } else if (statusFilter === "DUE") {
          if (paidAmount > 0 && dueAmount <= 0) return false;
        }
      }

      // 3. Payment Method
      if (paymentMethodFilter && paymentMethodFilter !== "all") {
        const pMethod = String(purchase.paymentType || purchase.payment_type || "CASH").toUpperCase();
        if (!pMethod.includes(paymentMethodFilter.toUpperCase())) return false;
      }

      // 4. Supplier Filter
      if (supplierFilter && supplierFilter !== "all") {
        const sId = String(purchase.supplierId ?? purchase.supplier_id ?? "");
        const sName = String(purchase.supplierName ?? purchase.supplier_name ?? "");
        const filterVal = String(supplierFilter).trim().toLowerCase();
        if (sId.toLowerCase() !== filterVal && sName.toLowerCase() !== filterVal) {
          return false;
        }
      }

      // 5. Date Range Filter
      if (customStartDate || customEndDate) {
        const purchaseDateStr = getPurchaseDateString(purchase);
        if (!purchaseDateStr) return false;
        if (customStartDate && purchaseDateStr < customStartDate) return false;
        if (customEndDate && purchaseDateStr > customEndDate) return false;
      } else if (dateFilter && dateFilter !== "all") {
        const purchaseDateStr = getPurchaseDateString(purchase);
        if (!purchaseDateStr) return false;

        const todayStr = moment().format("YYYY-MM-DD");
        const tomorrowStr = moment().add(1, "day").format("YYYY-MM-DD");
        const yesterdayStr = moment().subtract(1, "day").format("YYYY-MM-DD");

        if (dateFilter === "today") {
          if (purchaseDateStr !== todayStr) return false;
        } else if (dateFilter === "tomorrow") {
          if (purchaseDateStr !== tomorrowStr) return false;
        } else if (dateFilter === "yesterday") {
          if (purchaseDateStr !== yesterdayStr) return false;
        } else if (dateFilter === "this_week" || dateFilter === "thisWeek" || dateFilter === "last7days") {
          const startOfWeek = moment().startOf("week").format("YYYY-MM-DD");
          const endOfWeek = moment().endOf("week").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfWeek || purchaseDateStr > endOfWeek) return false;
        } else if (dateFilter === "this_month" || dateFilter === "thisMonth") {
          const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
          const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfMonth || purchaseDateStr > endOfMonth) return false;
        } else if (dateFilter === "last_month" || dateFilter === "lastMonth") {
          const startOfLastMonth = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
          const endOfLastMonth = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfLastMonth || purchaseDateStr > endOfLastMonth) return false;
        } else if (dateFilter === "this_year" || dateFilter === "thisYear") {
          const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
          const endOfYear = moment().endOf("year").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfYear || purchaseDateStr > endOfYear) return false;
        }
      }

      return true;
    });
  }, [
    rawPurchases,
    searchQuery,
    statusFilter,
    paymentMethodFilter,
    supplierFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Sorting
  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a: any, b: any) => {
      if (sortBy === "latest") {
        const dateA = a.purchaseDate || a.date;
        const dateB = b.purchaseDate || b.date;
        return moment(dateB).diff(moment(dateA));
      }
      if (sortBy === "oldest") {
        const dateA = a.purchaseDate || a.date;
        const dateB = b.purchaseDate || b.date;
        return moment(dateA).diff(moment(dateB));
      }
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        const amtA = Number(a.grandTotal ?? a.grand_total ?? a.totalAmount ?? 0);
        const amtB = Number(b.grandTotal ?? b.grand_total ?? b.totalAmount ?? 0);
        return amtB - amtA;
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        const amtA = Number(a.grandTotal ?? a.grand_total ?? a.totalAmount ?? 0);
        const amtB = Number(b.grandTotal ?? b.grand_total ?? b.totalAmount ?? 0);
        return amtA - amtB;
      }
      if (sortBy === "supplier_a_to_z") {
        const supA = String(a.supplierName || a.supplier_name || "").toLowerCase();
        const supB = String(b.supplierName || b.supplier_name || "").toLowerCase();
        return supA.localeCompare(supB);
      }
      if (sortBy === "supplier_z_to_a") {
        const supA = String(a.supplierName || a.supplier_name || "").toLowerCase();
        const supB = String(b.supplierName || b.supplier_name || "").toLowerCase();
        return supB.localeCompare(supA);
      }
      return 0;
    });
  }, [filteredPurchases, sortBy]);

  // KPI Stats
  const stats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedPurchases.forEach((purchase: any) => {
      const gTotal = Number(purchase.grandTotal ?? purchase.grand_total ?? purchase.totalAmount ?? 0);
      const paid = Number(purchase.paidAmount ?? purchase.paid_amount ?? 0);
      const due = Number(purchase.dueAmount ?? purchase.due_amount ?? Math.max(0, gTotal - paid));

      totalAmount += gTotal;
      totalPaid += paid;
      totalDue += due;
    });

    return {
      totalCount: sortedPurchases.length,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [sortedPurchases]);

  // Pagination
  const totalCount = sortedPurchases.length;
  const pageCount = Math.ceil(totalCount / dataLimit) || 1;
  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPageNumber - 1) * dataLimit;
    return sortedPurchases.slice(startIndex, startIndex + dataLimit);
  }, [sortedPurchases, currentPageNumber, dataLimit]);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // Actions
  const handleView = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsInvoiceModalOpen(true);
  };

  const handleReturn = (purchase: PurchaseItem) => {
    navigate("/admin/create-purchase-return", {
      state: { purchase },
    });
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Purchase Orders (Return)"
          headerDescription="View and select purchase orders to initiate supplier returns or check return eligibility"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />
          <Button
            label="Create Return"
            onClick={() => navigate("/admin/create-purchase-return")}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            icon={<FaUndoAlt className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <PurchaseStats
        totalCount={stats.totalCount}
        totalAmount={stats.totalAmount}
        totalPaid={stats.totalPaid}
        totalDue={stats.totalDue}
      />

      {/* Main Table */}
      <PurchaseReturnPurchaseTable
        purchases={paginatedPurchases}
        exportablePurchases={sortedPurchases}
        totalCount={totalCount}
        isLoading={isLoading}
        isFetching={isFetching}
        pageCount={pageCount}
        currentPageNumber={currentPageNumber}
        setCurrentPageNumber={setCurrentPageNumber}
        dataLimit={dataLimit}
        setDataLimit={setDataLimit}
        handlePagination={handlePagination}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentMethodFilter={paymentMethodFilter}
        setPaymentMethodFilter={setPaymentMethodFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        suppliersList={suppliersList}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        sortBy={sortBy}
        setSortBy={setSortBy}
        returnedInvoiceSet={returnedInvoiceSet}
        onReturn={handleReturn}
        onView={handleView}
        onPrint={handlePrint}
      />

      {/* Printable Invoice Modal */}
      <PurchaseInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedPurchaseForInvoice(null);
        }}
        purchase={selectedPurchaseForInvoice}
      />
    </div>
  );
};

export default PurchaseReturnPurchasesPage;
