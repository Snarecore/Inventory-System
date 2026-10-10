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

// Mock Suppliers for UI Filter fallback
const mockSuppliers: PartyItem[] = [
  { id: "1", partyId: "1", name: "Rahim Tech Supplies", partyName: "Rahim Tech Supplies", phone: "01711223344", address: "IDB Bhaban, Dhaka", type: "SUPPLIER" },
  { id: "2", partyId: "2", name: "Unique Electronics Ltd", partyName: "Unique Electronics Ltd", phone: "01822334455", address: "Elephant Road, Dhaka", type: "SUPPLIER" },
  { id: "3", partyId: "3", name: "Star IT Wholesale", partyName: "Star IT Wholesale", phone: "01933445566", address: "Agrabad, Chittagong", type: "SUPPLIER" },
  { id: "4", partyId: "4", name: "Global Hardware Imports", partyName: "Global Hardware Imports", phone: "01644556677", address: "Motijheel, Dhaka", type: "SUPPLIER" },
  { id: "5", partyId: "5", name: "FastTech Distribution", partyName: "FastTech Distribution", phone: "01555667788", address: "Zindabazar, Sylhet", type: "SUPPLIER" },
];

// Mock Purchases Data for Pure UI Design Representation
const initialMockPurchases: PurchaseItem[] = [
  {
    id: "PUR-101",
    purchaseId: "PUR-101",
    invoiceNo: "1001-20261008120001",
    purchaseDate: "2026-10-08",
    createdAt: "2026-10-08T12:00:01.000Z",
    supplierId: "1",
    supplierName: "Rahim Tech Supplies",
    supplierPhone: "01711223344",
    supplierAddress: "IDB Bhaban, Dhaka",
    challanNo: "CH-88910",
    challanRefNo: "CH-88910",
    vehicleNo: "DHAKA-METRO-KA-1122",
    driverName: "Rafiqul Islam",
    driverPhone: "01799887766",
    totalAmount: 125000,
    discount: 5000,
    vat: 0,
    deliveryCharge: 1200,
    grandTotal: 121200,
    paidAmount: 121200,
    dueAmount: 0,
    paymentType: "CASH",
    status: "PAID",
    itemCount: 4,
    purchaseDetails: [
      { id: "1", productId: "1", productCode: "P-1001", productName: "Dell Core i5 Laptop", unit: "pcs", quantity: 2, buyPrice: 45000, total: 90000, vat: 0 },
      { id: "2", productId: "2", productCode: "P-1002", productName: "Logitech Wireless Mouse", unit: "pcs", quantity: 10, buyPrice: 1200, total: 12000, vat: 0 },
      { id: "3", productId: "3", productCode: "P-1003", productName: "Mechanical Keyboard RGB", unit: "pcs", quantity: 5, buyPrice: 2600, total: 13000, vat: 0 },
      { id: "4", productId: "4", productCode: "P-1004", productName: "Samsung 500GB NVMe SSD", unit: "pcs", quantity: 2, buyPrice: 5000, total: 10000, vat: 0 },
    ],
  },
  {
    id: "PUR-102",
    purchaseId: "PUR-102",
    invoiceNo: "1001-20261008112045",
    purchaseDate: "2026-10-08",
    createdAt: "2026-10-08T11:20:45.000Z",
    supplierId: "2",
    supplierName: "Unique Electronics Ltd",
    supplierPhone: "01822334455",
    supplierAddress: "Elephant Road, Dhaka",
    challanNo: "CH-88909",
    challanRefNo: "CH-88909",
    vehicleNo: "DHAKA-METRO-CHA-4455",
    driverName: "Abdul Karim",
    driverPhone: "01899887766",
    totalAmount: 85000,
    discount: 2000,
    vat: 0,
    deliveryCharge: 800,
    grandTotal: 83800,
    paidAmount: 50000,
    dueAmount: 33800,
    paymentType: "BANK",
    bankName: "BRAC Bank PLC",
    accountNo: "15012034958001",
    status: "PARTIAL",
    itemCount: 3,
    purchaseDetails: [
      { id: "5", productId: "5", productCode: "P-1005", productName: "LG 24-inch IPS Monitor", unit: "pcs", quantity: 4, buyPrice: 15500, total: 62000, vat: 0 },
      { id: "6", productId: "6", productCode: "P-1006", productName: "D-Link WiFi 6 Router", unit: "pcs", quantity: 5, buyPrice: 3200, total: 16000, vat: 0 },
      { id: "7", productId: "7", productCode: "P-1007", productName: "Cat6 Network Cable 305m", unit: "roll", quantity: 1, buyPrice: 7000, total: 7000, vat: 0 },
    ],
  },
  {
    id: "PUR-103",
    purchaseId: "PUR-103",
    invoiceNo: "1001-20261007174512",
    purchaseDate: "2026-10-07",
    createdAt: "2026-10-07T17:45:12.000Z",
    supplierId: "3",
    supplierName: "Star IT Wholesale",
    supplierPhone: "01933445566",
    supplierAddress: "Agrabad, Chittagong",
    challanNo: "CH-88900",
    challanRefNo: "CH-88900",
    totalAmount: 48000,
    discount: 1000,
    vat: 0,
    deliveryCharge: 500,
    grandTotal: 47500,
    paidAmount: 47500,
    dueAmount: 0,
    paymentType: "MFS",
    mfsName: "bKash Merchant",
    mfsPhone: "01933445566",
    status: "PAID",
    itemCount: 2,
    purchaseDetails: [
      { id: "8", productId: "8", productCode: "P-1008", productName: "Corsair 16GB DDR4 RAM", unit: "pcs", quantity: 8, buyPrice: 4200, total: 33600, vat: 0 },
      { id: "9", productId: "9", productCode: "P-1009", productName: "Antec 550W Bronze PSU", unit: "pcs", quantity: 3, buyPrice: 4800, total: 14400, vat: 0 },
    ],
  },
  {
    id: "PUR-104",
    purchaseId: "PUR-104",
    invoiceNo: "1001-20261007141022",
    purchaseDate: "2026-10-07",
    createdAt: "2026-10-07T14:10:22.000Z",
    supplierId: "4",
    supplierName: "Global Hardware Imports",
    supplierPhone: "01644556677",
    supplierAddress: "Motijheel, Dhaka",
    challanNo: "CH-88892",
    challanRefNo: "CH-88892",
    totalAmount: 95000,
    discount: 0,
    vat: 0,
    deliveryCharge: 1500,
    grandTotal: 96500,
    paidAmount: 0,
    dueAmount: 96500,
    paymentType: "CREDIT",
    status: "DUE",
    itemCount: 3,
    purchaseDetails: [
      { id: "10", productId: "10", productCode: "P-1010", productName: "ASUS Prime B550 Motherboard", unit: "pcs", quantity: 5, buyPrice: 12500, total: 62500, vat: 0 },
      { id: "11", productId: "11", productCode: "P-1011", productName: "Hikvision 2MP IP Camera", unit: "pcs", quantity: 10, buyPrice: 2200, total: 22000, vat: 0 },
      { id: "12", productId: "12", productCode: "P-1012", productName: "Western Digital 2TB Purple HDD", unit: "pcs", quantity: 2, buyPrice: 5250, total: 10500, vat: 0 },
    ],
  },
  {
    id: "PUR-105",
    purchaseId: "PUR-105",
    invoiceNo: "1001-20261006093010",
    purchaseDate: "2026-10-06",
    createdAt: "2026-10-06T09:30:10.000Z",
    supplierId: "5",
    supplierName: "FastTech Distribution",
    supplierPhone: "01555667788",
    supplierAddress: "Zindabazar, Sylhet",
    challanNo: "CH-88875",
    challanRefNo: "CH-88875",
    totalAmount: 32000,
    discount: 1000,
    vat: 0,
    deliveryCharge: 600,
    grandTotal: 31600,
    paidAmount: 31600,
    dueAmount: 0,
    paymentType: "CASH",
    status: "PAID",
    itemCount: 2,
    purchaseDetails: [
      { id: "13", productId: "13", productCode: "P-1013", productName: "TP-Link 8-Port Gigabit Switch", unit: "pcs", quantity: 10, buyPrice: 1800, total: 18000, vat: 0 },
      { id: "14", productId: "14", productCode: "P-1014", productName: "Fantech Gaming Headset", unit: "pcs", quantity: 7, buyPrice: 2000, total: 14000, vat: 0 },
    ],
  },
];

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
      const response = await postData<any>({
        url: apiConfig.purchase?.purchaseListUrl || "get-purchase-list",
        body: { accessUser: buildAccessUser() },
      });
      return response;
    },
    staleTime: 30000,
    refetchOnMount: "always",
  });

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
    if (!rawPartyData) return mockSuppliers;
    let list: any[] = [];
    if (Array.isArray(rawPartyData)) {
      list = rawPartyData;
    } else if (rawPartyData.data && Array.isArray(rawPartyData.data)) {
      list = rawPartyData.data;
    } else if (rawPartyData.partyInfoList && Array.isArray(rawPartyData.partyInfoList)) {
      list = rawPartyData.partyInfoList;
    }
    const sup = list.filter((p: any) => {
      const t = (p.type || p.partyType || "").toUpperCase();
      return t.includes("SUPPLIER") || t.includes("BOTH");
    });
    return sup.length > 0 ? sup : mockSuppliers;
  }, [rawPartyData]);

  // Combine backend purchases with fallback mock purchases
  const allPurchases: PurchaseItem[] = useMemo(() => {
    if (!rawPurchaseData) return initialMockPurchases;
    let list: any[] = [];
    if (Array.isArray(rawPurchaseData)) {
      list = rawPurchaseData;
    } else if (rawPurchaseData.data && Array.isArray(rawPurchaseData.data)) {
      list = rawPurchaseData.data;
    } else if (rawPurchaseData.purchaseList && Array.isArray(rawPurchaseData.purchaseList)) {
      list = rawPurchaseData.purchaseList;
    } else if (rawPurchaseData.purchasesList && Array.isArray(rawPurchaseData.purchasesList)) {
      list = rawPurchaseData.purchasesList;
    } else if (rawPurchaseData.purchaseInfoList && Array.isArray(rawPurchaseData.purchaseInfoList)) {
      list = rawPurchaseData.purchaseInfoList;
    }
    return list.length > 0 ? list : initialMockPurchases;
  }, [rawPurchaseData]);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Pagination State
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
  }, [allPurchases, debouncedSearch, statusFilter, paymentMethodFilter, supplierFilter, dateFilter, customStartDate, customEndDate]);

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
      case "latest":
      default: {
        return [...filteredPurchases].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.purchaseDate || "").getTime();
          const dateB = new Date(b.createdAt || b.purchaseDate || "").getTime();
          return dateB - dateA;
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
    setDebouncedSearch("");
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
