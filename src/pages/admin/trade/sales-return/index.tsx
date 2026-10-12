import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { FaPlus } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import SalesReturnStats from "./components/SalesReturnStats";
import SalesReturnTable from "./components/SalesReturnTable";
import SalesReturnInvoiceModal from "./components/SalesReturnInvoiceModal";
import apiConfig from "@/config/api.json";
import { salesAndReturnQueryKey, partyListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { SalesReturnItem, PartyItem } from "@/types";

const SalesReturnPage: React.FC = () => {
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
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

  // 2. Fetch from /get-sales-and-return API
  const {
    data: apiReturnsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [salesAndReturnQueryKey],
    queryFn: async () => {
      try {
        const accessUser = buildAccessUser();
        const endpoint =
          apiConfig.salesReturn?.getSalesAndReturnUrl ||
          apiConfig.sales?.salesAndReturnUrl ||
          "get-sales-and-return";

        const res: any = await postData({
          url: endpoint,
          body: { accessUser },
        });

        const list = res?.data || res?.returns || res?.salesAndReturnList || res?.saleList || [];
        if (Array.isArray(list) && list.length > 0) {
          const returnsList: SalesReturnItem[] = [];
          list.forEach((item: any) => {
            const isReturn =
              Boolean(item.hasReturn) ||
              Boolean(item.returnNo) ||
              Boolean(item.returnGrandTotal) ||
              String(item.returnType || "").toUpperCase() === "RETURN" ||
              (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
              (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

            if (isReturn) {
              const rawNote = String(item.note || "").trim();
              // Strip auto-generated "Return from invoice ...," prefix if it exists in older records
              const noteText = rawNote
                .replace(/^Return from invoice[^,]+,\s*/i, "")
                .replace(/^Return from invoice[^\n]+/i, "")
                .trim();

              returnsList.push({
                id: item.id || item.returnId || item.return_id,
                returnNo: item.returnNo || (item.orderNo ? `RET-${item.orderNo}` : `RET-${item.id}`),
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
        }
        return [];
      } catch (err) {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const rawReturns: SalesReturnItem[] = useMemo(() => {
    if (Array.isArray(apiReturnsData)) {
      return apiReturnsData;
    }
    return [];
  }, [apiReturnsData]);

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
        if (
          !ordNo.includes(q) &&
          !retNo.includes(q) &&
          !invNo.includes(q) &&
          !cName.includes(q) &&
          !cPhone.includes(q)
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
      if (sortBy === "amount_high") return amountB - amountA;
      if (sortBy === "amount_low") return amountA - amountB;

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

  return (
    <div className="flex flex-col gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <PageHeader
          headerTitle="Sales Return"
          headerDescription="Manage customer sales returns, item quantities, and refund settlements"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isFetching} />
          <Button
            label="Create Return"
            onClick={() => navigate("/admin/create-sales-return")}
            color="#009fe3"
            hoverColor="#0085be"
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

      {/* Main Table with Filters */}
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
    </div>
  );
};

export default SalesReturnPage;
