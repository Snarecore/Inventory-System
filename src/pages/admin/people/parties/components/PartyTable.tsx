import React, { useState, useMemo } from "react";
import { FiEye, FiEdit, FiChevronDown } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
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

  const SortHeader = ({
    label,
    activeKey,
  }: {
    label: string;
    activeKey: "name" | "amount";
  }) => {
    const isAsc =
      sortBy === (activeKey === "name" ? "name_a_to_z" : "amount_low_to_high");
    const isDesc =
      sortBy === (activeKey === "name" ? "name_z_to_a" : "amount_high_to_low");

    const handleClick = () => {
      if (!setSortBy) return;
      if (activeKey === "name") {
        setSortBy(isAsc ? "name_z_to_a" : isDesc ? "latest" : "name_a_to_z");
      } else {
        setSortBy(isAsc ? "amount_high_to_low" : isDesc ? "latest" : "amount_low_to_high");
      }
      setCurrentPageNumber(1);
    };

    return (
      <span
        onClick={setSortBy ? handleClick : undefined}
        className={`inline-flex items-center gap-1 select-none text-black ${
          setSortBy ? "cursor-pointer" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-black transition-transform duration-200 ${
            isAsc ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  const tableHeaders: {
    key: string;
    label: string;
    headerNode?: React.ReactNode;
    align: string;
    width: string;
  }[] = [
    { key: "sl", label: "SL", align: "text-left", width: "w-[4.285%]" },
    {
      key: "name",
      label: "Names",
      headerNode: <SortHeader label="Names" activeKey="name" />,
      align: "text-left",
      width: "w-[10.285%]",
    },
    { key: "type", label: "Type", align: "text-left", width: "w-[12.285%]" },
    { key: "contact", label: "Contact Info", align: "text-left", width: "w-[14.285%]" },
    { key: "address", label: "Address", align: "text-center", width: "w-[14.285%]" },
    {
      key: "balance",
      label: "Opening Balance",
      headerNode: (
        <div className="flex justify-end">
          <SortHeader label="Opening Balance" activeKey="amount" />
        </div>
      ),
      align: "text-right",
      width: "w-[14.285%]",
    },
    { key: "status", label: "Status", align: "text-right", width: "w-[14.285%]" },
    { key: "action", label: "Actions", align: "text-right", width: "w-[14.285%]" },
  ];

  const availableColumns: ColumnItem[] = useMemo(
    () => tableHeaders.map((h) => ({ key: h.key, label: h.label })),
    []
  );

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("party_table_columns");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const isColVisible = (key: string) => visibleColumns[key] !== false;

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const currentlyVisible = prev[key] !== false;
      const willBeVisible = !currentlyVisible;
      const countAfter = availableColumns.filter((c) =>
        c.key === key ? willBeVisible : prev[c.key] !== false
      ).length;
      if (countAfter === 0) return prev;

      const next = { ...prev, [key]: willBeVisible };
      try {
        localStorage.setItem("party_table_columns", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetColumns = () => {
    const resetState: Record<string, boolean> = {};
    availableColumns.forEach((c) => {
      resetState[c.key] = true;
    });
    setVisibleColumns(resetState);
    try {
      localStorage.removeItem("party_table_columns");
    } catch {}
  };

  const activeVisibleColumnCount = useMemo(
    () => availableColumns.filter((c) => isColVisible(c.key)).length,
    [availableColumns, visibleColumns]
  );

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
          {/* Left: Search Box */}
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
          </div>

          {/* Right: Dropdown Filters & Column Visibility */}
          <div className="flex flex-wrap items-center gap-2">
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

            {/* Column Visibility Menu */}
            <ColumnVisibilityDropdown
              columns={availableColumns}
              visibleColumns={visibleColumns}
              onToggle={handleToggleColumn}
              onReset={handleResetColumns}
            />
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && parties.length === 0 ? (
        <div className="p-4">
          <TableSkeleton columnCount={activeVisibleColumnCount} />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="w-full overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse table-fixed min-w-[750px] text-xs">
              <thead>
                <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                  {tableHeaders.filter((h) => isColVisible(h.key)).map(({ key, label, headerNode, align, width }) => (
                    <th
                      key={key}
                      className={`py-2.5 px-3 ${align} ${width || ""}`}
                    >
                      {headerNode || label}
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
                        {isColVisible("sl") && (
                          <td className="py-2.5 px-3 text-left text-xs font-normal text-black truncate">
                            {rowNumber}
                          </td>
                        )}

                        {/* Party Details (Name) */}
                        {isColVisible("name") && (
                          <td className="py-2.5 px-3 text-left font-medium text-xs text-black truncate">
                            <span className="block truncate" title={name}>{name}</span>
                          </td>
                        )}

                        {/* Type */}
                        {isColVisible("type") && (
                          <td className="py-2.5 px-2 text-left">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                                type === "SUPPLIER"
                                  ? "bg-purple-100 text-purple-800 border-purple-300"
                                  : "bg-sky-100 text-sky-800 border-sky-300"
                              }`}
                            >
                              {type}
                            </span>
                          </td>
                        )}

                        {/* Contact Info (Phone) */}
                        {isColVisible("contact") && (
                          <td className="py-2.5 px-3 text-left font-normal text-xs text-black truncate">
                            <span className="block truncate" title={phone}>{phone}</span>
                          </td>
                        )}

                        {/* Address */}
                        {isColVisible("address") && (
                          <td className="py-2.5 px-3 text-center font-normal text-xs text-black truncate">
                            <span className="block truncate" title={address}>{address}</span>
                          </td>
                        )}

                        {/* Opening Balance */}
                        {isColVisible("balance") && (
                          <td className="py-2.5 px-3 text-right font-normal text-xs text-black whitespace-nowrap">
                            ৳{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        )}

                        {/* Status Badge */}
                        {isColVisible("status") && (
                          <td className="py-2.5 px-2.5 text-right">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                                active
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border-rose-300"
                              }`}
                            >
                              {active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        )}

                        {/* Actions: Eye, Edit */}
                        {isColVisible("action") && (
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
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={activeVisibleColumnCount} className="py-12 text-center">
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

          {/* Pagination Footer */}
          {!isLoading && parties.length > 0 && (
            <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Show</span>
                <select
                  value={dataLimit}
                  onChange={(e) => {
                    setDataLimit(Number(e.target.value));
                    setCurrentPageNumber(1);
                  }}
                  className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries per page (Total {totalCount} parties)</span>
              </div>

              <Pagination
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                handlePagination={handlePagination}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PartyTable;
