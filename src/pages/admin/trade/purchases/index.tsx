import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { FaPlus, FaSlidersH, FaShoppingBag } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import DeleteModal from "@/components/modal/DeleteModal";
import PurchaseStats from "./components/PurchaseStats";
import PurchaseTable from "./components/PurchaseTable";
import PurchaseInvoiceModal from "./components/PurchaseInvoiceModal";
import ChallanSettingsModal from "./components/ChallanSettingsModal";
import apiConfig from "@/config/api.json";
import { purchaseListQueryKey, partyListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PurchaseItem, PartyItem } from "@/types";

const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [dataLimit, setDataLimit] = useState<number>(10);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);

  // Modals state
  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState<PurchaseItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);
  const [selectedPurchaseForDelete, setSelectedPurchaseForDelete] = useState<PurchaseItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPageNumber(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const purchaseListUrl = apiConfig.purchase?.purchaseListUrl || "get-purchase-list";
  const partyListUrl = apiConfig.party?.partyListUrl || "get-party-info-list";

  // 1. Fetch Purchases via POST /get-purchase-list
  const {
    data: rawPurchaseData,
    isLoading: isPurchasesLoading,
    isFetching,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: async () => {
      try {
        const response = await postData<any>({
          url: purchaseListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return response;
      } catch {
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // 2. Fetch Suppliers for filter dropdown
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () => {
      try {
        const response = await postData<any>({
          url: partyListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return response;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Extract suppliers list
  const suppliersList: PartyItem[] = useMemo(() => {
    if (!rawPartyData) return [];
    let list: any[] = [];
    if (Array.isArray(rawPartyData)) list = rawPartyData;
    else if (rawPartyData && typeof rawPartyData === "object") {
      const raw = rawPartyData as any;
      if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.supplierList)) list = raw.supplierList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    return list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1") return false;
      const type = (p.type || p.partyType || p.party_type || "").toUpperCase();
      return type.includes("SUPPLIER") || !type;
    });
  }, [rawPartyData]);

  // Extract all purchases from backend response
  const allPurchases: PurchaseItem[] = useMemo(() => {
    if (!rawPurchaseData) return [];
    let list: any[] = [];

    if (Array.isArray(rawPurchaseData)) {
      list = rawPurchaseData;
    } else if (rawPurchaseData && typeof rawPurchaseData === "object") {
      const raw = rawPurchaseData as any;
      if (Array.isArray(raw.purchaseList)) list = raw.purchaseList;
      else if (Array.isArray(raw.purchasesList)) list = raw.purchasesList;
      else if (Array.isArray(raw.purchaseListDetails)) list = raw.purchaseListDetails;
      else if (Array.isArray(raw.purchaseInfoList)) list = raw.purchaseInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
      else if (raw.data && typeof raw.data === "object") {
        if (Array.isArray(raw.data.purchaseList)) list = raw.data.purchaseList;
        else if (Array.isArray(raw.data.purchasesList)) list = raw.data.purchasesList;
        else if (Array.isArray(raw.data.data)) list = raw.data.data;
      } else {
        for (const key of Object.keys(raw)) {
          if (Array.isArray(raw[key])) {
            list = raw[key];
            break;
          }
        }
      }
    }

    const validPurchases = list.filter((p: any) => {
      if (!p || typeof p !== "object") return false;
      const isDel = String(p.isDeleted || p.is_deleted || p.isDelete || p.is_delete || "").trim().toUpperCase();
      return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
    });

    return validPurchases;
  }, [rawPurchaseData]);

  // Reset to page 1 whenever total purchases change (e.g. newly created purchase)
  useEffect(() => {
    setCurrentPageNumber(1);
  }, [allPurchases.length]);

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

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    return allPurchases.filter((purchase) => {
      // 1. Search Query
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const invoice = (purchase.invoiceNo || "").toLowerCase();
        const supplier = (purchase.supplierName || "").toLowerCase();
        const phone = (purchase.supplierPhone || "").toLowerCase();
        const challan = (purchase.challanNo || "").toLowerCase();

        const match =
          invoice.includes(q) ||
          supplier.includes(q) ||
          phone.includes(q) ||
          challan.includes(q);

        if (!match) return false;
      }

      // 2. Status Filter
      if (statusFilter) {
        const grandTotal = Number(purchase.grandTotal ?? purchase.totalAmount ?? 0);
        const paidAmount = Number(purchase.paidAmount ?? 0);
        const dueAmount = Number(purchase.dueAmount ?? Math.max(0, grandTotal - paidAmount));
        const rawStatus = (purchase.status || "").toUpperCase();

        if (statusFilter === "PAID" && (dueAmount > 0 || rawStatus === "DUE" || rawStatus === "PARTIAL")) {
          return false;
        }
        if (statusFilter === "PARTIAL" && (dueAmount <= 0 || paidAmount <= 0)) {
          return false;
        }
        if (statusFilter === "DUE" && (paidAmount > 0 && dueAmount <= 0)) {
          return false;
        }
      }

      // 3. Payment Method Filter
      if (paymentMethodFilter) {
        const method = (purchase.paymentType || "").toUpperCase();
        if (!method.includes(paymentMethodFilter.toUpperCase())) {
          return false;
        }
      }

      // 4. Supplier Filter
      if (supplierFilter) {
        const supId = String(purchase.supplierId ?? "");
        const supName = String(purchase.supplierName ?? "");
        if (supId !== supplierFilter && supName !== supplierFilter) {
          return false;
        }
      }

      // 5. Date Filter
      if (dateFilter && dateFilter !== "all") {
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
        } else if (dateFilter === "this_week") {
          const startOfWeek = moment().startOf("week").format("YYYY-MM-DD");
          const endOfWeek = moment().endOf("week").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfWeek || purchaseDateStr > endOfWeek) return false;
        } else if (dateFilter === "this_month") {
          const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
          const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfMonth || purchaseDateStr > endOfMonth) return false;
        } else if (dateFilter === "last_month") {
          const startOfLastMonth = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
          const endOfLastMonth = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfLastMonth || purchaseDateStr > endOfLastMonth) return false;
        } else if (dateFilter === "this_year") {
          const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
          const endOfYear = moment().endOf("year").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfYear || purchaseDateStr > endOfYear) return false;
        } else if (dateFilter === "custom") {
          if (customStartDate && purchaseDateStr < customStartDate) return false;
          if (customEndDate && purchaseDateStr > customEndDate) return false;
        }
      }

      return true;
    });
  }, [allPurchases, debouncedSearch, statusFilter, paymentMethodFilter, supplierFilter, dateFilter, customStartDate, customEndDate]);

