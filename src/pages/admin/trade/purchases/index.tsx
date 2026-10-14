import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { FaPlus, FaSlidersH } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import DeleteModal from "@/components/modal/DeleteModal";
import PurchaseStats from "./components/PurchaseStats";
import PurchaseTable from "./components/PurchaseTable";
import PurchaseInvoiceModal from "./components/PurchaseInvoiceModal";
import ChallanSettingsModal from "./components/ChallanSettingsModal";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { purchaseListQueryKey, partyListQueryKey, productListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { PurchaseItem, PartyItem } from "@/types";

const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { postMutation, handleApiMutation } = useAPI();

  // 1. Fetch Purchase List from POST /get-purchase-list
  const {
    data: rawPurchaseData,
    isLoading,
    isFetching,
    refetch: refetchPurchases,
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

  // Extract all purchases from backend response
  const allPurchases: PurchaseItem[] = useMemo(() => {
    if (Array.isArray(rawPurchaseData)) return rawPurchaseData;
    if (rawPurchaseData && typeof rawPurchaseData === "object") {
      const raw = rawPurchaseData as any;
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
  }, [rawPurchaseData]);

  // 2. Fetch Suppliers from POST /get-party-info-list
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () => {
      const response = await postData<any>({
        url: apiConfig.party?.partyListUrl || "get-party-info-list",
        body: { accessUser: buildAccessUser() },
      });
      return response;
    },
    staleTime: 60000,
  });

  const suppliersList: PartyItem[] = useMemo(() => {
    let list: any[] = [];
    if (rawPartyData) {
      if (Array.isArray(rawPartyData)) {
        list = rawPartyData;
      } else if (rawPartyData.data && Array.isArray(rawPartyData.data)) {
        list = rawPartyData.data;
      } else if (rawPartyData.partyInfoList && Array.isArray(rawPartyData.partyInfoList)) {
        list = rawPartyData.partyInfoList;
      } else if (rawPartyData.partyList && Array.isArray(rawPartyData.partyList)) {
        list = rawPartyData.partyList;
      } else if (rawPartyData.supplierList && Array.isArray(rawPartyData.supplierList)) {
        list = rawPartyData.supplierList;
      }
    }

    const filteredFromParties = list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1") return false;
      const t = String(p.type || p.partyType || p.party_type || p.role || "").toUpperCase();
      return t.includes("SUPPLIER") || t.includes("BOTH") || t.includes("VENDOR");
    });

    const suppliersMap = new Map<string, PartyItem>();

    filteredFromParties.forEach((p: any) => {
      const key = String(p.id ?? p.partyId ?? p.name ?? "").trim();
      if (key) {
        suppliersMap.set(key, {
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

    // Also include any supplier present in actual purchases
    allPurchases.forEach((pur: any) => {
      const supName = String(pur.supplierName || pur.supplier_name || "").trim();
      const supId = String(pur.supplierId || pur.supplier_id || "").trim();
      const key = supId || supName;
      if (key && !suppliersMap.has(key) && !suppliersMap.has(supName)) {
        suppliersMap.set(key, {
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

    return Array.from(suppliersMap.values());
  }, [rawPartyData, allPurchases]);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination State
  const [dataLimit, setDataLimit] = useState<number>(10);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPageNumber(1);
  };

  // Modals state
  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState<PurchaseItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);
  const [selectedPurchaseForDelete, setSelectedPurchaseForDelete] = useState<PurchaseItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

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

  // Filter purchases in-memory for UI responsiveness
  const filteredPurchases = useMemo(() => {
    return allPurchases.filter((purchase) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
      if (statusFilter && statusFilter !== "all") {
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
      if (paymentMethodFilter && paymentMethodFilter !== "all") {
        const method = (purchase.paymentType || "").toUpperCase();
        if (!method.includes(paymentMethodFilter.toUpperCase())) {
          return false;
        }
      }

      // 4. Supplier Filter
      if (supplierFilter && supplierFilter !== "all") {
        const supId = String(purchase.supplierId ?? (purchase as any).supplier_id ?? "");
        const supName = String(purchase.supplierName ?? (purchase as any).supplier_name ?? "");
        const filterVal = String(supplierFilter).trim().toLowerCase();
        if (
          supId.toLowerCase() !== filterVal &&
          supName.toLowerCase() !== filterVal
        ) {
          return false;
        }
      }

      // 5. Date Filter (Custom Start/End Date Range or Presets)
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
        }
      }

      return true;
    });
  }, [allPurchases, searchQuery, statusFilter, paymentMethodFilter, supplierFilter, dateFilter, customStartDate, customEndDate]);

  // Sort purchases (Recent first by default)
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
      case "oldest": {
        return [...filteredPurchases].sort((a, b) => {
          const dateA = a.createdAt || a.purchaseDate || a.date || "";
          const dateB = b.createdAt || b.purchaseDate || b.date || "";
          if (dateA && dateB) {
            const diff = moment(dateA).diff(moment(dateB));
            if (!isNaN(diff) && diff !== 0) return diff;
          }
          const idA = Number(a.id ?? 0);
          const idB = Number(b.id ?? 0);
          return idA - idB;
        });
      }
      case "latest":
      default: {
        return [...filteredPurchases].sort((a, b) => {
          const dateA = a.createdAt || a.purchaseDate || a.date || "";
          const dateB = b.createdAt || b.purchaseDate || b.date || "";
          if (dateA && dateB) {
            const diff = moment(dateB).diff(moment(dateA));
            if (!isNaN(diff) && diff !== 0) return diff;
          }
          const idA = Number(a.id ?? 0);
          const idB = Number(b.id ?? 0);
          return idB - idA;
        });
      }
    }
  }, [filteredPurchases, sortBy]);

  // Aggregate stats calculations for UI Cards
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
    setStatusFilter("");
    setPaymentMethodFilter("");
    setSupplierFilter("");
    setSortBy("latest");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
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
    const pId = selectedPurchaseForDelete.id ?? selectedPurchaseForDelete.purchaseId ?? selectedPurchaseForDelete.invoiceNo;
    const invNo = selectedPurchaseForDelete.invoiceNo;

    await handleApiMutation({
      mutation: postMutation,
      url: "delete-purchases",
      body: {
        accessUser: buildAccessUser(),
        id: pId,
        purchaseId: pId,
        invoiceNo: invNo,
      },
      invalidateQueryKey: [purchaseListQueryKey, productListQueryKey],
      showSuccessMessage: true,
      showErrorMessage: true,
    });

    handleCloseDeleteModal();
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
        isLoading={isLoading}
        isFetching={isFetching}
        pageCount={pageCount}
        currentPageNumber={currentPageNumber}
        setCurrentPageNumber={setCurrentPageNumber}
        dataLimit={dataLimit}
        setDataLimit={setDataLimit}
        handlePagination={handlePagination}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
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
