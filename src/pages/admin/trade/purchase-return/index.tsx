import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { FaPlus, FaShoppingBag, FaUndoAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PurchaseReturnStats from "./components/PurchaseReturnStats";
import PurchaseReturnTable from "./components/PurchaseReturnTable";
import PurchaseReturnInvoiceModal from "./components/PurchaseReturnInvoiceModal";
import PurchaseReturnPurchaseTable from "./components/PurchaseReturnPurchaseTable";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import apiConfig from "@/config/api.json";
import { purchaseAndReturnQueryKey, partyListQueryKey, purchaseListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { PurchaseReturnItem, PartyItem, PurchaseItem } from "@/types";
import { extractPurchaseReturnRemarks } from "./constants/returnReasons";

type PartyListResponse =
  | PartyItem[]
  | { supplierList?: PartyItem[]; partyList?: PartyItem[]; partyInfoList?: PartyItem[]; data?: PartyItem[] };

type ListResponse = Record<string, unknown>;

// The purchase tab table uses "" for its "All" options, the return table uses "all"
const isFilterActive = (value: string) => value !== "" && value !== "all";

const PurchaseReturnPage: React.FC = () => {
  const navigate = useNavigate();

  // Active View Tab: "returns" | "purchases"
  const [activeTab, setActiveTab] = useState<"returns" | "purchases">("returns");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturnItem | null>(null);
  const [autoPrintModal, setAutoPrintModal] = useState<boolean>(false);

  // Purchase View Modal
  const [selectedPurchaseForInvoice, setSelectedPurchaseForInvoice] = useState<PurchaseItem | null>(null);
  const [isPurchaseInvoiceModalOpen, setIsPurchaseInvoiceModalOpen] = useState<boolean>(false);

  // 1. Fetch Suppliers for filter dropdown
  const { data: rawSupplierData } = useQuery({
    queryKey: [partyListQueryKey, "SUPPLIER"],
    queryFn: () =>
      postData<PartyListResponse>({
        url: apiConfig.party.partyListUrl,
        body: { accessUser: buildAccessUser() },
      }),
    staleTime: 5 * 60 * 1000,
  });

  const suppliersList: PartyItem[] = useMemo(() => {
    const raw = rawSupplierData as PartyListResponse | undefined;
    let list: PartyItem[] = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw) {
      if (Array.isArray(raw.supplierList)) list = raw.supplierList;
      else if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    const filtered = list.filter((p) => {
      const isDel = String(p.isDeleted ?? p.is_deleted ?? "").trim().toUpperCase();
      if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1") return false;
      const type = String(p.type || p.partyType || p.party_type || p.role || "").toUpperCase();
      return type.includes("SUPPLIER") || type.includes("VENDOR") || type.includes("BOTH");
    });

    const supMap = new Map<string, PartyItem>();
    filtered.forEach((p) => {
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

    return Array.from(supMap.values());
  }, [rawSupplierData]);

  // 2. Fetch from /get-purchase-and-return-list API (Shared cache key with Form and PurchasesPage)
  const {
    data: apiReturnsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [purchaseAndReturnQueryKey],
    queryFn: async () => {
      const res = (await postData<ListResponse>({
        url: apiConfig.purchaseReturn.getPurchaseAndReturnListUrl,
        body: { accessUser: buildAccessUser() },
      })) as ListResponse;

      const list = res?.data || res?.returns || res?.purchaseAndReturnList || res?.purchaseReturnList || [];
      return Array.isArray(list) ? list : [];
    },
    staleTime: 60 * 1000,
  });

  const rawReturns: PurchaseReturnItem[] = useMemo(() => {
    if (!Array.isArray(apiReturnsData)) return [];

    const returnsList: PurchaseReturnItem[] = [];
    apiReturnsData.forEach((item: any) => {
      const isReturn =
        Boolean(item.hasReturn) ||
        Boolean(item.returnNo) ||
        Boolean(item.returnGrandTotal) ||
        String(item.returnType || "").toUpperCase() === "RETURN" ||
        String(item.status || "").toUpperCase() === "RETURN" ||
        (item.refNo && String(item.refNo).startsWith("PR-")) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

      if (isReturn) {
        const noteText = extractPurchaseReturnRemarks(item);
        const details = item.returnDetails || item.purchaseReturnDetails || item.details || [];

        returnsList.push({
          id: item.id || item.returnId || item.return_id,
          returnNo: item.returnNo || item.refNo || (item.orderNo ? `PR-${item.orderNo}` : `PR-${item.id}`),
          orderNo: item.orderNo || item.order_no || item.purchaseInvoiceNo || item.invoiceNo || "",
          purchaseInvoiceNo: item.purchaseInvoiceNo || item.invoiceNo || "-",
          invoiceNo: item.purchaseInvoiceNo || item.invoiceNo || "-",
          challanNo: item.challanNo || item.challan_no || "",
          returnDate: item.returnDate || item.purchaseDate || item.date || moment().format("YYYY-MM-DD"),
          createdAt: item.createdAt || item.created_at || item.createdDate || item.date || item.returnDate,
          supplierId: item.supplierId,
          supplierName: item.supplierName || "Supplier",
          supplierPhone: item.supplierPhone,
          supplierAddress: item.supplierAddress,
          totalAmount: Number(item.totalAmount ?? item.returnGrandTotal ?? item.refundAmount ?? 0),
          discount: Number(item.discount ?? 0),
          vat: Number(item.vat ?? 0),
          deliveryCharge: Number(item.deliveryCharge ?? item.delivery_charge ?? 0),
          grandTotal: Number(item.returnGrandTotal ?? item.grandTotal ?? item.refundAmount ?? 0),
          refundAmount: Number(item.returnRefundAmount ?? item.refundAmount ?? item.returnGrandTotal ?? item.grandTotal ?? 0),
          paymentType: item.paymentType || "CASH",
          status: item.status || "Completed",
          note: noteText,
          remarks: noteText,
          cashReceived: Number(item.cashReceived ?? 0),
          cardReceived: Number(item.cardReceived ?? 0),
          mfsReceived: Number(item.mfsReceived ?? 0),
          dueAmount: Number(item.dueAmount ?? 0),
          bankName: item.bankName,
          mfsName: item.mfsName,
          returnDetails: details,
          itemsCount: details.length || 1,
        });
      }
    });
    return returnsList;
  }, [apiReturnsData]);

  // 3. Fetch Purchases from Backend API (for Purchase List view & returning)
  const {
    data: purchasesData,
    isLoading: isPurchasesLoading,
    isFetching: isPurchasesFetching,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: async () => {
      const res = (await postData<ListResponse>({
        url: apiConfig.purchase.purchaseListUrl,
        body: { accessUser: buildAccessUser() },
      })) as ListResponse;

      const list =
        res?.purchaseList ||
        res?.purchasesList ||
        res?.data ||
        res?.purchases ||
        res?.purchaseInfoList ||
        [];

      return Array.isArray(list) ? (list as PurchaseItem[]) : [];
    },
    staleTime: 60 * 1000,
  });

  const rawPurchases: PurchaseItem[] = useMemo(() => {
    if (Array.isArray(purchasesData)) return purchasesData;
    return [];
  }, [purchasesData]);

  // Set of invoices/orders that have already been returned
  const returnedInvoiceSet = useMemo(() => {
    const set = new Set<string>();
    rawReturns.forEach((item) => {
      // NOTE: Do NOT add item.id because item.id is the return record ID, which would incorrectly collide with purchase.id
      [item.purchaseInvoiceNo, item.invoiceNo, item.orderNo, item.challanNo, (item as any).purchaseId, (item as any).purchase_id].forEach((value) => {
        const key = String(value ?? "").trim().toLowerCase();
        if (key && key !== "-") set.add(key);
      });
    });
    return set;
  }, [rawReturns]);

  // Filtering for Purchases
  const filteredPurchases = useMemo(() => {
    return rawPurchases.filter((purchase) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inv = String(purchase.invoiceNo || "").toLowerCase();
        const challan = String(purchase.challanNo || "").toLowerCase();
        const sName = String(purchase.supplierName || "").toLowerCase();
        const sPhone = String(purchase.supplierPhone || "").toLowerCase();
        if (!inv.includes(q) && !challan.includes(q) && !sName.includes(q) && !sPhone.includes(q)) {
          return false;
        }
      }

      // 2. Status Filter
      if (isFilterActive(statusFilter)) {
        const grandTotal = Number(purchase.grandTotal ?? purchase.totalAmount ?? 0);
        const paidAmount = Number(purchase.paidAmount ?? 0);
        const dueAmount = Number(purchase.dueAmount ?? Math.max(0, grandTotal - paidAmount));
        const s = String(purchase.status || "").toUpperCase();

        if (statusFilter === "PAID") {
          if (s !== "PAID" && dueAmount > 0) return false;
        } else if (statusFilter === "PARTIAL") {
          if (s !== "PARTIAL" && !(dueAmount > 0 && paidAmount > 0)) return false;
        } else if (statusFilter === "DUE") {
          if (s !== "PENDING" && s !== "DUE" && !(dueAmount > 0 && paidAmount === 0)) return false;
        }
      }

      // 3. Payment Method
      if (isFilterActive(paymentMethodFilter)) {
        const pMethod = String(purchase.paymentType || "CASH").toUpperCase();
        if (pMethod !== paymentMethodFilter.toUpperCase()) return false;
      }

      // 4. Supplier Filter
      if (isFilterActive(supplierFilter)) {
        const sId = String(purchase.supplierId || "");
        const sName = String(purchase.supplierName || "");
        const filterVal = String(supplierFilter).trim().toLowerCase();
        if (sId.toLowerCase() !== filterVal && sName.toLowerCase() !== filterVal) {
          return false;
        }
      }

      // 5. Date Range Filter (the date picker sends a start/end date for every preset)
      if (dateFilter !== "all") {
        const purchaseDateStr = purchase.purchaseDate || purchase.date || purchase.createdAt;
        if (!purchaseDateStr) return true;
        const purchaseDate = moment(purchaseDateStr);
        if (customStartDate && purchaseDate.isBefore(moment(customStartDate).startOf("day"))) return false;
        if (customEndDate && purchaseDate.isAfter(moment(customEndDate).endOf("day"))) return false;
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

  // Sorting for Purchases
  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a, b) => {
      if (sortBy === "latest") {
        const dateA = a.purchaseDate || a.date || a.createdAt;
        const dateB = b.purchaseDate || b.date || b.createdAt;
        return moment(dateB).diff(moment(dateA));
      }
      if (sortBy === "oldest") {
        const dateA = a.purchaseDate || a.date || a.createdAt;
        const dateB = b.purchaseDate || b.date || b.createdAt;
        return moment(dateA).diff(moment(dateB));
      }
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        return Number(b.grandTotal ?? b.totalAmount ?? 0) - Number(a.grandTotal ?? a.totalAmount ?? 0);
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        return Number(a.grandTotal ?? a.totalAmount ?? 0) - Number(b.grandTotal ?? b.totalAmount ?? 0);
      }
      if (sortBy === "supplier_a_to_z") {
        return String(a.supplierName || "").localeCompare(String(b.supplierName || ""));
      }
      if (sortBy === "supplier_z_to_a") {
        return String(b.supplierName || "").localeCompare(String(a.supplierName || ""));
      }
      return 0;
    });
  }, [filteredPurchases, sortBy]);

  // Purchases Pagination
  const purchasesTotalCount = sortedPurchases.length;
  const purchasesPageCount = Math.ceil(purchasesTotalCount / dataLimit) || 1;
  const paginatedPurchases = useMemo(() => {
    const startIndex = (currentPageNumber - 1) * dataLimit;
    return sortedPurchases.slice(startIndex, startIndex + dataLimit);
  }, [sortedPurchases, currentPageNumber, dataLimit]);

  // Filtering
  const filteredReturns = useMemo(() => {
    return rawReturns.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ordNo = String(item.orderNo || "").toLowerCase();
        const retNo = String(item.returnNo || "").toLowerCase();
        const invNo = String(item.purchaseInvoiceNo || item.invoiceNo || "").toLowerCase();
        const sName = String(item.supplierName || "").toLowerCase();
        const sPhone = String(item.supplierPhone || "").toLowerCase();
        const remarks = String(item.note || item.remarks || "").toLowerCase();
        if (
          !ordNo.includes(q) &&
          !retNo.includes(q) &&
          !invNo.includes(q) &&
          !sName.includes(q) &&
          !sPhone.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      // 2. Supplier Filter
      if (isFilterActive(supplierFilter)) {
        const sId = String(item.supplierId ?? "").trim().toLowerCase();
        const sName = String(item.supplierName ?? "").trim().toLowerCase();
        const filterVal = supplierFilter.toLowerCase();
        if (sId !== filterVal && !sName.includes(filterVal)) {
          return false;
        }
      }

      // 3. Payment Method Filter
      if (isFilterActive(paymentMethodFilter)) {
        if (String(item.paymentType || "").toUpperCase() !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      // 4. Date Filter (the date picker sends a start/end date for every preset)
      if (dateFilter !== "all") {
        const dateStr = item.returnDate || item.createdAt;
        if (dateStr) {
          const itemDate = moment(dateStr);
          if (customStartDate && itemDate.isBefore(moment(customStartDate).startOf("day"))) return false;
          if (customEndDate && itemDate.isAfter(moment(customEndDate).endOf("day"))) return false;
        }
      }

      return true;
    });
  }, [
    rawReturns,
    searchQuery,
    supplierFilter,
    paymentMethodFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Sorting
  const sortedReturns = useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.returnDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.returnDate || 0).getTime();
      const idA = Number(a.id || a.returnId || 0);
      const idB = Number(b.id || b.returnId || 0);
      const amountA = Number(a.refundAmount ?? a.grandTotal ?? 0);
      const amountB = Number(b.refundAmount ?? b.grandTotal ?? 0);

      if (sortBy === "oldest") {
        if (timeA !== timeB) return timeA - timeB;
        return idA - idB;
      }
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") return amountB - amountA;
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") return amountA - amountB;

      // Default: Latest on top (compare timestamp first, then id)
      if (timeB !== timeA) return timeB - timeA;
      return idB - idA;
    });
  }, [filteredReturns, sortBy]);

  // KPIs
  const stats = useMemo(() => {
    let totalRefund = 0;
    let cashRefund = 0;
    let creditAdjust = 0;

    sortedReturns.forEach((r) => {
      const amt = Number(r.refundAmount ?? r.grandTotal ?? 0);
      totalRefund += amt;
      const p = String(r.paymentType || "CASH").toUpperCase();
      if (p === "CASH") cashRefund += amt;
      else if (p === "CREDIT") creditAdjust += amt;
    });

    return {
      totalCount: sortedReturns.length,
      totalRefundAmount: totalRefund,
      totalCashRefund: cashRefund,
      totalCreditAdjust: creditAdjust,
    };
  }, [sortedReturns]);

  // Pagination
  const totalCount = sortedReturns.length;
  const pageCount = Math.ceil(totalCount / dataLimit) || 1;
  const paginatedReturns = useMemo(() => {
    const startIndex = (currentPageNumber - 1) * dataLimit;
    return sortedReturns.slice(startIndex, startIndex + dataLimit);
  }, [sortedReturns, currentPageNumber, dataLimit]);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // Actions
  const handleView = (item: PurchaseReturnItem) => {
    setSelectedReturn(item);
    setAutoPrintModal(false);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (item: PurchaseReturnItem) => {
    setSelectedReturn(item);
    setAutoPrintModal(true);
    setIsInvoiceModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSupplierFilter("all");
    setPaymentMethodFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("latest");
    setCurrentPageNumber(1);
  };

  // Actions for Purchase List
  const handleViewPurchase = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsPurchaseInvoiceModalOpen(true);
  };

  const handleReturnPurchase = (purchase: PurchaseItem) => {
    navigate("/admin/create-purchase-return", { state: { purchase } });
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Purchase Return"
          headerDescription="Manage supplier purchase returns, item quantities, and refund settlements"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton
            onClick={() => {
              refetch();
              refetchPurchases();
            }}
          />
          <Button
            label="Create Return"
            onClick={() => navigate("/admin/create-purchase-return")}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <PurchaseReturnStats
        totalCount={stats.totalCount}
        totalRefundAmount={stats.totalRefundAmount}
        totalCashRefund={stats.totalCashRefund}
        totalCreditAdjust={stats.totalCreditAdjust}
      />

      {/* Tab Switcher: Purchase List vs Purchase Return List (Compact Y-axis) */}
      <div className="flex items-center gap-1.5 border-b border-gray-200/90 -my-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("purchases");
            setCurrentPageNumber(1);
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "purchases"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-sky-50/50 rounded-t-md"
              : "border-transparent text-black hover:bg-gray-50 rounded-t-md"
          }`}
        >
          <FaShoppingBag size={11} />
          <span>Purchase List ({rawPurchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("returns");
            setCurrentPageNumber(1);
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "returns"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-sky-50/50 rounded-t-md"
              : "border-transparent text-black hover:bg-gray-50 rounded-t-md"
          }`}
        >
          <FaUndoAlt size={11} />
          <span>Purchase Return List ({rawReturns.length})</span>
        </button>
      </div>

      {/* Main Table: Either Returns List or Purchase List based on activeTab */}
      {activeTab === "returns" ? (
        <PurchaseReturnTable
          returns={paginatedReturns}
          exportableReturns={sortedReturns}
          totalCount={totalCount}
          isLoading={isLoading}
          pageCount={pageCount}
          currentPageNumber={currentPageNumber}
          setCurrentPageNumber={setCurrentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          handlePagination={handlePagination}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          supplierFilter={supplierFilter}
          setSupplierFilter={setSupplierFilter}
          suppliersList={suppliersList}
          paymentMethodFilter={paymentMethodFilter}
          setPaymentMethodFilter={setPaymentMethodFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onResetFilters={handleResetFilters}
          onView={handleView}
          onPrint={handlePrint}
        />
      ) : (
        <PurchaseReturnPurchaseTable
          purchases={paginatedPurchases}
          exportablePurchases={sortedPurchases}
          totalCount={purchasesTotalCount}
          isLoading={isPurchasesLoading}
          isFetching={isPurchasesFetching}
          pageCount={purchasesPageCount}
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
          onView={handleViewPurchase}
          onReturn={handleReturnPurchase}
        />
      )}

      {/* Printable Debit Note / Return Slip Modal */}
      <PurchaseReturnInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedReturn(null);
          setAutoPrintModal(false);
        }}
        returnData={selectedReturn}
        autoPrint={autoPrintModal}
      />

      {/* Purchase Invoice Modal (when viewing a purchase from the Purchase List tab) */}
      <PurchaseInvoiceModal
        isOpen={isPurchaseInvoiceModalOpen}
        onClose={() => {
          setIsPurchaseInvoiceModalOpen(false);
          setSelectedPurchaseForInvoice(null);
        }}
        purchase={selectedPurchaseForInvoice}
      />
    </div>
  );
};

export default PurchaseReturnPage;