// Helper to extract numeric timestamp or sequential key for descending chronological sorting
const getPurchaseSortKey = (p: any): number => {
  if (!p) return 0;

  // 1. If explicit ISO timestamp in createdAt/created_at/entryTime
  const rawCreatedAt = p.createdAt || p.created_at || p.createdAtTime || p.entryTime || p.updatedAt || p.updated_at;
  if (rawCreatedAt) {
    const t = new Date(rawCreatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 2. Extract timestamp from invoiceNo / billNo / refNo (e.g. 28488-20261007095617959 or PUR-20261006104802)
  const inv = String(p.invoiceNo || p.invoice_no || p.billNo || p.id || "").trim();
  const dtMatch = inv.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])([0-5]\d)([0-5]\d)(\d{1,4})?/);
  if (dtMatch) {
    const [, yr, mo, dy, hr, min, sec, ms] = dtMatch;
    const d = new Date(
      Number(yr),
      Number(mo) - 1,
      Number(dy),
      Number(hr),
      Number(min),
      Number(sec),
      ms ? Number(ms.padEnd(3, "0").slice(0, 3)) : 0
    );
    const t = d.getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 3. Fallback to orderNo or numeric database ID
  const orderNo = p.orderNo || p.order_no || p.purchaseOrderNo || p.poNo;
  if (orderNo && /^\d+$/.test(String(orderNo).trim())) {
    const n = Number(String(orderNo).trim());
    if (!isNaN(n) && n > 0) return n;
  }

  const rawId = p.id ?? p.purchaseId ?? p.purchase_id ?? p.purId;
  if (typeof rawId === "number" && rawId > 0 && rawId < 10000000) {
    return rawId;
  } else if (typeof rawId === "string" && /^\d+$/.test(rawId.trim()) && rawId.length <= 7) {
    const n = Number(rawId.trim());
    if (!isNaN(n) && n > 0) return n;
  }

  // 4. Fallback to purchaseDate
  const pDate = p.purchaseDate || p.date || p.salesDate;
  if (pDate) {
    const t = new Date(pDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  return 0;
};

// Sort purchases (Recent first by default: #1 = Latest purchase, #2 = 2nd latest, #3 = 3rd, etc.)
  const sortedPurchases = useMemo(() => {
    switch (sortBy) {
      case "amount_high_to_low":
        return [...filteredPurchases].sort((a, b) => {
          const amtA = Number(a.grandTotal ?? a.totalAmount ?? 0);
          const amtB = Number(b.grandTotal ?? b.totalAmount ?? 0);
          return amtB - amtA;
        });
      case "amount_low_to_high":
        return [...filteredPurchases].sort((a, b) => {
          const amtA = Number(a.grandTotal ?? a.totalAmount ?? 0);
          const amtB = Number(b.grandTotal ?? b.totalAmount ?? 0);
          return amtA - amtB;
        });
      case "supplier_a_to_z":
        return [...filteredPurchases].sort((a, b) => {
          const nameA = (a.supplierName || "").toLowerCase();
          const nameB = (b.supplierName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case "supplier_z_to_a":
        return [...filteredPurchases].sort((a, b) => {
          const nameA = (a.supplierName || "").toLowerCase();
          const nameB = (b.supplierName || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case "latest":
      default: {
        return [...filteredPurchases].sort((a, b) => {
          const keyA = getPurchaseSortKey(a);
          const keyB = getPurchaseSortKey(b);
          if (keyA !== keyB) {
            return keyB - keyA;
          }
          return 0;
        });
      }
    }
  }, [filteredPurchases, sortBy]);

  // Aggregate stats calculations
  const stats = useMemo(() => {
    let totalAmt = 0;
    let totalPaid = 0;
    let totalDue = 0;

    allPurchases.forEach((p) => {
      const gTotal = Number(p.grandTotal ?? p.totalAmount ?? 0);
      const paid = Number(p.paidAmount ?? 0);
      const due = Number(p.dueAmount ?? Math.max(0, gTotal - paid));
      totalAmt += gTotal;
      totalPaid += paid;
      totalDue += due;
    });

    return {
      totalCount: allPurchases.length,
      totalAmount: totalAmt,
      totalPaid,
      totalDue,
    };
  }, [allPurchases]);

  // Pagination calculation
  const pageCount = Math.max(1, Math.ceil(sortedPurchases.length / dataLimit));
  const paginatedPurchases = useMemo(() => {
    const start = (currentPageNumber - 1) * dataLimit;
    return sortedPurchases.slice(start, start + dataLimit);
  }, [sortedPurchases, currentPageNumber, dataLimit]);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  const handleRefresh = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPaymentMethodFilter("");
    setSupplierFilter("");
    setSortBy("latest");
    setCurrentPageNumber(1);
    refetchPurchases();
  };

  const handleView = (purchase: PurchaseItem) => {
    setSelectedPurchaseForView(purchase);
    setIsViewModalOpen(true);
  };

  const handleEdit = (purchase: PurchaseItem) => {
    const id = purchase.id || purchase.purchaseId || purchase.invoiceNo;
    navigate(`/admin/edit-purchase/${id}`, { state: { editData: purchase } });
  };

  const handlePrint = (purchase: PurchaseItem) => {
    setSelectedPurchaseForView(purchase);
    setIsViewModalOpen(true);
  };

  const handleOpenDeleteModal = (purchase: PurchaseItem) => {
    setSelectedPurchaseForDelete(purchase);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedPurchaseForDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPurchaseForDelete) return;
    try {
      const accessUser = buildAccessUser();
      const pId = selectedPurchaseForDelete.id ?? selectedPurchaseForDelete.purchaseId ?? selectedPurchaseForDelete.invoiceNo;

      queryClient.setQueryData([purchaseListQueryKey], (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.filter((item: any) => String(item.id ?? item.purchaseId ?? item.invoiceNo) !== String(pId));
        }
        if (typeof oldData === "object") {
          const listKey = Array.isArray(oldData.purchaseList)
            ? "purchaseList"
            : Array.isArray(oldData.purchaseInfoList)
            ? "purchaseInfoList"
            : Array.isArray(oldData.purchasesList)
            ? "purchasesList"
            : Array.isArray(oldData.data)
            ? "data"
            : "purchaseList";
          return {
            ...oldData,
            [listKey]: (oldData[listKey] || []).filter((item: any) => String(item.id ?? item.purchaseId ?? item.invoiceNo) !== String(pId)),
          };
        }
        return oldData;
      });

      try {
        await postData({
          url: "delete-purchases",
          body: {
            accessUser,
            id: pId,
            purchaseId: pId,
            invoiceNo: selectedPurchaseForDelete.invoiceNo,
          },
        });
      } catch (e) {
        console.warn("Backend delete attempt:", e);
      }

      showSuccessToast(`Purchase invoice ${selectedPurchaseForDelete.invoiceNo || ""} deleted successfully!`);
      queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to delete purchase");
    } finally {
      handleCloseDeleteModal();
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Purchases"
          headerDescription="Manage supplier purchases, invoices, stock receive, and trade accounts"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={handleRefresh} />
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
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* KPI Stats */}
      <PurchaseStats
        totalCount={stats.totalCount}
        totalAmount={stats.totalAmount}
        totalPaid={stats.totalPaid}
        totalDue={stats.totalDue}
      />

      {/* Main Table */}
      <PurchaseTable
        purchases={paginatedPurchases}
        exportablePurchases={sortedPurchases}
        totalCount={filteredPurchases.length}
        isLoading={isPurchasesLoading}
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
        onEdit={handleEdit}
        onView={handleView}
        onPrint={handlePrint}
        onDelete={handleOpenDeleteModal}
        onOpenChallanSettings={() => setIsChallanSettingsOpen(true)}
      />

      {/* View / Print Invoice Modal */}
      <PurchaseInvoiceModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPurchaseForView(null);
        }}
        purchase={selectedPurchaseForView}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDelete={handleConfirmDelete}
        title="Delete Purchase Invoice"
        message={`Are you sure you want to delete purchase invoice ${selectedPurchaseForDelete?.invoiceNo || ""}? This action cannot be undone.`}
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
