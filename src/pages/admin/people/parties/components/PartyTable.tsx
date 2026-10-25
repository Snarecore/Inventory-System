import React, { useState, useMemo } from "react";
import { FiChevronDown } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
  TablePaginationFooter,
  TableActionButtons,
} from "@/components/common";
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
  onToggleStatus?: (party: PartyItem) => void;
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
  onRefresh: _onRefresh,
  onToggleStatus,
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

  const renderSortHeader = (label: string, activeKey: "name" | "amount") => {
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
      headerNode: renderSortHeader("Names", "name"),
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
          {renderSortHeader("Opening Balance", "amount")}
        </div>
      ),
      align: "text-right",
      width: "w-[14.285%]",
    },
    { key: "status", label: "Status", align: "text-right", width: "w-[14.285%]" },
    { key: "action", label: "Actions", align: "text-right", width: "w-[14.285%]" },
  ];

  const availableColumns: ColumnItem[] = tableHeaders.map((h) => ({ key: h.key, label: h.label }));

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

  const getPartyName = (p: PartyItem) => p.name || "Unnamed Party";
  const getPartyType = (p: PartyItem): "CUSTOMER" | "SUPPLIER" => {
    const raw = String(p.type || "CUSTOMER").toUpperCase();
    return raw.includes("SUPPLIER") ? "SUPPLIER" : "CUSTOMER";
  };
  const getPartyPhone = (p: PartyItem) => p.phone || "—";
  const getPartyEmail = (p: PartyItem) => p.email || "—";
  const getPartyAddress = (p: PartyItem) => {
    const addr = (p.address || "").trim();
    return addr || "N/A";
  };
  const getPartyBalance = (p: PartyItem) =>
    Number(p.openingBalance ?? p.balance ?? 0);
  const isPartyActive = (p: PartyItem) => {
    const raw = String(p.status ?? "active").toLowerCase();
    return raw !== "inactive" && raw !== "false" && raw !== "0";
  };

  return (
    <TableContainer>
      {/* Table Header: Search (Left) & Controls/Filters (Right) */}
      <TableToolbar>
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
      </TableToolbar>

      {/* Loading Skeleton */}
      {isLoading && parties.length === 0 ? (
        <div className="p-4">
          <TableSkeleton columnCount={activeVisibleColumnCount} />
        </div>
      ) : (
        <>
          {/* Table */}
          <TableScroll>
            <Table className="table-fixed min-w-[750px]">
              <TableHead>
                {tableHeaders.filter((h) => isColVisible(h.key)).map(({ key, label, headerNode, align, width }) => (
                  <TableTh
                    key={key}
                    className={`${align} ${width || ""}`}
                  >
                    {headerNode || label}
                  </TableTh>
                ))}
              </TableHead>

              <TableBody>
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
                    const partyId = String(party.id ?? party.partyId ?? index);

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
                            {onToggleStatus ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleStatus(party);
                                }}
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer hover:opacity-80 transition-all ${
                                  active
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                                    : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200"
                                }`}
                                title="Click to toggle status"
                              >
                                {active ? "Active" : "Inactive"}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  active
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}
                              >
                                {active ? "Active" : "Inactive"}
                              </span>
                            )}
                          </td>
                        )}

                        {/* Actions: Eye, Edit */}
                        {isColVisible("action") && (
                          <td className="py-2 px-3 text-right">
                            <TableActionButtons
                              onView={() => onView(party)}
                              viewTitle="Quick View Details"
                              onEdit={() => onEdit(party)}
                              editTitle="Edit Party"
                              className="justify-end"
                            />
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
              </TableBody>
            </Table>
          </TableScroll>

          {/* Pagination Footer */}
          {!isLoading && parties.length > 0 && (
            <TablePaginationFooter
              totalCount={totalCount}
              pageCount={pageCount}
              currentPageNumber={currentPageNumber}
              dataLimit={dataLimit}
              setDataLimit={setDataLimit}
              setCurrentPageNumber={setCurrentPageNumber}
              handlePagination={handlePagination}
              entityLabel="parties"
            />
          )}
        </>
      )}
    </TableContainer>
  );
};

export default PartyTable;
