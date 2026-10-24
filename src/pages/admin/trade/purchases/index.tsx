import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import moment from "moment";
import { FaPlus, FaShoppingBag, FaUndoAlt, FaSlidersH } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PurchaseStats from "./components/PurchaseStats";
import PurchaseTable from "./components/PurchaseTable";
import PurchaseInvoiceModal from "./components/PurchaseInvoiceModal";
import ChallanSettingsModal from "./components/ChallanSettingsModal";
import TradeReturnStats from "@/components/trade/TradeReturnStats";
import PurchaseReturnTable from "@/pages/admin/trade/purchase-return/components/PurchaseReturnTable";
import PurchaseReturnInvoiceModal from "@/pages/admin/trade/purchase-return/components/PurchaseReturnInvoiceModal";
import type { PurchaseItem, PurchaseReturnItem, PartyItem } from "@/types";
import { extractPurchaseReturnRemarks } from "@/pages/admin/trade/constants/returnReasons";
import {
  usePurchasesQuery,
  usePurchaseAndReturnsQuery,
  extractReturnedPurchaseKeysSet,
  normalizePurchaseRecord,
  isPurchaseReturnRecord,
} from "./hooks/usePurchaseQueries";
import { useDebounce } from "@/hooks/useDebounce";

const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Tab State: "purchases" | "returns"
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReturnRoute = location.pathname.includes("purchase-return") || searchParams.get("tab") === "returns";
  const [activeTab, setActiveTab] = useState<"purchases" | "returns">(isReturnRoute ? "returns" : "purchases");

  useEffect(() => {
    if (location.pathname.includes("purchase-return") || searchParams.get("tab") === "returns") {
      setActiveTab("returns");
    } else if (location.pathname === "/admin/purchases" && !searchParams.get("tab")) {
      setActiveTab("purchases");
    }
  }, [location.pathname, searchParams]);

  // Shared Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Modals - Purchases
  const [isPurchaseInvoiceModalOpen, setIsPurchaseInvoiceModalOpen] = useState<boolean>(false);
  const [selectedPurchaseForInvoice, setSelectedPurchaseForInvoice] = useState<PurchaseItem | null>(null);
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);

  // Modals - Returns
  const [isReturnInvoiceModalOpen, setIsReturnInvoiceModalOpen] = useState<boolean>(false);
  const [selectedReturnForInvoice, setSelectedReturnForInvoice] = useState<PurchaseReturnItem | null>(null);
  const [autoPrintReturnModal, setAutoPrintReturnModal] = useState<boolean>(false);


  // 1. Authoritative Purchases Query: /get-purchase-list (Single source of truth for Purchases)
  const {
    data: purchasesData,
    isLoading: isPurchasesLoadingQuery,
    isFetching: isPurchasesFetching,
    refetch: refetchPurchases,
  } = usePurchasesQuery();

  // 2. Returns & Return Indicators Query: /get-purchase-and-return-list
  const {
    data: combinedData,
    isLoading: isCombinedLoading,
    isFetching: isCombinedFetching,
    refetch: refetchCombined,
  } = usePurchaseAndReturnsQuery();

  // Single-pass memoized extraction of Purchases and Returns
  const { combinedPurchases, rawReturns } = useMemo(() => {
    const pList: PurchaseItem[] = [];
    const rList: PurchaseReturnItem[] = [];

    if (Array.isArray(combinedData)) {
      combinedData.forEach((item: any) => {
        const isRet = Boolean(item.isReturnRecord) || isPurchaseReturnRecord(item);

        if (isRet) {
          const noteText = extractPurchaseReturnRemarks(item);
          const details = Array.isArray(item.returnDetails) && item.returnDetails.length > 0
            ? item.returnDetails
            : Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0
            ? item.purchaseReturnDetails
            : [];

          rList.push({
            id: item.id || item.returnId,
            returnNo: item.returnNo || (item.orderNo ? `PR-${item.orderNo}` : `PR-${item.id}`),
            orderNo: item.orderNo || "",
            purchaseInvoiceNo: item.purchaseInvoiceNo || item.invoiceNo || "-",
            invoiceNo: item.purchaseInvoiceNo || item.invoiceNo || "-",
            challanNo: item.challanNo || "",
            returnDate: item.returnDate || item.purchaseDate || moment().format("YYYY-MM-DD"),
            createdAt: item.createdAt || item.returnDate,
            supplierId: item.supplierId || item.partyId,
            supplierName: item.supplierName || item.partyName || "Supplier",
            supplierPhone: item.supplierPhone || item.phone,
            supplierAddress: item.supplierAddress || item.address,
            totalAmount: Number(item.totalAmount ?? item.returnGrandTotal ?? 0),
            discount: Number(item.discount ?? 0),
            vat: Number(item.vat ?? 0),
            deliveryCharge: Number(item.deliveryCharge ?? 0),
            grandTotal: Number(item.returnGrandTotal ?? item.grandTotal ?? 0),
            refundAmount: Number(item.returnRefundAmount ?? item.refundAmount ?? item.returnGrandTotal ?? 0),
            paymentType: item.paymentType || "CASH",
            status: item.status || "Completed",
            note: noteText,
            remarks: noteText,
            reason: noteText,
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

        // Purchases must NEVER be excluded, even if a return was made against them
        const isPur = Boolean(item.invoiceNo) || Boolean(item.purchaseInvoiceNo) || (item.orderNo && !item.returnNo);
        if (isPur && !item.isReturnRecord) {
          pList.push(normalizePurchaseRecord(item));
        }
      });
    }

    return { combinedPurchases: pList, rawReturns: rList };
  }, [combinedData]);

  // Final purchases array: uses authoritative purchasesData, or combined purchases as fallback
  const rawPurchases = useMemo(() => {
    if (Array.isArray(purchasesData) && purchasesData.length > 0) return purchasesData;
    if (combinedPurchases.length > 0) return combinedPurchases;
    return [];
  }, [purchasesData, combinedPurchases]);

  // Zero-network suppliers list derived directly from active purchases and returns
  const suppliersList: PartyItem[] = useMemo(() => {
    const supMap = new Map<string, PartyItem>();

    rawPurchases.forEach((p) => {
      const key = String(p.supplierId ?? p.partyId ?? p.supplierName ?? "").trim();
      if (key && !supMap.has(key)) {
        supMap.set(key, {
          id: p.supplierId ?? p.partyId,
          partyId: p.supplierId ?? p.partyId,
          name: p.supplierName || "Supplier",
          partyName: p.supplierName || "Supplier",
          phone: p.supplierPhone || "",
          partyPhone: p.supplierPhone || "",
          address: p.supplierAddress || "",
          type: "SUPPLIER",
        });
      }
    });

    rawReturns.forEach((r) => {
      const key = String(r.supplierId ?? r.partyId ?? r.supplierName ?? "").trim();
      if (key && !supMap.has(key)) {
        supMap.set(key, {
          id: r.supplierId ?? r.partyId,
          partyId: r.supplierId ?? r.partyId,
          name: r.supplierName || "Supplier",
          partyName: r.supplierName || "Supplier",
          phone: r.supplierPhone || "",
          partyPhone: r.supplierPhone || "",
          address: r.supplierAddress || "",
          type: "SUPPLIER",
        });
      }
    });

    return Array.from(supMap.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [rawPurchases, rawReturns]);

  const isPurchasesLoading = isPurchasesLoadingQuery && rawPurchases.length === 0;
  const isReturnsLoading = isCombinedLoading;
  const isReturnsFetching = isCombinedFetching;

  // Set of returned invoice keys for the return icon indicators
  const returnedInvoiceSet = useMemo(() => {
    return extractReturnedPurchaseKeysSet(combinedData || []);
  }, [combinedData]);

  // ----------------- PURCHASES FILTERING & SORTING -----------------
  const filteredPurchases = useMemo(() => {
    return rawPurchases.filter((purchase: any) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const inv = String(purchase.invoiceNo || "").toLowerCase();
        const ord = String(purchase.orderNo || "").toLowerCase();
        const chn = String(purchase.challanNo || "").toLowerCase();
        const sName = String(purchase.supplierName || "").toLowerCase();
        const sPhone = String(purchase.supplierPhone || "").toLowerCase();
        if (!inv.includes(q) && !ord.includes(q) && !chn.includes(q) && !sName.includes(q) && !sPhone.includes(q)) {
          return false;
        }
      }

      if (statusFilter !== "all" && statusFilter !== "") {
        const paidAmount = Number(purchase.paidAmount || 0);
        const dueAmount = Number(purchase.dueAmount || 0);
        const s = String(purchase.status || "").toUpperCase();

        if (statusFilter === "PAID") {
          if (s !== "PAID" && dueAmount > 0) return false;
        } else if (statusFilter === "PARTIAL") {
          if (s !== "PARTIAL" && !(dueAmount > 0 && paidAmount > 0)) return false;
        } else if (statusFilter === "DUE") {
          if (s !== "PENDING" && s !== "DUE" && !(dueAmount > 0 && paidAmount === 0)) return false;
        }
      }

      if (paymentMethodFilter !== "all" && paymentMethodFilter !== "") {
        const method = String(purchase.paymentType || "").toUpperCase();
        if (method !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      if (supplierFilter && supplierFilter !== "all") {
        const supId = String(purchase.supplierId ?? purchase.partyId ?? "").trim().toLowerCase();
        const supName = String(purchase.supplierName ?? "").trim().toLowerCase();
        const filterVal = supplierFilter.toLowerCase();
        if (supId !== filterVal && !supName.includes(filterVal)) {
          return false;
        }
      }

      if (dateFilter && dateFilter !== "all") {
        const rawDate = purchase.purchaseDate || purchase.date || purchase.createdAt;
        const purchaseDate = rawDate ? moment(rawDate) : null;
        if (!purchaseDate || !purchaseDate.isValid()) return true;

        if (dateFilter === "today") {
          if (!purchaseDate.isSame(moment(), "day")) return false;
        } else if (dateFilter === "yesterday") {
          if (!purchaseDate.isSame(moment().subtract(1, "day"), "day")) return false;
        } else if (dateFilter === "last7days") {
          if (!purchaseDate.isAfter(moment().subtract(7, "days"))) return false;
        } else if (dateFilter === "thisMonth") {
          if (!purchaseDate.isSame(moment(), "month")) return false;
        } else if (dateFilter === "lastMonth") {
          if (!purchaseDate.isSame(moment().subtract(1, "month"), "month")) return false;
        } else if (dateFilter === "custom" && customStartDate && customEndDate) {
          if (purchaseDate.isBefore(moment(customStartDate)) || purchaseDate.isAfter(moment(customEndDate).endOf("day"))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    rawPurchases,
    debouncedSearch,
    statusFilter,
    paymentMethodFilter,
    supplierFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a: any, b: any) => {
      const dateA = new Date(a.purchaseDate || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.purchaseDate || b.date || b.createdAt || 0).getTime();
      const amountA = Number(a.grandTotal || 0);
      const amountB = Number(b.grandTotal || 0);

      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        const diff = amountB - amountA;
        return diff !== 0 ? diff : dateB - dateA;
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        const diff = amountA - amountB;
        return diff !== 0 ? diff : dateB - dateA;
      }
      if (sortBy === "supplier_a_to_z") {
        const nameA = String(a.supplierName || "Direct Supplier").trim().toLowerCase();
        const nameB = String(b.supplierName || "Direct Supplier").trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return cmp !== 0 ? cmp : dateB - dateA;
      }
      if (sortBy === "supplier_z_to_a") {
        const nameA = String(a.supplierName || "Direct Supplier").trim().toLowerCase();
        const nameB = String(b.supplierName || "Direct Supplier").trim().toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        return cmp !== 0 ? cmp : dateB - dateA;
      }
      return dateB - dateA; // latest default
    });
  }, [filteredPurchases, sortBy]);

  // Purchases Stats
  const purchasesStats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedPurchases.forEach((p: any) => {
      totalAmount += Number(p.grandTotal || 0);
      totalPaid += Number(p.paidAmount || 0);
      totalDue += Number(p.dueAmount || 0);
    });

    return {
      totalCount: sortedPurchases.length,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [sortedPurchases]);

  // Purchases Pagination
  const purchasesTotalCount = sortedPurchases.length;
  const purchasesPageCount = Math.ceil(purchasesTotalCount / dataLimit) || 1;
  const startPurchasesIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedPurchases = sortedPurchases.slice(startPurchasesIndex, startPurchasesIndex + dataLimit);

  // ----------------- RETURNS FILTERING & SORTING -----------------
  const filteredReturns = useMemo(() => {
    return rawReturns.filter((item) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const ordNo = String(item.orderNo || "").toLowerCase();
        const retNo = String(item.returnNo || "").toLowerCase();
        const invNo = String(item.purchaseInvoiceNo || item.invoiceNo || "").toLowerCase();
        const chnNo = String(item.challanNo || "").toLowerCase();
        const sName = String(item.supplierName || "").toLowerCase();
        const sPhone = String(item.supplierPhone || "").toLowerCase();
        const remarks = String(item.note || item.remarks || "").toLowerCase();
        if (
          !ordNo.includes(q) &&
          !retNo.includes(q) &&
          !invNo.includes(q) &&
          !chnNo.includes(q) &&
          !sName.includes(q) &&
          !sPhone.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      if (supplierFilter && supplierFilter !== "all") {
        const sId = String(item.supplierId ?? "").trim().toLowerCase();
        const sName = String(item.supplierName ?? "").trim().toLowerCase();
        const filterVal = supplierFilter.toLowerCase();
        if (sId !== filterVal && !sName.includes(filterVal)) {
          return false;
        }
      }

      if (paymentMethodFilter !== "all") {
        if (String(item.paymentType || "").toUpperCase() !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      if (dateFilter !== "all") {
        const dateStr = item.returnDate || item.createdAt;
        if (dateStr) {
          const itemDate = moment(dateStr);
          if (dateFilter === "today") {
            if (!itemDate.isSame(moment(), "day")) return false;
          } else if (dateFilter === "yesterday") {
            if (!itemDate.isSame(moment().subtract(1, "day"), "day")) return false;
          } else if (dateFilter === "last7days") {
            if (!itemDate.isAfter(moment().subtract(7, "days"))) return false;
          } else if (dateFilter === "thisMonth") {
            if (!itemDate.isSame(moment(), "month")) return false;
          } else if (dateFilter === "lastMonth") {
            if (!itemDate.isSame(moment().subtract(1, "month"), "month")) return false;
          } else if (dateFilter === "custom" && customStartDate && customEndDate) {
            if (itemDate.isBefore(moment(customStartDate)) || itemDate.isAfter(moment(customEndDate).endOf("day"))) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [
    rawReturns,
    debouncedSearch,
    supplierFilter,
    paymentMethodFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const sortedReturns = useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      const dateA = new Date(a.returnDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.returnDate || b.createdAt || 0).getTime();
      const amountA = Number(a.refundAmount || a.grandTotal || 0);
      const amountB = Number(b.refundAmount || b.grandTotal || 0);

      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        const diff = amountB - amountA;
        return diff !== 0 ? diff : dateB - dateA;
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        const diff = amountA - amountB;
        return diff !== 0 ? diff : dateB - dateA;
      }
      return dateB - dateA; // latest default
    });
  }, [filteredReturns, sortBy]);

  // Returns Stats
  const returnsStats = useMemo(() => {
    let totalRefund = 0;
    let cashRefund = 0;
    let creditAdjust = 0;

    sortedReturns.forEach((r) => {
      const refund = Number(r.refundAmount || r.grandTotal || 0);
      totalRefund += refund;

      const pType = String(r.paymentType || "").toUpperCase();
      if (pType === "CASH") {
        cashRefund += Number(r.cashReceived || refund);
      } else {
        creditAdjust += Number(r.dueAmount || refund);
      }
    });

    return {
      totalCount: sortedReturns.length,
      totalRefundAmount: totalRefund,
      totalCashRefund: cashRefund,
      totalCreditAdjust: creditAdjust,
    };
  }, [sortedReturns]);

  // Returns Pagination
  const returnsTotalCount = sortedReturns.length;
  const returnsPageCount = Math.ceil(returnsTotalCount / dataLimit) || 1;
  const startReturnsIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedReturns = sortedReturns.slice(startReturnsIndex, startReturnsIndex + dataLimit);

  // Pagination Handler
  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
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

  // Actions - Purchases
  const handleViewPurchase = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsPurchaseInvoiceModalOpen(true);
  };

  const handlePrintPurchase = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsPurchaseInvoiceModalOpen(true);
  };

  const handleEditPurchase = (purchase: PurchaseItem) => {
    const id = purchase.id || purchase.purchaseId || purchase.invoiceNo;
    navigate(`/admin/edit-purchase/${id}`, {
      state: { editData: purchase },
    });
  };

  // Actions - Returns
  const handleViewReturn = (item: PurchaseReturnItem) => {
    setSelectedReturnForInvoice(item);
    setAutoPrintReturnModal(false);
    setIsReturnInvoiceModalOpen(true);
  };

  const handlePrintReturn = (item: PurchaseReturnItem) => {
    setSelectedReturnForInvoice(item);
    setAutoPrintReturnModal(true);
    setIsReturnInvoiceModalOpen(true);
  };

  const handleRefetchAll = () => {
    handleResetFilters();
    refetchPurchases();
    refetchCombined();
  };

  const isGlobalLoading = isPurchasesLoading || isReturnsLoading;
  const isGlobalFetching = isPurchasesFetching || isReturnsFetching;

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle={activeTab === "purchases" ? "Purchases" : "Purchase Return"}
          headerDescription={
            activeTab === "purchases"
              ? "Manage supplier purchases, invoices, stock receive, and trade accounts"
              : "Manage supplier purchase returns, item quantities, and refund settlements"
          }
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={handleRefetchAll} isLoading={isGlobalLoading || isGlobalFetching} />
          {activeTab === "purchases" ? (
            <>
              <button
                type="button"
                onClick={() => setIsChallanSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FaSlidersH className="text-gray-500" size={13} />
                <span className="hidden sm:inline">Challan Settings</span>
              </button>
              <Button
                label="New Purchase"
                onClick={() => navigate("/admin/create-purchase")}
                color="var(--primary-color)"
                hoverColor="var(--primary-color-hover)"
                icon={<FaPlus className="text-white text-xs" />}
              />
            </>
          ) : (
            <Button
              label="Create Return"
              onClick={() => navigate("/admin/create-purchase-return")}
              color="var(--primary-color)"
              hoverColor="var(--primary-color-hover)"
              icon={<FaPlus className="text-white text-xs" />}
            />
          )}
        </div>
      </div>

      {/* KPI Cards based on Active Tab */}
      {activeTab === "purchases" ? (
        <PurchaseStats
          totalCount={purchasesStats.totalCount}
          totalAmount={purchasesStats.totalAmount}
          totalPaid={purchasesStats.totalPaid}
          totalDue={purchasesStats.totalDue}
        />
      ) : (
        <TradeReturnStats
          totalCount={returnsStats.totalCount}
          totalRefundAmount={returnsStats.totalRefundAmount}
          totalCashRefund={returnsStats.totalCashRefund}
          totalCreditAdjust={returnsStats.totalCreditAdjust}
        />
      )}

      {/* Unified Tab Switcher: Purchases List vs Purchase Returns List */}
      <div className="flex items-center gap-1.5 border-b border-gray-200/90 -my-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("purchases");
            setCurrentPageNumber(1);
            navigate("/admin/purchases", { replace: true });
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "purchases"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-sky-50/50 rounded-t-md"
              : "border-transparent text-gray-600 hover:text-black hover:bg-gray-50 rounded-t-md"
          }`}
        >
          <FaShoppingBag size={11} />
          <span>Purchases List ({rawPurchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("returns");
            setCurrentPageNumber(1);
            navigate("/admin/purchase-return", { replace: true });
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "returns"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-sky-50/50 rounded-t-md"
              : "border-transparent text-gray-600 hover:text-black hover:bg-gray-50 rounded-t-md"
          }`}
        >
          <FaUndoAlt size={11} />
          <span>Purchase Returns List ({rawReturns.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "purchases" ? (
        <PurchaseTable
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
          onEdit={handleEditPurchase}
          onView={handleViewPurchase}
          onPrint={handlePrintPurchase}
        />
      ) : (
        <PurchaseReturnTable
          returns={paginatedReturns}
          exportableReturns={sortedReturns}
          totalCount={returnsTotalCount}
          isLoading={isReturnsLoading}
          pageCount={returnsPageCount}
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
          onView={handleViewReturn}
          onPrint={handlePrintReturn}
        />
      )}

      {/* View / Print Purchase Invoice Modal */}
      <PurchaseInvoiceModal
        isOpen={isPurchaseInvoiceModalOpen}
        onClose={() => {
          setIsPurchaseInvoiceModalOpen(false);
          setSelectedPurchaseForInvoice(null);
        }}
        purchase={selectedPurchaseForInvoice}
      />

      {/* View / Print Return Invoice Modal */}
      <PurchaseReturnInvoiceModal
        isOpen={isReturnInvoiceModalOpen}
        onClose={() => {
          setIsReturnInvoiceModalOpen(false);
          setSelectedReturnForInvoice(null);
          setAutoPrintReturnModal(false);
        }}
        returnData={selectedReturnForInvoice}
        autoPrint={autoPrintReturnModal}
      />

      {/* Challan Settings Modal */}
      <ChallanSettingsModal
        isOpen={isChallanSettingsOpen}
        onClose={() => setIsChallanSettingsOpen(false)}
      />
    </div>
  );
};

export default Purchases;
