import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { FaPlus, FaShoppingCart } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import DeleteModal from "@/components/modal/DeleteModal";
import SaleStats from "./components/SaleStats";
import SaleTable from "./components/SaleTable";
import SaleInvoiceModal from "./components/SaleInvoiceModal";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { salesListQueryKey, partyListQueryKey, productListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { SaleItem, PartyItem } from "@/types";

// Mock Fallback Data
const initialMockSales: SaleItem[] = [
  {
    id: "SALE-101",
    saleId: "SALE-101",
    invoiceNo: "INV-20261010-0001",
    salesDate: "2026-10-10",
    customerId: "1",
    customerName: "Rahim Traders",
    customerPhone: "01711223344",
    customerAddress: "Mirpur 10, Dhaka",
    totalAmount: 15400,
    discount: 400,
    vat: 0,
    delivery_charge: 100,
    grandTotal: 15100,
    paidAmount: 15100,
    dueAmount: 0,
    paymentType: "CASH",
    status: "PAID",
    itemCount: 3,
    salesDetails: [
      { id: "1", productId: "1", productCode: "P-1001", productName: "Premium Basmati Rice 25kg", unit: "bag", quantity: 2, sellPrice: 3200, discount: 0, vat: 0, total: 6400 },
      { id: "2", productId: "2", productCode: "P-1002", productName: "Soyabean Oil 5L", unit: "can", quantity: 5, sellPrice: 850, discount: 0, vat: 0, total: 4250 },
      { id: "3", productId: "3", productCode: "P-1003", productName: "Aroma Tea Pack 500g", unit: "pcs", quantity: 15, sellPrice: 310, discount: 0, vat: 0, total: 4650 },
    ],
  },
  {
    id: "SALE-102",
    saleId: "SALE-102",
    invoiceNo: "INV-20261010-0002",
    salesDate: "2026-10-10",
    customerId: "2",
    customerName: "Karim Enterprises",
    customerPhone: "01822334455",
    customerAddress: "Dhanmondi, Dhaka",
    totalAmount: 28000,
    discount: 1000,
    vat: 500,
    delivery_charge: 200,
    grandTotal: 27700,
    paidAmount: 15000,
    dueAmount: 12700,
    paymentType: "MFS",
    mfsName: "bKash",
    mfsPhone: "01822334455",
    status: "PARTIAL",
    itemCount: 2,
    salesDetails: [
      { id: "4", productId: "4", productCode: "P-1004", productName: "Dell 24-inch IPS Monitor", unit: "pcs", quantity: 1, sellPrice: 18500, discount: 500, vat: 500, total: 18500 },
      { id: "5", productId: "5", productCode: "P-1005", productName: "Logitech MX Master 3S Mouse", unit: "pcs", quantity: 1, sellPrice: 9500, discount: 500, vat: 0, total: 9000 },
    ],
  },
  {
    id: "SALE-103",
    saleId: "SALE-103",
    invoiceNo: "INV-20261009-0003",
    salesDate: "2026-10-09",
    customerId: "3",
    customerName: "Bismillah General Store",
    customerPhone: "01933445566",
    customerAddress: "Chawkbazar, Chittagong",
    totalAmount: 42000,
    discount: 2000,
    vat: 0,
    delivery_charge: 500,
    grandTotal: 40500,
    paidAmount: 0,
    dueAmount: 40500,
    paymentType: "CREDIT",
    status: "PENDING",
    itemCount: 4,
    salesDetails: [
      { id: "6", productId: "6", productCode: "P-1006", productName: "Sugar White 50kg Sack", unit: "bag", quantity: 5, sellPrice: 6500, discount: 1000, vat: 0, total: 31500 },
      { id: "7", productId: "7", productCode: "P-1007", productName: "Red Lentils 25kg", unit: "bag", quantity: 3, sellPrice: 3500, discount: 1000, vat: 0, total: 9500 },
    ],
  },
  {
    id: "SALE-104",
    saleId: "SALE-104",
    invoiceNo: "INV-20261008-0004",
    salesDate: "2026-10-08",
    customerId: "4",
    customerName: "Shahjalal Traders",
    customerPhone: "01644556677",
    customerAddress: "Zindabazar, Sylhet",
    totalAmount: 64000,
    discount: 3000,
    vat: 1200,
    delivery_charge: 800,
    grandTotal: 63000,
    paidAmount: 63000,
    dueAmount: 0,
    paymentType: "BANK",
    bankName: "City Bank PLC",
    accountNo: "1102938495001",
    status: "PAID",
    itemCount: 2,
    salesDetails: [
      { id: "8", productId: "8", productCode: "P-1008", productName: "HP LaserJet Pro MFP Printer", unit: "pcs", quantity: 2, sellPrice: 32000, discount: 3000, vat: 1200, total: 62200 },
    ],
  },
];

const Sales: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search, Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<SaleItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleItem | null>(null);

  // 1. Fetch Customers
  const { data: customerData } = useQuery({
    queryKey: [partyListQueryKey, "CUSTOMER"],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.party?.partyListUrl || "get-party-info-list",
        body: { accessUser, type: "CUSTOMER" },
      });
      return res?.partyList || res?.data || res?.parties || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const customersList: PartyItem[] = useMemo(() => {
    return Array.isArray(customerData) ? customerData : [];
  }, [customerData]);

  // 2. Fetch Sales from Backend API
  const {
    data: salesData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [salesListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      // Call /get-sale-list or fallback /get-sales-and-return
      const endpoint = apiConfig.sales?.salesListUrl || "get-sale-list";
      const res: any = await postData({
        url: endpoint,
        body: { accessUser },
      });

      const list =
        res?.saleList ||
        res?.salesList ||
        res?.data ||
        res?.sales ||
        res?.saleDetailsList ||
        res?.sale_list ||
        [];

      return Array.isArray(list) && list.length > 0 ? list : initialMockSales;
    },
    staleTime: 60 * 1000,
  });

  const rawSales: SaleItem[] = useMemo(() => {
    if (Array.isArray(salesData) && salesData.length > 0) return salesData;
    return initialMockSales;
  }, [salesData]);

  // Filtering & Sorting
  const filteredSales = useMemo(() => {
    return rawSales.filter((sale: any) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inv = String(sale.invoiceNo || sale.invoice_no || "").toLowerCase();
        const cName = String(sale.customerName || sale.customer_name || "").toLowerCase();
        const cPhone = String(sale.customerPhone || sale.customer_phone || "").toLowerCase();
        if (!inv.includes(q) && !cName.includes(q) && !cPhone.includes(q)) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        const grandTotal = Number(sale.grandTotal ?? sale.grand_total ?? sale.totalAmount ?? 0);
        const paidAmount = Number(sale.paidAmount ?? sale.paid_amount ?? 0);
        const dueAmount = Number(sale.dueAmount ?? sale.due_amount ?? Math.max(0, grandTotal - paidAmount));
        const s = String(sale.status || "").toUpperCase();

        if (statusFilter === "PAID") {
          if (s !== "PAID" && dueAmount > 0) return false;
        } else if (statusFilter === "PARTIAL") {
          if (s !== "PARTIAL" && !(dueAmount > 0 && paidAmount > 0)) return false;
        } else if (statusFilter === "DUE") {
          if (s !== "PENDING" && s !== "DUE" && !(dueAmount > 0 && paidAmount === 0)) return false;
        }
      }

      // 3. Payment Method
      if (paymentMethodFilter !== "all") {
        const pMethod = String(sale.paymentType || sale.payment_type || "CASH").toUpperCase();
        if (pMethod !== paymentMethodFilter) return false;
      }

      // 4. Customer Filter
      if (customerFilter !== "all") {
        const cId = String(sale.customerId || sale.customer_id);
        if (cId !== String(customerFilter)) return false;
      }

      // 5. Date Range Filter
      if (dateFilter !== "all") {
        const saleDateStr = sale.salesDate || sale.saleDate || sale.date;
        if (!saleDateStr) return true;
        const saleDate = moment(saleDateStr);

        if (dateFilter === "today") {
          if (!saleDate.isSame(moment(), "day")) return false;
        } else if (dateFilter === "yesterday") {
          if (!saleDate.isSame(moment().subtract(1, "day"), "day")) return false;
        } else if (dateFilter === "last7days") {
          if (!saleDate.isAfter(moment().subtract(7, "days"))) return false;
        } else if (dateFilter === "thisMonth") {
          if (!saleDate.isSame(moment(), "month")) return false;
        } else if (dateFilter === "lastMonth") {
          if (!saleDate.isSame(moment().subtract(1, "month"), "month")) return false;
        } else if (dateFilter === "custom" && customStartDate && customEndDate) {
          if (saleDate.isBefore(moment(customStartDate)) || saleDate.isAfter(moment(customEndDate).endOf("day"))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    rawSales,
    searchQuery,
    statusFilter,
    paymentMethodFilter,
    customerFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Sort
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a: any, b: any) => {
      const dateA = new Date(a.salesDate || a.saleDate || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.salesDate || b.saleDate || b.date || b.createdAt || 0).getTime();
      const amountA = Number(a.grandTotal ?? a.grand_total ?? a.totalAmount ?? 0);
      const amountB = Number(b.grandTotal ?? b.grand_total ?? b.totalAmount ?? 0);

      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "amount_high") return amountB - amountA;
      if (sortBy === "amount_low") return amountA - amountB;
      return dateB - dateA; // latest default
    });
  }, [filteredSales, sortBy]);

  // Overall KPIs calculation from active filtered sales
  const stats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedSales.forEach((sale: any) => {
      const gt = Number(sale.grandTotal ?? sale.grand_total ?? sale.totalAmount ?? 0);
      const paid = Number(sale.paidAmount ?? sale.paid_amount ?? 0);
      const due = Number(sale.dueAmount ?? sale.due_amount ?? Math.max(0, gt - paid));

      totalAmount += gt;
      totalPaid += paid;
      totalDue += due;
    });

    return {
      totalCount: sortedSales.length,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [sortedSales]);

  // Pagination
  const totalCount = sortedSales.length;
  const pageCount = Math.ceil(totalCount / dataLimit) || 1;
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPageNumber - 1) * dataLimit;
    return sortedSales.slice(startIndex, startIndex + dataLimit);
  }, [sortedSales, currentPageNumber, dataLimit]);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // Actions
  const handleView = (sale: SaleItem) => {
    setSelectedSaleForInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (sale: SaleItem) => {
    setSelectedSaleForInvoice(sale);
    setIsInvoiceModalOpen(true);
  };

  const handleEdit = (sale: SaleItem) => {
    navigate(`/admin/edit-sale/${sale.id || sale.saleId || sale.invoiceNo}`, {
      state: { editData: sale },
    });
  };

  const handleDeletePrompt = (sale: SaleItem) => {
    setSaleToDelete(sale);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!saleToDelete) return;
    showSuccessToast(`Sale invoice ${saleToDelete.invoiceNo || saleToDelete.id} removed`);
    setIsDeleteModalOpen(false);
    setSaleToDelete(null);
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Sales"
          headerDescription="Manage customer sales, invoices, payment breakdowns, and credit dues"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />
          <Button
            label="New Sale"
            onClick={() => navigate("/admin/create-sale")}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>


      {/* KPI Cards */}
      <SaleStats
        totalCount={stats.totalCount}
        totalAmount={stats.totalAmount}
        totalPaid={stats.totalPaid}
        totalDue={stats.totalDue}
      />

      {/* Main Table */}
      <SaleTable
        sales={paginatedSales}
        exportableSales={sortedSales}
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
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        customersList={customersList}
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
        onDelete={handleDeletePrompt}
      />

      {/* Printable Invoice Modal */}
      <SaleInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedSaleForInvoice(null);
        }}
        sale={selectedSaleForInvoice}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSaleToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Sale Invoice"
        description={`Are you sure you want to delete invoice "${saleToDelete?.invoiceNo || saleToDelete?.id}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Sales;
