import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { FaPlus, FaShoppingCart, FaUndoAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import SalesReturnStats from "./components/SalesReturnStats";
import SalesReturnTable from "./components/SalesReturnTable";
import SalesReturnInvoiceModal from "./components/SalesReturnInvoiceModal";
import SaleTable from "@/pages/admin/trade/sales/components/SaleTable";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import apiConfig from "@/config/api.json";
import { partyListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { SalesReturnItem, PartyItem, SaleItem } from "@/types";
import { isPartyActive } from "@/utils/party-utils";
import { extractReturnRemarks } from "./constants/returnReasons";
import {
  useSalesAndReturnsQuery,
  useSalesQuery,
  extractReturnedSalesInvoiceKeysSet,
} from "./hooks/useSalesReturnQueries";

const SalesReturnPage: React.FC = () => {
  const navigate = useNavigate();

  // Active View Tab: "returns" | "sales"
  const [activeTab, setActiveTab] = useState<"returns" | "sales">("returns");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
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
  const [selectedReturn, setSelectedReturn] = useState<SalesReturnItem | null>(null);
  const [autoPrintModal, setAutoPrintModal] = useState<boolean>(false);

  // Sales View Modal
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<SaleItem | null>(null);
  const [isSaleInvoiceModalOpen, setIsSaleInvoiceModalOpen] = useState<boolean>(false);

  // 1. Fetch Customers for filter dropdown
  const { data: rawCustomerData } = useQuery({
    queryKey: [partyListQueryKey, "CUSTOMER"],
    queryFn: async () => {
      try {
        const accessUser = buildAccessUser();
        const res: any = await postData({
          url: apiConfig.party?.partyListUrl || "get-party-info-list",
          body: { accessUser },
        });
        return res;
      } catch (e) {
        return [];
      }
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
      if (!isPartyActive(p)) return false;
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

  // 2. Fetch from /get-sales-and-return API (Shared TanStack Query cache)
  const {
    data: apiReturnsData,
    isLoading,
    isFetching,
    refetch,
  } = useSalesAndReturnsQuery();

  const rawReturns: SalesReturnItem[] = useMemo(() => {
    if (!Array.isArray(apiReturnsData)) return [];

    const returnsList: SalesReturnItem[] = [];
    apiReturnsData.forEach((item: any) => {
      const isReturn =
        Boolean(item.hasReturn) ||
        Boolean(item.returnNo) ||
        Boolean(item.returnGrandTotal) ||
        String(item.returnType || "").toUpperCase() === "RETURN" ||
        String(item.status || "").toUpperCase() === "RETURN" ||
        (item.refNo && String(item.refNo).startsWith("SR-")) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

      if (isReturn) {
        const noteText = extractReturnRemarks(item);

        returnsList.push({
          id: item.id || item.returnId || item.return_id,
          returnNo: item.returnNo || item.refNo || (item.orderNo ? `RET-${item.orderNo}` : `RET-${item.id}`),
          orderNo: item.orderNo || item.order_no || "",
          salesInvoiceNo: item.salesInvoiceNo || item.invoiceNo || "-",
          invoiceNo: item.salesInvoiceNo || item.invoiceNo || "-",
          returnDate: item.returnDate || item.salesDate || item.saleDate || item.date || moment().format("YYYY-MM-DD"),
          createdAt: item.createdAt || item.created_at || item.createdDate || item.date || item.returnDate,
          customerId: item.customerId,
          customerName: item.customerName || "Customer",
          customerPhone: item.customerPhone,
          customerAddress: item.customerAddress,
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
          reason: noteText,
          returnDetails: item.returnDetails || item.salesReturnDetails || item.details || [],
          itemsCount: (item.returnDetails || item.salesReturnDetails || item.details)?.length || 1,
        });
      }
    });
    return returnsList;
  }, [apiReturnsData]);

  // 3. Fetch Sales from Backend API (Shared TanStack Query cache)
  const {
    data: salesData,
    isLoading: isSalesLoading,
    isFetching: isSalesFetching,
    refetch: refetchSales,
  } = useSalesQuery();

  const rawSales: SaleItem[] = useMemo(() => {
    if (Array.isArray(salesData)) return salesData;
    return [];
  }, [salesData]);

  // Set of invoices/orders that have already been returned
  const returnedInvoiceSet = useMemo(() => {
    return extractReturnedSalesInvoiceKeysSet(apiReturnsData || []);
  }, [apiReturnsData]);

  // Filtering for Sales
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
      if (statusFilter !== "all" && statusFilter !== "") {
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
        if (cId.toLowerCase() !== filterVal && cName.toLowerCase() !== filterVal) {
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

  // Sorting for Sales
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a: any, b: any) => {
      const dateA = a.salesDate || a.saleDate || a.date;
      const dateB = b.salesDate || b.saleDate || b.date;
      if (sortBy === "latest") {
        return moment(dateB).diff(moment(dateA));
      }
      if (sortBy === "oldest") {
        return moment(dateA).diff(moment(dateB));
      }
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        const amtA = Number(a.grandTotal ?? a.grand_total ?? a.totalAmount ?? 0);
        const amtB = Number(b.grandTotal ?? b.grand_total ?? b.totalAmount ?? 0);
        const diff = amtB - amtA;
        return diff !== 0 ? diff : moment(dateB).diff(moment(dateA));
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        const amtA = Number(a.grandTotal ?? a.grand_total ?? a.totalAmount ?? 0);
        const amtB = Number(b.grandTotal ?? b.grand_total ?? b.totalAmount ?? 0);
        const diff = amtA - amtB;
        return diff !== 0 ? diff : moment(dateB).diff(moment(dateA));
      }
      if (sortBy === "customer_a_to_z") {
        const nameA = String(a.customerName || a.customer_name || a.customer?.name || "Walk-in Customer").trim().toLowerCase();
        const nameB = String(b.customerName || b.customer_name || b.customer?.name || "Walk-in Customer").trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return cmp !== 0 ? cmp : moment(dateB).diff(moment(dateA));
      }
      if (sortBy === "customer_z_to_a") {
        const nameA = String(a.customerName || a.customer_name || a.customer?.name || "Walk-in Customer").trim().toLowerCase();
        const nameB = String(b.customerName || b.customer_name || b.customer?.name || "Walk-in Customer").trim().toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        return cmp !== 0 ? cmp : moment(dateB).diff(moment(dateA));
      }
      return 0;
    });
  }, [filteredSales, sortBy]);

  // Sales Pagination
  const salesTotalCount = sortedSales.length;
  const salesPageCount = Math.ceil(salesTotalCount / dataLimit) || 1;
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPageNumber - 1) * dataLimit;
    return sortedSales.slice(startIndex, startIndex + dataLimit);
  }, [sortedSales, currentPageNumber, dataLimit]);

  // Filtering
  const filteredReturns = useMemo(() => {
    return rawReturns.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ordNo = String(item.orderNo || "").toLowerCase();
        const retNo = String(item.returnNo || "").toLowerCase();
        const invNo = String(item.salesInvoiceNo || item.invoiceNo || "").toLowerCase();
        const cName = String(item.customerName || "").toLowerCase();
        const cPhone = String(item.customerPhone || "").toLowerCase();
        const remarks = String(item.note || item.remarks || "").toLowerCase();
        if (
          !ordNo.includes(q) &&
          !retNo.includes(q) &&
          !invNo.includes(q) &&
          !cName.includes(q) &&
          !cPhone.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      // 2. Customer Filter
      if (customerFilter && customerFilter !== "all") {
        const cId = String(item.customerId ?? "").trim().toLowerCase();
        const cName = String(item.customerName ?? "").trim().toLowerCase();
        const filterVal = customerFilter.toLowerCase();
        if (cId !== filterVal && !cName.includes(filterVal)) {
          return false;
        }
      }

      // 3. Payment Method Filter
      if (paymentMethodFilter !== "all") {
        if (String(item.paymentType || "").toUpperCase() !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      // 4. Date Filter
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
    searchQuery,
    customerFilter,
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
      if (sortBy === "customer_a_to_z") {
        const nameA = String(a.customerName || "").trim().toLowerCase();
        const nameB = String(b.customerName || "").trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return cmp !== 0 ? cmp : timeB - timeA;
      }
      if (sortBy === "customer_z_to_a") {
        const nameA = String(a.customerName || "").trim().toLowerCase();
        const nameB = String(b.customerName || "").trim().toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        return cmp !== 0 ? cmp : timeB - timeA;
      }

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
  const handleView = (item: SalesReturnItem) => {
    setSelectedReturn(item);
    setAutoPrintModal(false);
    setIsInvoiceModalOpen(true);
  };

  const handlePrint = (item: SalesReturnItem) => {
    setSelectedReturn(item);
    setAutoPrintModal(true);
    setIsInvoiceModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCustomerFilter("all");
    setPaymentMethodFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("latest");
    setCurrentPageNumber(1);
  };

  // Actions for Sales List
  const handleViewSale = (sale: SaleItem) => {
    setSelectedSaleForInvoice(sale);
    setIsSaleInvoiceModalOpen(true);
  };

  const handlePrintSale = (sale: SaleItem) => {
    setSelectedSaleForInvoice(sale);
    setIsSaleInvoiceModalOpen(true);
  };

  const handleEditSale = (sale: SaleItem) => {
    navigate(`/admin/edit-sale/${sale.id || sale.saleId || sale.invoiceNo}`, {
      state: { editData: sale },
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Sales Return"
          headerDescription="Manage customer sales returns, item quantities, and refund settlements"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton
            onClick={() => {
              refetch();
              refetchSales();
            }}
            isLoading={isLoading || isFetching || isSalesLoading || isSalesFetching}
          />
          <Button
            label="Create Return"
            onClick={() => navigate("/admin/create-sales-return")}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <SalesReturnStats
        totalCount={stats.totalCount}
        totalRefundAmount={stats.totalRefundAmount}
        totalCashRefund={stats.totalCashRefund}
        totalCreditAdjust={stats.totalCreditAdjust}
      />

      {/* Tab Switcher: Sales List vs Sales Return List (Compact Y-axis) */}
      <div className="flex items-center gap-1.5 border-b border-gray-200/90 -my-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("sales");
            setCurrentPageNumber(1);
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "sales"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-sky-50/50 rounded-t-md"
              : "border-transparent :text-black hover:bg-gray-50 rounded-t-md"
          }`}
        >
          <FaShoppingCart size={11} />
          <span>Sales List ({rawSales.length})</span>
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
          <span>Sales Return List ({rawReturns.length})</span>
        </button>
      </div>

      {/* Main Table: Either Returns List or Sales List based on activeTab */}
      {activeTab === "returns" ? (
        <SalesReturnTable
          returns={paginatedReturns}
          exportableReturns={sortedReturns}
          totalCount={totalCount}
          rawCount={rawReturns.length}
          isLoading={isLoading}
          pageCount={pageCount}
          currentPageNumber={currentPageNumber}
          setCurrentPageNumber={setCurrentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          handlePagination={handlePagination}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          customerFilter={customerFilter}
          setCustomerFilter={setCustomerFilter}
          customersList={customersList}
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
        <SaleTable
          sales={paginatedSales}
          exportableSales={sortedSales}
          totalCount={salesTotalCount}
          isLoading={isSalesLoading}
          isFetching={isSalesFetching}
          pageCount={salesPageCount}
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
          returnedInvoiceSet={returnedInvoiceSet}
          showReturnAction={true}
          onView={handleViewSale}
          onEdit={handleEditSale}
          onPrint={handlePrintSale}
        />
      )}

      {/* Printable Credit Note / Return Slip Modal */}
      <SalesReturnInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedReturn(null);
          setAutoPrintModal(false);
        }}
        returnData={selectedReturn}
        autoPrint={autoPrintModal}
      />

      {/* Sale Invoice Modal (when viewing a sale from the Sales List tab) */}
      <SaleInvoiceModal
        isOpen={isSaleInvoiceModalOpen}
        onClose={() => {
          setIsSaleInvoiceModalOpen(false);
          setSelectedSaleForInvoice(null);
        }}
        sale={selectedSaleForInvoice}
      />
    </div>
  );
};

export default SalesReturnPage;
