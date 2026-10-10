import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { FaPlus, FaShoppingCart } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
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

  // 1. Fetch Customers
  const { data: rawCustomerData } = useQuery({
    queryKey: [partyListQueryKey, "CUSTOMER"],
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

  const customersList: PartyItem[] = useMemo(() => {
    let list: any[] = [];
    if (rawCustomerData) {
      if (Array.isArray(rawCustomerData)) list = rawCustomerData;
      else if (rawCustomerData && typeof rawCustomerData === "object") {
        const raw = rawCustomerData as any;
        if (Array.isArray(raw.customerList)) list = raw.customerList;
        else if (Array.isArray(raw.partyList)) list = raw.partyList;
        else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
        else if (Array.isArray(raw.data)) list = raw.data;
      }
    }

    const filtered = list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1") return false;
      const type = String(p.type || p.partyType || p.party_type || p.party_type_name || p.role || "").toUpperCase();
      if (type.includes("SUPPLIER") || type.includes("VENDOR")) return false;
      return type.includes("CUSTOMER") || !type;
    });

    const custMap = new Map<string, PartyItem>();
    filtered.forEach((p: any) => {
      const key = String(p.id ?? p.partyId ?? p.name ?? "").trim();
      if (key) {
        custMap.set(key, {
          id: p.id ?? p.partyId,
          partyId: p.id ?? p.partyId,
          name: p.name || p.partyName || "Customer",
          partyName: p.name || p.partyName || "Customer",
          phone: p.phone || p.partyPhone || "",
          partyPhone: p.phone || p.partyPhone || "",
          address: p.address || p.partyAddress || "",
          type: "CUSTOMER",
        });
      }
    });

    return Array.from(custMap.values());
  }, [rawCustomerData]);

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

      return Array.isArray(list) ? list : [];
    },
    staleTime: 60 * 1000,
  });

  const rawSales: SaleItem[] = useMemo(() => {
    if (Array.isArray(salesData)) return salesData;
    return [];
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
        const cId = String(sale.customerId || sale.customer_id || "");
        const cName = String(sale.customerName || sale.customer_name || "");
        const filterVal = String(customerFilter).trim().toLowerCase();
        if (
          cId.toLowerCase() !== filterVal &&
          cName.toLowerCase() !== filterVal
        ) {
          return false;
        }
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
    </div>
  );
};

export default Sales;
