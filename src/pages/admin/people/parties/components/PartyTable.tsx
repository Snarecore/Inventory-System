import React, { useState, useRef, useEffect } from "react";
import { FiEye, FiEdit } from "react-icons/fi";
import { BsFilterRight } from "react-icons/bs";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
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
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
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
    { key: "sl", label: "SL", align: "text-left", width: "w-[4.285%]" },
    { key: "name", label: "Names", align: "text-left", width: "w-[10.285%]" },
    { key: "type", label: "Type", align: "text-left", width: "w-[12.285%]" },
    { key: "contact", label: "Contact Info", align: "text-left", width: "w-[14.285%]" },
    { key: "address", label: "Address", align: "text-center", width: "w-[14.285%]" },
    { key: "balance", label: "Opening Balance", align: "text-right", width: "w-[14.285%]" },
    { key: "status", label: "Status", align: "text-right", width: "w-[14.285%]" },
    { key: "action", label: "Actions", align: "text-right", width: "w-[14.285%]" },
  ];

  const getPartyName = (p: PartyItem) => p.name || p.partyName || p.party_name || "Unnamed Party";
  const getPartyType = (p: PartyItem): "CUSTOMER" | "SUPPLIER" => {
    const raw = (p.type || p.partyType || p.party_type || "CUSTOMER").toUpperCase();
    return raw === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";
  };
  const getPartyPhone = (p: PartyItem) => p.phone || p.partyPhone || p.phoneNumber || p.party_phone || "—";
  const getPartyEmail = (p: PartyItem) => p.email || p.partyEmail || "—";
  const getPartyAddress = (p: PartyItem) => {
    const addr = (p.address || p.partyAddress || "").trim();
    return addr || "N/A";
  };
  const getPartyBalance = (p: PartyItem) =>
    Number(p.openingBalance ?? p.opening_balance ?? p.balance ?? p.dueAmount ?? p.due_amount ?? 0);
  const isPartyActive = (p: PartyItem) => {
    const raw = String(p.status ?? "active").toLowerCase();
    return raw !== "inactive" && raw !== "false" && raw !== "0";
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Table Header: Search (Left) & Controls/Filters (Right) */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          {/* Left: Search Box & Sort Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-56">
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
            <div className="relative z-50" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                title="Sort By"
                className={`h-8 px-2.5 border rounded-lg flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                  isSortOpen
                    ? "border-[var(--color-primary,#009fe3)] text-[var(--color-primary,#009fe3)] bg-sky-50"
                    : "border-gray-200 text-black bg-gray-50/50 hover:bg-white"
                }`}
              >
                <BsFilterRight className="text-sm" />
                <span className="truncate">
                  {sortBy === "latest" ? "Latest" : sortOptions.find((s) => s.value === sortBy)?.label || "Sort"}
                </span>
              </button>

              {/* Sort Menu Popup */}
              {isSortOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-2xl border border-gray-100 py-1 z-[99999]">
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
                        className={`w-full px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-sky-50 text-[var(--color-primary,#009fe3)] font-semibold"
                            : "text-black hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Show Entries & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Show Entries Card */}
            <div className="border border-gray-200 rounded-lg px-2 h-8 inline-flex items-center gap-1.5 bg-gray-50/50 hover:bg-white text-xs text-black whitespace-nowrap">
              <span>Show</span>
              <select
                value={dataLimit}
                onChange={(e) => {
                  setDataLimit(Number(e.target.value));
                  setCurrentPageNumber(1);
                }}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-black bg-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
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
          <div className="w-full overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse table-fixed min-w-[750px] text-xs">
              <thead>
                <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                  {tableHeaders.map(({ key, label, align, width }) => (
                    <th
                      key={key}
                      className={`py-2 px-3 ${align} ${width || ""}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {parties.length > 0 ? (
                  parties.map((party, index) => {
                    const active = isPartyActive(party);
                    const rowNumber = (currentPageNumber - 1) * dataLimit + (index + 1);
                    const name = getPartyName(party);
                    const type = getPartyType(party);
                    const phone = getPartyPhone(party);
                    const email = getPartyEmail(party);
                    const address = getPartyAddress(party);
                    const balance = getPartyBalance(party);
                    const partyId = String(party.id || party.partyId || party.party_id || index);

                    return (
                      <tr
                        key={partyId}
                        className="hover:bg-sky-50/40 transition-colors group"
                      >
                        {/* SL */}
                        <td className="py-2 px-3.5 text-left text-xs font-normal text-black truncate">
                          {rowNumber}
                        </td>

                        {/* Party Details (Name) */}
                        <td className="py-2 px-3 text-left font-medium text-xs text-black truncate">
                          <span className="block truncate" title={name}>{name}</span>
                        </td>

                        {/* Type */}
                        <td className="py-2 px-1 text-left">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              type === "SUPPLIER"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {type}
                          </span>
                        </td>

                        {/* Contact Info (Phone) */}
                        <td className="py-2 px-3 text-left font-normal text-xs text-black truncate">
                          <span className="block truncate" title={phone}>{phone}</span>
                        </td>

                        {/* Address */}
                        <td className="py-2 px-3 text-center font-normal text-xs text-black truncate">
                          <span className="block truncate" title={address}>{address}</span>
                        </td>

                        {/* Opening Balance */}
                        <td className="py-2 px-3 text-right font-normal text-xs text-black whitespace-nowrap">
                          ৳{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions: Eye, Edit */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Eye / View Icon */}
                            <button
                              type="button"
                              onClick={() => onView(party)}
                              title="Quick View Details"
                              className="p-1 rounded-md hover:bg-sky-50 text-sky-600 transition-colors cursor-pointer"
                            >
                              <FiEye size={14} />
                            </button>

                            {/* Edit Icon */}
                            <button
                              type="button"
                              onClick={() => onEdit(party)}
                              title="Edit Party"
                              className="p-1 rounded-md hover:bg-amber-50 text-amber-600 transition-colors cursor-pointer"
                            >
                              <FiEdit size={14} />
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
          <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
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
