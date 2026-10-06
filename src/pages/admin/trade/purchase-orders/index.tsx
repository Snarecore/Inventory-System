import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaCalendarAlt, FaPhone, FaCheckCircle, FaFileInvoice, FaEye, FaEdit } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import PurchaseInvoiceModal from "../purchases/components/PurchaseInvoiceModal";
import apiConfig from "@/config/api.json";
import { purchaseListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { PurchaseItem } from "@/types";

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dataLimit, setDataLimit] = useState<number>(10);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [selectedPurchaseForView, setSelectedPurchaseForView] = useState<PurchaseItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  const purchaseListUrl = apiConfig.purchase?.purchaseListUrl || "get-purchase-list";

  const {
    data: rawPurchaseData,
    isLoading,
    refetch,
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
  });

  const allPurchases: PurchaseItem[] = useMemo(() => {
    if (!rawPurchaseData) return [];
    let list: any[] = [];
    if (Array.isArray(rawPurchaseData)) list = rawPurchaseData;
    else if (rawPurchaseData && typeof rawPurchaseData === "object") {
      const raw = rawPurchaseData as any;
      if (Array.isArray(raw.purchaseList)) list = raw.purchaseList;
      else if (Array.isArray(raw.purchasesList)) list = raw.purchasesList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }
    return [...list].reverse();
  }, [rawPurchaseData]);

  const filteredOrders = useMemo(() => {
    const list = allPurchases.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inv = (p.invoiceNo || "").toLowerCase();
        const sup = (p.supplierName || "").toLowerCase();
        const challan = (p.challanNo || "").toLowerCase();
        if (!inv.includes(q) && !sup.includes(q) && !challan.includes(q)) return false;
      }
      if (statusFilter) {
        const s = (p.status || "").toUpperCase();
        if (!s.includes(statusFilter.toUpperCase())) return false;
      }
      return true;
    });

    const reversed = [...list].reverse();
    return reversed.sort((a, b) => {
      const timeA = new Date(a.createdAt || (a as any).created_at || (a as any).createdAtTime || (a as any).updatedAt || (a as any).updated_at || (a as any).date || (a as any).purchaseDate || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).created_at || (b as any).createdAtTime || (b as any).updatedAt || (b as any).updated_at || (b as any).date || (b as any).purchaseDate || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeB - timeA;
      }

      const rawIdA = a.id ?? (a as any).purchase_id ?? (a as any).purchaseId ?? (a as any).purId;
      const rawIdB = b.id ?? (b as any).purchase_id ?? (b as any).purchaseId ?? (b as any).purId;
      const numA = Number(String(rawIdA || '').replace(/\D/g, ''));
      const numB = Number(String(rawIdB || '').replace(/\D/g, ''));
      if (numA && numB && numA !== numB) {
        return numB - numA;
      }

      return 0;
    });
  }, [allPurchases, searchQuery, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / dataLimit));
  const paginatedOrders = useMemo(() => {
    const start = (currentPageNumber - 1) * dataLimit;
    return filteredOrders.slice(start, start + dataLimit);
  }, [filteredOrders, currentPageNumber, dataLimit]);

  const formatMoney = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const statusOptions = [
    { value: "", label: "All Order Status" },
    { value: "RECEIVED", label: "Received / Completed" },
    { value: "PENDING", label: "Pending" },
    { value: "PAID", label: "Paid" },
  ];

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Purchase Orders"
          headerDescription="Track vendor purchase orders, delivery status, and conversion to invoices"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={() => refetch()} />
          <Button
            label="Create Purchase"
            onClick={() => navigate("/admin/create-purchase")}
            color="#009fe3"
            hoverColor="#0085be"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-2.5 sm:p-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-full sm:w-64">
              <Search
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search order no, supplier..."
              />
            </div>
            <div className="w-full sm:w-44">
              <DropdownFilter
                name="status"
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                options={statusOptions}
                filterValue={statusFilter}
                setFilterValue={setStatusFilter}
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <TableSkeleton columnCount={8} rowCount={6} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No Purchase Orders"
              description="There are currently no active purchase orders found."
            />
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-2 px-3 text-center w-10">SL</th>
                  <th className="py-2 px-3">Order / Invoice No</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Supplier</th>
                  <th className="py-2 px-3 text-center">Items</th>
                  <th className="py-2 px-3 text-right">Order Amount (৳)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order, index) => {
                  const sl = (currentPageNumber - 1) * dataLimit + index + 1;
                  const itemsCount = order.purchaseDetails?.length || 1;
                  const total = Number(order.grandTotal ?? order.totalAmount ?? 0);

                  return (
                    <tr key={order.id || index} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-500   text-[11px]">{sl}</td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPurchaseForView(order);
                            setIsViewModalOpen(true);
                          }}
                          className="font-semibold text-[var(--color-primary)] hover:underline   cursor-pointer"
                        >
                          {order.invoiceNo || `PO-${order.id || index + 1}`}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-[11px]">
                          <FaCalendarAlt size={10} className="text-gray-400" />
                          {order.purchaseDate || order.createdAt?.substring(0, 10) || "N/A"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-black block truncate max-w-[180px]">
                          {order.supplierName || "Supplier"}
                        </span>
                        {order.supplierPhone && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-1  ">
                            <FaPhone size={8} className="text-gray-400" />
                            {order.supplierPhone}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-medium">
                          {itemsCount}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-black  ">
                        ৳ {formatMoney(total)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {order.status || "RECEIVED"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPurchaseForView(order);
                              setIsViewModalOpen(true);
                            }}
                            className="p-1 text-sky-600 hover:bg-sky-100 rounded transition-colors cursor-pointer"
                            title="View Order"
                          >
                            <FaEye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const id = order.id || order.purchaseId || order.invoiceNo;
                              navigate(`/admin/edit-purchase/${id}`, { state: { editData: order } });
                            }}
                            className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <FaEdit size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && filteredOrders.length > 0 && (
          <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Show</span>
              <select
                value={dataLimit}
                onChange={(e) => {
                  setDataLimit(Number(e.target.value));
                  setCurrentPageNumber(1);
                }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries per page (Total {filteredOrders.length} orders)</span>
            </div>

            <Pagination
              pageCount={pageCount}
              currentPageNumber={currentPageNumber}
              handlePagination={(p) => setCurrentPageNumber(p.selected + 1)}
            />
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      <PurchaseInvoiceModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPurchaseForView(null);
        }}
        purchase={selectedPurchaseForView}
      />
    </div>
  );
};

export default PurchaseOrders;
