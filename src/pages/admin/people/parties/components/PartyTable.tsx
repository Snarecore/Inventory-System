import React, { useState, useRef, useEffect } from "react";
import { FiEye, FiEdit } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { buildAccessUser, withBranchScope } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import apiConfig from "@/config/api.json";
import type { PartyItem } from "@/types";

interface PartyTableProps {
  parties: PartyItem[];
  totalCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  onEdit: (party: PartyItem) => void;
  onView: (party: PartyItem) => void;
  onRefresh: () => void;
}

export const PartyTable: React.FC<PartyTableProps> = ({
  parties,
  totalCount,
  isLoading,
  pageCount,
  currentPageNumber,
  setCurrentPageNumber,
  dataLimit,
  setDataLimit,
  handlePagination,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  sortBy = "latest",
  setSortBy,
  onEdit,
  onView,
  onRefresh,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const typeOptions = [
    { label: "All Parties", value: "" },
    { label: "Customers", value: "CUSTOMER" },
    { label: "Suppliers", value: "SUPPLIER" },
  ];

  const statusOptions = [
    { label: "All Status", value: "" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  const sortOptions = [
    { label: "Latest", value: "latest" },
    { label: "Amount: High to Low", value: "amount_high_to_low" },
    { label: "Amount: Low to High", value: "amount_low_to_high" },
    { label: "Name: A to Z", value: "name_a_to_z" },
    { label: "Name: Z to A", value: "name_z_to_a" },
  ];

  const tableHeaders = [
    { key: "sl", label: "#", align: "text-center" },
    { key: "name", label: "Party Details", align: "text-left" },
    { key: "type", label: "Type", align: "text-center" },
    { key: "contact", label: "Contact Info", align: "text-left" },
    { key: "balance", label: "Opening Balance", align: "text-right" },
    { key: "status", label: "Status", align: "text-center" },
    { key: "action", label: "Actions", align: "text-center" },
  ];

  const getPartyName = (p: PartyItem) => p.name || p.partyName || p.party_name || "Unnamed Party";
  const getPartyType = (p: PartyItem): "CUSTOMER" | "SUPPLIER" => {
    const raw = (p.type || p.partyType || p.party_type || "CUSTOMER").toUpperCase();
    return raw === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";
  };
  const getPartyPhone = (p: PartyItem) => p.phone || p.partyPhone || p.phoneNumber || p.party_phone || "—";
  const getPartyBalance = (p: PartyItem) =>
    Number(p.openingBalance ?? p.opening_balance ?? p.balance ?? p.dueAmount ?? p.due_amount ?? 0);
  const isPartyActive = (p: PartyItem) => {
    const raw = String(p.status ?? "active").toLowerCase();
    return raw !== "inactive" && raw !== "false" && raw !== "0";
  };

  const handleTogglePartyStatus = async (party: PartyItem) => {
    const rawId = party.id ?? (party as any).partyId ?? (party as any).party_id ?? (party as any).partyCode ?? (party as any).code;
    const targetId = String(rawId || party.phone || (party as any).partyPhone || "");
    if (!targetId || togglingId) return;

    setTogglingId(targetId);
    const currentActive = isPartyActive(party);
    const nextActive = !currentActive;
    const nextStatus = nextActive ? "Active" : "Inactive";
    const numBalance = getPartyBalance(party);
    const updateUrl = apiConfig.party?.updatePartyUrl || "party-info-update";
    const insertUrl = apiConfig.party?.insertPartyUrl || "insert-party-info";

    try {
      const partyDetails = withBranchScope({
        ...party,
        ...(rawId ? {
          id: rawId,
          partyId: rawId,
          party_id: rawId,
          partyCode: rawId,
          party_code: rawId,
        } : {}),
        name: getPartyName(party),
        partyName: getPartyName(party),
        party_name: getPartyName(party),
        phone: getPartyPhone(party),
        partyPhone: getPartyPhone(party),
        phoneNumber: getPartyPhone(party),
        party_phone: getPartyPhone(party),
        email: party.email || (party as any).partyEmail || "",
        partyEmail: party.email || (party as any).partyEmail || "",
        address: party.address || (party as any).partyAddress || "",
        partyAddress: party.address || (party as any).partyAddress || "",
        type: getPartyType(party),
        partyType: getPartyType(party),
        party_type: getPartyType(party),
        openingBalance: numBalance,
        opening_balance: numBalance,
        balance: numBalance,
        dueAmount: numBalance,
        due_amount: numBalance,
        status: nextStatus,
        operation: "update",
        isSync: "YES",
        updated_at: new Date().toISOString(),
      });

      const payload = {
        accessUser: buildAccessUser(),
        ...partyDetails,
        party: partyDetails,
        partyInfo: partyDetails,
        party_info: partyDetails,
      };

      let response = await postData<any>({
        url: updateUrl,
        body: payload,
      });

      // If update endpoint returned an error, fallback to insert-party-info
      if (String(response?.status).toLowerCase() === "error" || response?.error || !response) {
        const fallbackRes = await postData<any>({
          url: insertUrl,
          body: payload,
        });
        if (String(fallbackRes?.status).toLowerCase() !== "error" && !fallbackRes?.error) {
          response = fallbackRes;
        }
      }

      if (
        response &&
        !response.error &&
        String(response.status).toLowerCase() !== "error"
      ) {
        showSuccessToast(response?.msg || response?.message || `Party marked as ${nextStatus}`);
        onRefresh();
      } else {
        showErrorToast(response?.msg || response?.message || "Failed to update party status");
      }
    } catch (error: any) {
      console.error("Failed to toggle party status:", error);
      showErrorToast(error?.response?.data?.msg || error?.message || "Failed to update party status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm relative">
      {/* Table Header: Search (Left) & Controls/Filters (Right) */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl relative z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Search Box & Sort Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPageNumber(1);
                }}
                placeholder="Search parties..."
              />
            </div>

            {/* Sort Dropdown Button */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                title="Sort By"
                className={`h-[32px] w-[34px] border rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                  isSortOpen
                    ? "border-[var(--color-primary,#009fe3)] text-[var(--color-primary,#009fe3)] bg-sky-50"
                    : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <BsFilterRight className="text-lg" />
              </button>

              {/* Sort Menu Popup */}
              {isSortOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[100] animate-in fade-in-50 duration-100">
                  <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Sort By
                  </div>
                  <div className="mt-1 flex flex-col">
                    {sortOptions.map((opt) => {
                      const isSelected = sortBy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            if (setSortBy) setSortBy(opt.value);
                            setCurrentPageNumber(1);
                            setIsSortOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                            isSelected
                              ? "text-[#009fe3] font-semibold bg-sky-50"
                              : "text-gray-700 hover:bg-gray-50 font-normal"
                          }`}
                        >
                          <span className="w-4 flex items-center justify-center text-[#009fe3] font-bold text-xs">
                            {isSelected ? "✓" : ""}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Show Entries & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Show Entries Card */}
            <div className="border border-gray-200 rounded-lg px-2.5 h-[32px] inline-flex items-center gap-1.5 bg-white text-xs text-black whitespace-nowrap shadow-2xs">
              <span>Show</span>
              <select
                value={dataLimit}
                onChange={(e) => {
                  setDataLimit(Number(e.target.value));
                  setCurrentPageNumber(1);
                }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-black bg-white focus:outline-none focus:border-gray-400 cursor-pointer"
              >
                {[10, 20, 50, 70, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            {/* Quick Type Pills / Dropdown */}
            <DropdownFilter
              title="Party Type"
              options={typeOptions}
              selectedOption={
                typeFilter ? typeOptions.find((o) => o.value === typeFilter) || null : null
              }
              isOpen={openDropdown === "type"}
              onToggle={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              onSelect={(selected) => {
                setTypeFilter(selected ? selected.value : "");
                setCurrentPageNumber(1);
                setOpenDropdown(null);
              }}
            />

            {/* Status Dropdown */}
            <DropdownFilter
              title="Status"
              options={statusOptions}
              selectedOption={
                statusFilter ? statusOptions.find((o) => o.value === statusFilter) || null : null
              }
              isOpen={openDropdown === "status"}
              onToggle={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
              onSelect={(selected) => {
                setStatusFilter(selected ? selected.value : "");
                setCurrentPageNumber(1);
                setOpenDropdown(null);
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && parties.length === 0 ? (
        <div className="p-4">
          <TableSkeleton />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-xs text-black">
                  {tableHeaders.map(({ key, label, align }) => (
                    <th
                      key={key}
                      className={`px-4 py-[11px] ${align} ${key === "sl" ? "w-14" : ""}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white text-sm">
                {parties.length > 0 ? (
                  parties.map((party, index) => {
                    const active = isPartyActive(party);
                    const rowNumber = (currentPageNumber - 1) * dataLimit + (index + 1);
                    const name = getPartyName(party);
                    const type = getPartyType(party);
                    const phone = getPartyPhone(party);
                    const balance = getPartyBalance(party);
                    const partyId = String(party.id || party.partyId || party.party_id || index);

                    return (
                      <tr
                        key={partyId}
                        className="hover:bg-blue-50/40 transition-colors duration-150 group"
                      >
                        {/* SL */}
                        <td className="px-4 py-[11px] text-center text-xs font-normal text-black">
                          {rowNumber}
                        </td>

                        {/* Party Details (Name) */}
                        <td className="px-4 py-[11px]">
                          <div className="font-normal text-[13px] text-black leading-tight">
                            {name}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-[11px] text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal border ${
                              type === "SUPPLIER"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {type}
                          </span>
                        </td>

                        {/* Contact Info (Phone) */}
                        <td className="px-4 py-[11px] text-left font-normal text-[13px] text-black">
                          {phone}
                        </td>

                        {/* Balance */}
                        <td className="px-4 py-[11px] text-right font-normal text-[13px] text-black">
                          ৳{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status Badge (Click to Toggle Active / Inactive) */}
                        <td
                          className="px-4 py-[11px] text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={togglingId === partyId}
                            onClick={() => handleTogglePartyStatus(party)}
                            title={`Click to mark as ${active ? "Inactive" : "Active"}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-150 ${
                              active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            } ${togglingId === partyId ? "opacity-50 cursor-wait" : ""}`}
                          >
                            {active ? "Active" : "Inactive"}
                          </button>
                        </td>

                        {/* Actions: Eye, Edit */}
                        <td className="px-4 py-[11px] text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Eye / View Icon */}
                            <button
                              type="button"
                              onClick={() => onView(party)}
                              title="Quick View Details"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-colors duration-150 cursor-pointer"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Icon */}
                            <button
                              type="button"
                              onClick={() => onEdit(party)}
                              title="Edit Party"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-colors duration-150 cursor-pointer"
                            >
                              <FiEdit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={tableHeaders.length} className="py-12 text-center">
                      <EmptyState
                        title={
                          searchQuery || typeFilter || statusFilter
                            ? "No parties matching your search/filters"
                            : "No parties available"
                        }
                        description={
                          searchQuery || typeFilter || statusFilter
                            ? "Try clearing the search or filters to see all parties."
                            : "Click 'Add Party' above to create your first party."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Summary Footer */}
          <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-black">
              Showing{" "}
              <span className="font-semibold text-black">
                {parties.length > 0 ? (currentPageNumber - 1) * dataLimit + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-black">
                {Math.min(currentPageNumber * dataLimit, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-black">{totalCount}</span> entries
            </div>

            {pageCount > 1 && (
              <Pagination
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                handlePagination={handlePagination}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PartyTable;
